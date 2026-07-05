"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import type { UIMessage } from "ai";
import { ProductCardRow, type Product } from "./ProductCard";

const SUGGESTIONS = [
  "Ich suche einen leisen Staubsauger unter 200 €",
  "Such mir alles für ein Campingwochenende mit 2-Mann-Zelt",
  "Geschenk für einen Hobbykoch, Budget 50 €",
  "Ich brauche ein Notebook für Uni und Netflix",
];

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
  const bottomRef = useRef<HTMLDivElement>(null);
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const submit = (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    sendMessage({ text: t });
    setInput("");
  };

  return (
    <div className="flex flex-col flex-1 max-w-3xl w-full mx-auto px-4">
      {/* Verlauf */}
      <div className="flex-1 overflow-y-auto chat-scroll py-6 space-y-5">
        {messages.length === 0 && (
          <div className="text-center mt-16">
            <div className="text-5xl mb-4">🛒</div>
            <h2 className="text-2xl font-semibold mb-2">
              Servus! Was suchst du?
            </h2>
            <p className="text-ink-soft mb-8">
              Beschreib mir, was du brauchst – ich finde die passenden
              Produkte für dich.
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
                <div className="bg-ink text-cream rounded-[var(--radius-bubble)] rounded-br-md px-4 py-2.5 max-w-[85%] whitespace-pre-wrap">
                  {m.parts
                    .filter((p) => p.type === "text")
                    .map((p) => (p.type === "text" ? p.text : ""))
                    .join("")}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {m.parts.map((part, i) => {
                  if (part.type === "text" && part.text) {
                    return (
                      <div
                        key={i}
                        className="bg-card border border-cream-dark rounded-[var(--radius-bubble)] rounded-bl-md px-4 py-2.5 max-w-[85%] whitespace-pre-wrap"
                      >
                        {part.text}
                      </div>
                    );
                  }
                  if (
                    part.type === "tool-showProducts" &&
                    part.state === "output-available"
                  ) {
                    const out = part.output as { products: Product[] };
                    return <ProductCardRow key={i} products={out.products} />;
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
        <div className="flex items-end gap-2 bg-card border border-cream-dark rounded-2xl shadow-sm px-4 py-2.5 focus-within:border-accent transition-colors">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(input);
              }
            }}
            rows={1}
            placeholder="Was suchst du? z. B. „Kopfhörer fürs Pendeln, max. 150 €“"
            className="flex-1 resize-none bg-transparent outline-none placeholder:text-ink-soft/60 max-h-40"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
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
