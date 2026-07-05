// Affiliate-Link-Erzeugung aus den konfigurierten Shops.
import type { ShopConfig } from "./settings";

const fill = (tpl: string, vars: Record<string, string>) =>
  tpl.replace(/\{(\w+)\}/g, (_, k) => encodeURIComponent(vars[k] ?? ""));

export function searchLink(shop: ShopConfig, query: string): string {
  return fill(shop.searchUrl, { q: query, tag: shop.tag });
}

export function productLink(shop: ShopConfig, id: string): string {
  return fill(shop.productUrl, { id, tag: shop.tag });
}

export function productImage(shop: ShopConfig, id: string): string | undefined {
  return shop.imageUrl ? fill(shop.imageUrl, { id }) : undefined;
}
