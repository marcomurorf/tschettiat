"use client";

import { useEffect, useState } from "react";
import {
  addToBasket,
  isInBasket,
  readBaskets,
  onBasketChange,
} from "@/lib/basket";
import { trackClick } from "@/lib/click";

export interface ProductOffer {
  shop: string;
  url: string;
  image?: string;
  price?: string; // konkreter Preis aus einem Produkt-Feed, z.B. "49,99 EUR"
  priceValue?: number; // numerischer Preis zum Sortieren
  productName?: string; // exakter Produktname beim Shop (Feed-Treffer)
}

export interface Product {
  name: string;
  brand?: string;
  priceHint?: string;
  pros: string[];
  cons?: string[];
  bestFor: string;
  badge?: string;
  reason?: string;
  reviewSummary?: string;
  category?: string;
  rating?: number;
  ratingsTotal?: number;
  offers: ProductOffer[];
}

// Badge-Farben je Empfehlungstyp.
function badgeStyle(badge: string): string {
  if (/preis-leistung/i.test(badge)) return "bg-emerald-600 text-white";
  if (/preis-tipp/i.test(badge)) return "bg-sky-600 text-white";
  if (/premium/i.test(badge)) return "bg-ink text-cream";
  if (/favorit/i.test(badge)) return "bg-accent text-white";
  return "bg-amber-500 text-white";
}

// Kategorie-Emoji für den Platzhalter, wenn kein Produktbild verfügbar ist.
function placeholderEmoji(category?: string): string {
  const c = (category ?? "").toLowerCase();
  if (/zelt|camping|outdoor/.test(c)) return "⛺";
  if (/schlaf/.test(c)) return "🛌";
  if (/koch|küche|grill/.test(c)) return "🍳";
  if (/licht|lampe/.test(c)) return "🔦";
  if (/technik|elektro/.test(c)) return "🔌";
  return "📦";
}

// Angebote sortieren: günstigster echter Preis zuerst, Angebote ohne Preis
// (reine Such-Links) ans Ende.
function sortOffers(offers: ProductOffer[]): ProductOffer[] {
  return [...offers].sort((a, b) => {
    const pa = a.priceValue ?? Infinity;
    const pb = b.priceValue ?? Infinity;
    return pa - pb;
  });
}

export function ProductCard({
  product,
  variant = "carousel",
}: {
  product: Product;
  /** carousel: feste Breite fürs horizontale Scrollen · stack: volle Breite (Desktop-Panel) */
  variant?: "carousel" | "stack";
}) {
  const offers = sortOffers(product.offers);
  const bestOffer = offers[0];
  const moreOffers = offers.slice(1);
  const image = offers.find((o) => o.image)?.image;
  const [imgFailed, setImgFailed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [picking, setPicking] = useState(false);
  const [showOffers, setShowOffers] = useState(false);
  const [newName, setNewName] = useState("");
  const [basketNames, setBasketNames] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => {
      setSaved(isInBasket(product.name));
      setBasketNames(readBaskets().map((b) => b.name));
    };
    sync();
    return onBasketChange(sync);
  }, [product.name]);

  const add = (basketName: string) => {
    setPicking(false);
    void addToBasket(basketName, {
      name: product.name,
      brand: product.brand,
      priceHint: product.priceHint,
      category: product.category,
      url: bestOffer?.url ?? "#",
      image: showImage ? image : undefined,
    });
  };

  const showImage = image && !imgFailed;

  return (
    <div
      className={`bg-card rounded-2xl border border-cream-dark shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col ${
        variant === "stack"
          ? "w-full"
          : "w-[78vw] max-w-[17rem] sm:w-64 shrink-0 snap-start"
      }`}
    >
      <div className="h-40 bg-white flex items-center justify-center p-4 relative">
        {product.badge && (
          <span
            className={`absolute top-2 left-2 max-w-[calc(100%-1rem)] truncate text-[10px] uppercase tracking-wide font-semibold rounded-full px-2 py-0.5 shadow-sm ${badgeStyle(product.badge)}`}
          >
            {product.badge}
          </span>
        )}
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={product.name}
            className="max-h-full max-w-full object-contain"
            loading="lazy"
            onLoad={(e) => {
              // Amazon liefert für ungültige ASINs ein 1x1-Platzhalter-GIF.
              if (e.currentTarget.naturalWidth <= 1) setImgFailed(true);
            }}
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span className="text-5xl opacity-60" aria-hidden>
            {placeholderEmoji(product.category)}
          </span>
        )}
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        {(product.category || product.brand) && (
          <div className="text-xs uppercase tracking-wide flex items-center gap-1.5 flex-wrap min-w-0">
            {product.category && (
              <span className="text-accent-dark font-semibold">
                {product.category}
              </span>
            )}
            {product.category && product.brand && (
              <span className="text-ink-soft/40" aria-hidden>
                ·
              </span>
            )}
            {product.brand && (
              <span className="text-ink-soft">{product.brand}</span>
            )}
          </div>
        )}
        <h3 className="font-semibold leading-snug">{product.name}</h3>
        {product.priceHint && (
          <div className="text-accent font-semibold text-sm">
            {product.priceHint}
          </div>
        )}
        {typeof product.rating === "number" && (
          <div className="text-xs text-ink-soft flex items-center gap-1">
            <span className="text-amber-500">
              {"★".repeat(Math.round(product.rating))}
              {"☆".repeat(5 - Math.round(product.rating))}
            </span>
            <span>
              {product.rating.toLocaleString("de-AT")}
              {product.ratingsTotal
                ? ` (${product.ratingsTotal.toLocaleString("de-AT")})`
                : ""}
            </span>
          </div>
        )}
        <ul className="text-sm text-ink-soft space-y-1">
          {product.pros.map((p, i) => (
            <li key={i} className="flex gap-1.5">
              <span className="text-emerald-600">✓</span>
              <span>{p}</span>
            </li>
          ))}
          {product.cons?.map((c, i) => (
            <li key={`c-${i}`} className="flex gap-1.5">
              <span className="text-accent">–</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-ink-soft italic">{product.bestFor}</p>
        {product.reason && (
          <div className="text-xs bg-accent-soft/60 border border-accent/15 rounded-lg px-2.5 py-2 leading-relaxed">
            <span className="font-semibold">Warum Tschetti das empfiehlt:</span>{" "}
            {product.reason}
          </div>
        )}
        {product.reviewSummary && (
          <div className="text-xs text-ink-soft leading-relaxed">
            <span className="font-semibold">💬 Nutzer-Stimmen:</span>{" "}
            {product.reviewSummary}
          </div>
        )}
        <div className="mt-auto pt-2 flex flex-col gap-1.5">
          {bestOffer && (
            <a
              href={bestOffer.url}
              target="_blank"
              rel="nofollow sponsored noopener"
              onClick={trackClick}
              title={bestOffer.productName}
              className="flex items-center justify-center gap-1.5 bg-accent hover:bg-accent-dark text-white text-sm font-medium rounded-lg py-2 px-3 transition-colors"
            >
              <span className="truncate">Bei {bestOffer.shop}</span>
              {bestOffer.price && (
                <span className="font-semibold whitespace-nowrap">
                  {bestOffer.price}
                </span>
              )}
              <span aria-hidden>*</span>
            </a>
          )}
          {moreOffers.length > 0 && (
            <div className="border border-cream-dark rounded-lg overflow-hidden">
              <button
                onClick={() => setShowOffers((v) => !v)}
                className="w-full flex items-center justify-between text-xs text-ink-soft hover:text-accent px-3 py-1.5 transition-colors"
              >
                <span>
                  {moreOffers.length} weitere{" "}
                  {moreOffers.length === 1 ? "Shop" : "Shops"}
                </span>
                <span
                  className={`transition-transform ${showOffers ? "rotate-180" : ""}`}
                  aria-hidden
                >
                  ▾
                </span>
              </button>
              {showOffers && (
                <div className="border-t border-cream-dark divide-y divide-cream-dark">
                  {moreOffers.map((o, i) => (
                    <a
                      key={`${o.shop}-${i}`}
                      href={o.url}
                      target="_blank"
                      rel="nofollow sponsored noopener"
                      onClick={trackClick}
                      title={o.productName}
                      className="flex items-center justify-between gap-2 text-xs px-3 py-2 hover:bg-cream transition-colors"
                    >
                      <span className="truncate">{o.shop}</span>
                      <span className="whitespace-nowrap text-ink-soft">
                        {o.price ?? "Preis im Shop"}*
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
          {!picking ? (
            <button
              onClick={() => {
                if (saved) return;
                if (basketNames.length === 0) add("Mein Korb");
                else setPicking(true);
              }}
              disabled={saved}
              className="block text-center border border-cream-dark hover:border-accent hover:text-accent disabled:opacity-60 disabled:hover:border-cream-dark disabled:hover:text-inherit text-sm font-medium rounded-lg py-1.5 transition-colors"
            >
              {saved ? "✓ Im Sammelkorb" : "🧺 In den Sammelkorb"}
            </button>
          ) : (
            <div className="border border-cream-dark rounded-lg p-2 space-y-1.5">
              <div className="text-xs font-semibold text-ink-soft">
                In welchen Korb?
              </div>
              {basketNames.map((n) => (
                <button
                  key={n}
                  onClick={() => add(n)}
                  className="block w-full text-left text-xs bg-cream hover:bg-accent-soft rounded-md px-2 py-1.5 transition-colors"
                >
                  🧺 {n}
                </button>
              ))}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newName.trim()) add(newName.trim());
                }}
                className="flex gap-1"
              >
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Neuer Korb …"
                  className="flex-1 min-w-0 text-xs border border-cream-dark rounded-md px-2 py-1.5 bg-white"
                />
                <button
                  type="submit"
                  className="text-xs bg-accent hover:bg-accent-dark text-white rounded-md px-2 transition-colors"
                >
                  +
                </button>
              </form>
              <button
                onClick={() => setPicking(false)}
                className="block w-full text-center text-[11px] text-ink-soft hover:text-ink"
              >
                Abbrechen
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProductCardRow({ products }: { products: Product[] }) {
  return (
    <div>
      <div className="flex gap-3 overflow-x-auto pb-2 chat-scroll snap-x snap-mandatory scroll-px-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {products.map((p, i) => (
          <ProductCard key={i} product={p} />
        ))}
      </div>
      <p className="text-[11px] text-ink-soft mt-1">
        * Affiliate-Links: Bei einem Kauf erhalten wir eine Provision – der
        Preis ändert sich für dich nicht.
      </p>
    </div>
  );
}

/** Vertikal gestapelte Karten fürs Desktop-Empfehlungspanel. */
export function ProductCardStack({ products }: { products: Product[] }) {
  return (
    <div className="space-y-3">
      {products.map((p, i) => (
        <ProductCard key={i} product={p} variant="stack" />
      ))}
    </div>
  );
}
