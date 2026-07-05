"use client";

export interface ProductOffer {
  shop: string;
  url: string;
  image?: string;
}

export interface Product {
  name: string;
  brand?: string;
  priceHint?: string;
  pros: string[];
  bestFor: string;
  offers: ProductOffer[];
}

// Bild ausblenden, wenn Amazon das 43-Byte-Platzhalter-GIF liefert (< 1 KB).
function hideIfPlaceholder(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  if (img.naturalWidth <= 1) img.closest("[data-img]")?.remove();
}

export function ProductCard({ product }: { product: Product }) {
  const image = product.offers.find((o) => o.image)?.image;

  return (
    <div className="bg-card rounded-2xl border border-cream-dark shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col w-64 shrink-0">
      {image && (
        <div
          data-img
          className="h-40 bg-white flex items-center justify-center p-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={product.name}
            className="max-h-full max-w-full object-contain"
            loading="lazy"
            onLoad={hideIfPlaceholder}
            onError={(e) => e.currentTarget.closest("[data-img]")?.remove()}
          />
        </div>
      )}
      <div className="p-4 flex flex-col gap-2 flex-1">
        {product.brand && (
          <div className="text-xs uppercase tracking-wide text-ink-soft">
            {product.brand}
          </div>
        )}
        <h3 className="font-semibold leading-snug">{product.name}</h3>
        {product.priceHint && (
          <div className="text-accent font-semibold text-sm">
            {product.priceHint}
          </div>
        )}
        <ul className="text-sm text-ink-soft space-y-1">
          {product.pros.map((p, i) => (
            <li key={i} className="flex gap-1.5">
              <span className="text-accent">✓</span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-ink-soft italic">{product.bestFor}</p>
        <div className="mt-auto pt-2 flex flex-col gap-1.5">
          {product.offers.map((o) => (
            <a
              key={o.shop}
              href={o.url}
              target="_blank"
              rel="nofollow sponsored noopener"
              className="block text-center bg-accent hover:bg-accent-dark text-white text-sm font-medium rounded-lg py-2 transition-colors"
            >
              Bei {o.shop} ansehen*
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProductCardRow({ products }: { products: Product[] }) {
  return (
    <div>
      <div className="flex gap-3 overflow-x-auto pb-2 chat-scroll">
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
