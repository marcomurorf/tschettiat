"use client";

// Sammelkorb-Panel: schwebender Button rechts unten + ausklappbare Liste.
import { useEffect, useState } from "react";
import {
  readBasket,
  removeFromBasket,
  clearBasket,
  onBasketChange,
  type BasketItem,
} from "@/lib/basket";

export function Basket() {
  const [items, setItems] = useState<BasketItem[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setItems(readBasket());
    return onBasketChange(() => setItems(readBasket()));
  }, []);

  if (items.length === 0 && !open) return null;

  return (
    <>
      {/* Schwebender Button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-20 right-4 z-40 bg-ink text-cream rounded-full shadow-lg px-4 py-2.5 text-sm font-medium flex items-center gap-2 hover:bg-ink/85 transition-colors"
        aria-label="Sammelkorb öffnen"
      >
        🧺 Sammelkorb
        <span className="bg-accent text-white rounded-full text-xs w-5 h-5 grid place-items-center">
          {items.length}
        </span>
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-32 right-4 z-40 w-80 max-h-[60vh] bg-card border border-cream-dark rounded-2xl shadow-xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-cream-dark">
            <span className="font-semibold text-sm">
              🧺 Dein Sammelkorb ({items.length})
            </span>
            <button
              onClick={() => setOpen(false)}
              className="text-ink-soft hover:text-ink"
              aria-label="Schließen"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto chat-scroll p-3 space-y-2">
            {items.length === 0 && (
              <p className="text-xs text-ink-soft text-center py-4">
                Noch nichts gesammelt.
              </p>
            )}
            {items.map((item) => (
              <div
                key={item.key}
                className="flex items-center gap-2 bg-cream rounded-lg p-2"
              >
                {item.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.image}
                    alt=""
                    className="w-10 h-10 object-contain bg-white rounded"
                    loading="lazy"
                  />
                )}
                <div className="flex-1 min-w-0">
                  {item.category && (
                    <div className="text-[10px] uppercase tracking-wide text-accent font-semibold">
                      {item.category}
                    </div>
                  )}
                  <div className="text-xs font-medium truncate">{item.name}</div>
                  {item.priceHint && (
                    <div className="text-[11px] text-ink-soft">
                      {item.priceHint}
                    </div>
                  )}
                </div>
                <a
                  href={item.url}
                  target="_blank"
                  rel="nofollow sponsored noopener"
                  className="text-xs bg-accent hover:bg-accent-dark text-white rounded-md px-2 py-1 shrink-0 transition-colors"
                >
                  Kaufen*
                </a>
                <button
                  onClick={() => removeFromBasket(item.key)}
                  className="text-ink-soft hover:text-accent px-1"
                  aria-label="Entfernen"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          {items.length > 0 && (
            <div className="border-t border-cream-dark p-3 flex items-center justify-between">
              <button
                onClick={clearBasket}
                className="text-xs text-ink-soft hover:text-accent underline"
              >
                Alles leeren
              </button>
              <span className="text-[10px] text-ink-soft">
                * Affiliate-Links
              </span>
            </div>
          )}
        </div>
      )}
    </>
  );
}
