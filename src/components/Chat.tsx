"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import type { UIMessage, FileUIPart } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ProductCardRow, type Product } from "./ProductCard";

const SUGGESTIONS = [
  "Ich suche einen leisen Staubsauger unter 200 €",
  "Such mir alles für ein Campingwochenende mit 2-Mann-Zelt",
  "Geschenk für einen Hobbykoch, Budget 50 €",
  "Ich brauche ein Notebook für Uni und Netflix",
];

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

/** Markdown-Antworten des Assistenten hübsch rendern. */
function Markdown({ text }: { text: string }) {
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
              className="text-accent underline underline-offset-2 hover:text-accent-dark"
            >
              {children}
            </a>
          ),
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    sendMessage({
      text: t || "Was ist das für ein Produkt? Finde es oder etwas Ähnliches.",
      files,
    });
    setInput("");
    setImages([]);
    setImageError(null);
  };

  return (
    <div
      className="flex flex-col flex-1 max-w-3xl w-full mx-auto px-4"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        void addImages(Array.from(e.dataTransfer.files));
      }}
    >
      {/* Verlauf */}
      <div className="flex-1 overflow-y-auto chat-scroll py-6 space-y-5">
        {messages.length === 0 && (
          <div className="text-center mt-16">
            <div className="text-5xl mb-4">🛒</div>
            <h2 className="text-2xl font-semibold mb-2">
              Servus! Was suchst du?
            </h2>
            <p className="text-ink-soft mb-8">
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
                    return (
                      <div
                        key={i}
                        className="bg-card border border-cream-dark rounded-[var(--radius-bubble)] rounded-bl-md px-4 py-2.5 max-w-[85%]"
                      >
                        <Markdown text={part.text} />
                      </div>
                    );
                  }
                  if (part.type === "tool-showProducts") {
                    if (part.state === "output-available") {
                      const out = part.output as { products: Product[] };
                      return <ProductCardRow key={i} products={out.products} />;
                    }
                    if (part.state === "output-error") return null;
                    // Suche läuft noch: Skeleton-Karten anzeigen
                    return <ProductSearchSkeleton key={i} />;
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
        className="sticky bottom-0 pb-5 pt-2 bg-cream"
      >
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
            className="flex-1 resize-none bg-transparent outline-none placeholder:text-ink-soft/60 max-h-40"
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
  );
}
