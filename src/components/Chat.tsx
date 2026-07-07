"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import type { UIMessage, FileUIPart } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ProductCardRow,
  ProductCardStack,
  bestOfferUrl,
  type Product,
} from "./ProductCard";
import { trackClick } from "@/lib/click";

const SUGGESTIONS = [
  "Ich suche einen leisen Staubsauger unter 200 €",
  "Such mir alles für ein Campingwochenende mit 2-Mann-Zelt",
  "Geschenk für einen Hobbykoch, Budget 50 €",
  "Ich brauche ein Notebook für Uni und Netflix",
];

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

/** Sucht zu einem Textausschnitt (z. B. fettem Produktnamen) das passende Produkt.
 *  Tokenbasiert, damit auch umgestellte Namen matchen
 *  ("Kijaro Dual Lock Campingstuhl" ↔ "Campingstuhl Kijaro Dual Lock"). */
function matchProduct(
  text: string,
  products: Product[]
): Product | undefined {
  const tokenize = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter((w) => w.length > 1)
    );
  const t = tokenize(text);
  if (t.size === 0) return undefined;
  return products.find((p) => {
    const n = tokenize(p.name);
    if (n.size === 0) return false;
    const [small, big] = t.size <= n.size ? [t, n] : [n, t];
    let hits = 0;
    for (const w of small) if (big.has(w)) hits++;
    return hits / small.size >= 0.8;
  });
}

/** Kindknoten von React-Markdown zu reinem Text zusammenfassen. */
function childrenToText(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(childrenToText).join("");
  return "";
}

/** Markdown-Antworten des Assistenten hübsch rendern.
 *  Fett hervorgehobene Produktnamen werden automatisch mit dem
 *  besten Shop-Angebot verlinkt. */
function Markdown({
  text,
  products = [],
}: {
  text: string;
  products?: Product[];
}) {
  return (
    <div className="chat-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="nofollow sponsored noopener"
              onClick={trackClick}
              className="text-accent underline underline-offset-2 hover:text-accent-dark"
            >
              {children}
            </a>
          ),
          strong: ({ children }) => {
            const product = matchProduct(childrenToText(children), products);
            const url = product ? bestOfferUrl(product) : undefined;
            if (url) {
              return (
                <a
                  href={url}
                  target="_blank"
                  rel="nofollow sponsored noopener"
                  onClick={trackClick}
                  title={`${product!.name} im Shop öffnen*`}
                  className="font-semibold text-accent underline underline-offset-2 decoration-accent/40 hover:text-accent-dark hover:decoration-accent transition-colors"
                >
                  {children}
                </a>
              );
            }
            return <strong>{children}</strong>;
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

/** Platzhalter-Karten, während die Produktsuche im Hintergrund läuft. */
function ProductSearchSkeleton() {
  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-ink-soft mb-2 px-1">
        <svg
          className="animate-spin"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        >
          <path d="M21 12a9 9 0 1 1-6.2-8.56" />
        </svg>
        Suche passende Produkte&nbsp;…
      </div>
      <div className="flex gap-3 overflow-x-hidden">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="animate-pulse bg-card border border-cream-dark rounded-2xl p-4 w-52 shrink-0 space-y-3"
            style={{ animationDelay: `${i * 150}ms` }}
          >
            <div className="bg-cream-dark/60 rounded-lg h-28 w-full" />
            <div className="bg-cream-dark/60 rounded h-3.5 w-4/5" />
            <div className="bg-cream-dark/60 rounded h-3 w-3/5" />
            <div className="bg-cream-dark/60 rounded h-3 w-2/5" />
          </div>
        ))}
      </div>
    </div>
  );
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function Chat({
  chatId,
  initialMessages,
  onChatUpdated,
}: {
  chatId: string;
  initialMessages?: UIMessage[];
  onChatUpdated?: () => void;
}) {
  const { messages, sendMessage, status, error } = useChat({
    id: chatId,
    messages: initialMessages,
    onFinish: () => onChatUpdated?.(),
  });
  const [input, setInput] = useState("");
  const [images, setImages] = useState<{ dataUrl: string; type: string }[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  // Nutzer-Präferenz: nur österreichische Shops anzeigen (lokal gespeichert).
  const [atOnly, setAtOnly] = useState(false);
  useEffect(() => {
    setAtOnly(localStorage.getItem("tschetti.atOnly") === "1");
  }, []);
  const toggleAtOnly = () => {
    setAtOnly((v) => {
      localStorage.setItem("tschetti.atOnly", v ? "0" : "1");
      return !v;
    });
  };
  const bottomRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Empfehlungen fürs Desktop-Panel einsammeln (mit Titel der Nutzer-Anfrage).
  const productGroups: { id: string; label: string; products: Product[] }[] =
    [];
  {
    let lastUserText = "";
    for (const m of messages) {
      if (m.role === "user") {
        lastUserText = m.parts
          .filter((p) => p.type === "text")
          .map((p) => (p.type === "text" ? p.text : ""))
          .join("")
          .trim();
        continue;
      }
      if (m.role !== "assistant") continue;
      m.parts.forEach((part, i) => {
        if (
          part.type === "tool-showProducts" &&
          part.state === "output-available"
        ) {
          const out = part.output as { products: Product[] };
          if (out?.products?.length) {
            productGroups.push({
              id: `${m.id}-${i}`,
              label: lastUserText,
              products: out.products,
            });
          }
        }
      });
    }
  }
  const totalProducts = productGroups.reduce(
    (n, g) => n + g.products.length,
    0
  );
  const searching = messages.some(
    (m) =>
      m.role === "assistant" &&
      m.parts.some(
        (p) =>
          p.type === "tool-showProducts" &&
          p.state !== "output-available" &&
          p.state !== "output-error"
      )
  );
  const showPanel = productGroups.length > 0 || searching;

  // Panel automatisch zur neuesten Empfehlung scrollen.
  useEffect(() => {
    panelRef.current?.scrollTo({
      top: panelRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [productGroups.length, searching]);

  const addImages = async (files: File[]) => {
    setImageError(null);
    for (const f of files) {
      if (!f.type.startsWith("image/")) continue;
      if (f.size > MAX_IMAGE_BYTES) {
        setImageError("Bild ist zu groß (max. 5 MB).");
        continue;
      }
      const dataUrl = await fileToDataUrl(f);
      setImages((prev) =>
        prev.length >= 3 ? prev : [...prev, { dataUrl, type: f.type }]
      );
    }
  };

  const submit = (text: string) => {
    const t = text.trim();
    if ((!t && images.length === 0) || busy) return;
    const files: FileUIPart[] = images.map((img) => ({
      type: "file",
      mediaType: img.type,
      url: img.dataUrl,
    }));
    sendMessage(
      {
        text: t || "Was ist das für ein Produkt? Finde es oder etwas Ähnliches.",
        files,
      },
      { body: { atOnly } }
    );
    setInput("");
    setImages([]);
    setImageError(null);
  };

  return (
    <div
      className="flex flex-1 min-h-0 w-full"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        void addImages(Array.from(e.dataTransfer.files));
      }}
    >
      {/* Chat-Spalte */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0 max-w-3xl mx-auto px-4">
      {/* Verlauf */}
      <div className="flex-1 overflow-y-auto chat-scroll py-4 sm:py-6 space-y-5 overscroll-contain">
        {messages.length === 0 && (
          <div className="text-center mt-8 sm:mt-16">
            <div className="text-5xl mb-4">🛒</div>
            <h2 className="text-2xl font-semibold mb-2">
              Servus! Was suchst du?
            </h2>
            <p className="text-ink-soft mb-6 sm:mb-8 px-2">
              Beschreib mir, was du brauchst – oder häng ein Foto an, ich finde
              die passenden Produkte für dich.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => submit(s)}
                  className="text-sm bg-card border border-cream-dark rounded-full px-4 py-2 hover:border-accent hover:text-accent transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id}>
            {m.role === "user" ? (
              <div className="flex justify-end">
                <div className="bg-ink text-cream rounded-[var(--radius-bubble)] rounded-br-md px-4 py-2.5 max-w-[85%] space-y-2">
                  {m.parts
                    .filter((p) => p.type === "file")
                    .map((p, i) =>
                      p.type === "file" &&
                      p.mediaType?.startsWith("image/") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={i}
                          src={p.url}
                          alt="Angehängtes Bild"
                          className="rounded-lg max-h-48 max-w-full"
                        />
                      ) : null
                    )}
                  <div className="whitespace-pre-wrap">
                    {m.parts
                      .filter((p) => p.type === "text")
                      .map((p) => (p.type === "text" ? p.text : ""))
                      .join("")}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {m.parts.map((part, i) => {
                  if (part.type === "text" && part.text) {
                    // Produkte dieser Nachricht, damit Produktnamen im
                    // Fließtext direkt zum Shop verlinken.
                    const msgProducts = m.parts.flatMap((p) =>
                      p.type === "tool-showProducts" &&
                      p.state === "output-available"
                        ? ((p.output as { products: Product[] })?.products ??
                          [])
                        : []
                    );
                    return (
                      <div
                        key={i}
                        className="bg-card border border-cream-dark rounded-[var(--radius-bubble)] rounded-bl-md px-4 py-2.5 max-w-[85%]"
                      >
                        <Markdown text={part.text} products={msgProducts} />
                      </div>
                    );
                  }
                  if (part.type === "tool-showProducts") {
                    if (part.state === "output-available") {
                      const out = part.output as { products: Product[] };
                      if (!out?.products?.length) return null;
                      return (
                        <div key={i}>
                          {/* Mobil: Karten-Karussell direkt im Verlauf */}
                          <div className="lg:hidden">
                            <ProductCardRow products={out.products} />
                          </div>
                          {/* Desktop: dezenter Verweis – Karten laufen im Panel rechts */}
                          <button
                            onClick={() =>
                              document
                                .getElementById(`reco-${m.id}-${i}`)
                                ?.scrollIntoView({
                                  behavior: "smooth",
                                  block: "start",
                                })
                            }
                            className="hidden lg:inline-flex items-center gap-2 text-sm bg-card border border-cream-dark rounded-full px-3.5 py-1.5 text-ink-soft hover:border-accent hover:text-accent transition-colors"
                          >
                            <span aria-hidden>🛒</span>
                            {out.products.length}{" "}
                            {out.products.length === 1
                              ? "Empfehlung"
                              : "Empfehlungen"}{" "}
                            im Panel
                            <span aria-hidden>→</span>
                          </button>
                        </div>
                      );
                    }
                    if (part.state === "output-error") return null;
                    // Suche läuft noch: mobil Skeleton, Desktop läuft im Panel
                    return (
                      <div key={i}>
                        <div className="lg:hidden">
                          <ProductSearchSkeleton />
                        </div>
                        <div className="hidden lg:flex items-center gap-2 text-sm text-ink-soft">
                          <svg
                            className="animate-spin"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                          >
                            <path d="M21 12a9 9 0 1 1-6.2-8.56" />
                          </svg>
                          Suche passende Produkte…
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            )}
          </div>
        ))}

        {busy && messages.at(-1)?.role === "user" && (
          <div className="flex gap-1.5 px-4 py-3">
            <span className="w-2 h-2 bg-ink-soft rounded-full animate-bounce [animation-delay:0ms]" />
            <span className="w-2 h-2 bg-ink-soft rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-2 h-2 bg-ink-soft rounded-full animate-bounce [animation-delay:300ms]" />
          </div>
        )}

        {error && (
          <div className="text-sm text-accent bg-accent-soft rounded-lg px-4 py-2">
            {error.message?.includes("Tageslimit")
              ? error.message
              : "Da ist etwas schiefgelaufen – bitte versuch es nochmal."}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Eingabe */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="sticky bottom-0 pt-2 bg-cream pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex justify-end mb-1.5 px-1">
          <button
            type="button"
            onClick={toggleAtOnly}
            aria-pressed={atOnly}
            title="Nur Angebote österreichischer Anbieter anzeigen"
            className={`text-xs rounded-full px-3 py-1 border transition-colors ${
              atOnly
                ? "bg-accent text-white border-accent"
                : "bg-card text-ink-soft border-cream-dark hover:border-accent hover:text-accent"
            }`}
          >
            🇦🇹 Nur österreichische Shops{atOnly ? " ✓" : ""}
          </button>
        </div>
        {imageError && (
          <p className="text-xs text-accent mb-1 px-1">{imageError}</p>
        )}
        {images.length > 0 && (
          <div className="flex gap-2 mb-2 px-1">
            {images.map((img, i) => (
              <div key={i} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.dataUrl}
                  alt="Vorschau"
                  className="h-16 w-16 object-cover rounded-lg border border-cream-dark"
                />
                <button
                  type="button"
                  onClick={() =>
                    setImages((prev) => prev.filter((_, j) => j !== i))
                  }
                  className="absolute -top-1.5 -right-1.5 bg-ink text-cream rounded-full w-5 h-5 text-xs grid place-items-center"
                  aria-label="Bild entfernen"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2 bg-card border border-cream-dark rounded-2xl shadow-sm px-4 py-2.5 focus-within:border-accent transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              void addImages(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className="text-ink-soft hover:text-accent transition-colors shrink-0 pb-1"
            aria-label="Bild anhängen"
            title="Bild anhängen"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(input);
              }
            }}
            onPaste={(e) => {
              const files = Array.from(e.clipboardData.files);
              if (files.length > 0) {
                e.preventDefault();
                void addImages(files);
              }
            }}
            rows={1}
            placeholder="Was suchst du? z. B. „Kopfhörer fürs Pendeln, max. 150 €“"
            className="flex-1 resize-none bg-transparent outline-none placeholder:text-ink-soft/60 max-h-40 text-base sm:text-sm"
          />
          <button
            type="submit"
            disabled={busy || (!input.trim() && images.length === 0)}
            className="bg-accent hover:bg-accent-dark disabled:opacity-40 text-white rounded-xl w-9 h-9 grid place-items-center transition-colors shrink-0"
            aria-label="Senden"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1l6 6-1.4 1.4L9 4.8V15H7V4.8L3.4 8.4 2 7l6-6z" />
            </svg>
          </button>
        </div>
      </form>
      </div>

      {/* Desktop-Empfehlungspanel: Karten laufen rechts mit, der Chat bleibt frei */}
      {showPanel && (
        <aside className="hidden lg:flex flex-col w-[21rem] xl:w-[23rem] shrink-0 border-l border-cream-dark bg-card/40 min-h-0">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-cream-dark shrink-0">
            <span aria-hidden>🛒</span>
            <span className="font-semibold text-sm">Empfehlungen</span>
            {totalProducts > 0 && (
              <span className="text-xs text-ink-soft">({totalProducts})</span>
            )}
          </div>
          <div
            ref={panelRef}
            className="flex-1 overflow-y-auto chat-scroll p-3 space-y-5 overscroll-contain"
          >
            {productGroups.map((g) => (
              <div key={g.id} id={`reco-${g.id}`} className="scroll-mt-3">
                {g.label && (
                  <div
                    className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft mb-2 px-1 truncate"
                    title={g.label}
                  >
                    {g.label}
                  </div>
                )}
                <ProductCardStack products={g.products} />
              </div>
            ))}
            {searching && (
              <div className="animate-pulse bg-card border border-cream-dark rounded-2xl p-4 space-y-3">
                <div className="bg-cream-dark/60 rounded-lg h-32 w-full" />
                <div className="bg-cream-dark/60 rounded h-3.5 w-4/5" />
                <div className="bg-cream-dark/60 rounded h-3 w-3/5" />
                <div className="bg-cream-dark/60 rounded h-3 w-2/5" />
              </div>
            )}
            {totalProducts > 0 && (
              <p className="text-[11px] text-ink-soft px-1">
                * Affiliate-Links: Bei einem Kauf erhalten wir eine Provision –
                der Preis ändert sich für dich nicht.
              </p>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
