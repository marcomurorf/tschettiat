"use client";

// Sammelkorb: Trigger-Button (in der Toolbar) + Panel.
// Mobil öffnet sich ein Bottom-Sheet, am Desktop ein Popover rechts oben.
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  readBaskets,
  refreshBaskets,
  removeFromBasket,
  removeBasket,
  onBasketChange,
  type Basket as BasketData,
} from "@/lib/basket";
import { trackClick } from "@/lib/click";

export function Basket() {
  const [baskets, setBaskets] = useState<BasketData[]>([]);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    void refreshBaskets();
    return onBasketChange(() => setBaskets([...readBaskets()]));
  }, []);

  // Bei offenem Sheet Hintergrund-Scroll verhindern (mobil wichtig).
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const total = baskets.reduce((n, b) => n + b.items.length, 0);

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={`relative flex items-center gap-1.5 text-sm rounded-full px-3 py-1.5 border transition-colors ${
          total > 0
            ? "bg-ink text-cream border-ink hover:bg-ink/85"
            : "bg-card text-ink-soft border-cream-dark hover:border-accent hover:text-accent"
        }`}
        aria-label="Sammelkorb öffnen"
      >
        <span aria-hidden>🧺</span>
        <span className="hidden sm:inline">Sammelkorb</span>
        {total > 0 && (
          <span className="bg-accent text-white rounded-full text-[11px] min-w-5 h-5 px-1 grid place-items-center font-semibold">
            {total}
          </span>
        )}
      </button>

      {/* Panel – per Portal, damit position:fixed sich am Viewport orientiert
          (Vorfahren mit backdrop-filter würden es sonst einfangen). */}
      {open &&
        mounted &&
        createPortal(
          <>
          <div
            className="fixed inset-0 bg-ink/30 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-label="Sammelkorb"
            className="fixed z-50 bg-card border border-cream-dark shadow-xl flex flex-col overflow-hidden
              inset-x-0 bottom-0 rounded-t-2xl max-h-[80dvh]
              sm:inset-x-auto sm:bottom-auto sm:top-20 sm:right-4 sm:w-96 sm:rounded-2xl sm:max-h-[70vh]"
          >
            {/* Grabber (nur mobil) */}
            <div className="sm:hidden pt-2 grid place-items-center">
              <div className="w-10 h-1 rounded-full bg-cream-dark" />
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-b border-cream-dark">
              <span className="font-semibold text-sm">
                🧺 Deine Sammelkörbe {total > 0 ? `(${total})` : ""}
              </span>
              <button
                onClick={() => setOpen(false)}
                className="text-ink-soft hover:text-ink p-1 -m-1"
                aria-label="Schließen"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto chat-scroll p-3 space-y-4 overscroll-contain">
              {baskets.length === 0 && (
                <div className="text-center py-10 px-4">
                  <div className="text-3xl mb-2" aria-hidden>
                    🧺
                  </div>
                  <p className="text-sm text-ink-soft">
                    Noch nichts gesammelt. Tippe bei einem Produkt auf „In den
                    Sammelkorb“, um es dir zu merken.
                  </p>
                </div>
              )}
              {baskets.map((basket) => (
                <div key={basket.name} className="space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-accent">
                      {basket.name} ({basket.items.length})
                    </span>
                    <button
                      onClick={() => void removeBasket(basket.name)}
                      className="text-[11px] text-ink-soft hover:text-accent underline"
                    >
                      Korb löschen
                    </button>
                  </div>
                  {basket.items.map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center gap-2.5 bg-cream rounded-xl p-2.5"
                    >
                      {item.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image}
                          alt=""
                          className="w-12 h-12 object-contain bg-white rounded-lg shrink-0"
                          loading="lazy"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        {item.category && (
                          <div className="text-[10px] uppercase tracking-wide text-accent font-semibold">
                            {item.category}
                          </div>
                        )}
                        <div className="text-sm font-medium truncate">
                          {item.name}
                        </div>
                        {item.priceHint && (
                          <div className="text-xs text-ink-soft">
                            {item.priceHint}
                          </div>
                        )}
                      </div>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="nofollow sponsored noopener"
                        onClick={trackClick}
                        className="text-xs bg-accent hover:bg-accent-dark text-white rounded-lg px-2.5 py-1.5 shrink-0 transition-colors"
                      >
                        Kaufen*
                      </a>
                      <button
                        onClick={() =>
                          void removeFromBasket(basket.name, item.key)
                        }
                        className="text-ink-soft hover:text-accent p-1.5 -m-1"
                        aria-label="Entfernen"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="border-t border-cream-dark px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] text-right">
              <span className="text-[10px] text-ink-soft">
                * Affiliate-Links
              </span>
            </div>
          </div>
          </>,
          document.body,
        )}
    </>
  );
}
