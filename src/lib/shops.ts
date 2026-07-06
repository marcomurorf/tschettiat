// Affiliate-Link-Erzeugung aus den konfigurierten Shops.
import type { ShopConfig } from "./settings";

const fill = (tpl: string, vars: Record<string, string>) =>
  tpl.replace(/\{(\w+)\}/g, (_, k) => encodeURIComponent(vars[k] ?? ""));

// AWIN-Shops: Ziel-URL als vergüteten Deeplink über awin1.com wrappen.
function wrapAwin(shop: ShopConfig, url: string, publisherId?: string): string {
  if (shop.network !== "awin" || !shop.awinMid || !publisherId) return url;
  return `https://www.awin1.com/cread.php?awinmid=${encodeURIComponent(
    shop.awinMid
  )}&awinaffid=${encodeURIComponent(publisherId)}&ued=${encodeURIComponent(url)}`;
}

export function searchLink(
  shop: ShopConfig,
  query: string,
  awinPublisherId?: string
): string {
  return wrapAwin(shop, fill(shop.searchUrl, { q: query, tag: shop.tag }), awinPublisherId);
}

export function productLink(
  shop: ShopConfig,
  id: string,
  awinPublisherId?: string
): string {
  return wrapAwin(shop, fill(shop.productUrl, { id, tag: shop.tag }), awinPublisherId);
}

export function productImage(shop: ShopConfig, id: string): string | undefined {
  return shop.imageUrl ? fill(shop.imageUrl, { id }) : undefined;
}
