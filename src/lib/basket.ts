// Client für die serverseitigen Sammelkörbe (/api/baskets).
// Hält einen Modul-Cache und synchronisiert Komponenten per CustomEvent.
"use client";

export interface BasketItem {
  key: string;
  name: string;
  brand?: string;
  priceHint?: string;
  category?: string;
  url: string;
  image?: string;
}

export interface Basket {
  name: string;
  items: BasketItem[];
}

const EVENT = "tschetti-basket-changed";
let cache: Basket[] = [];
let loaded = false;

function notify() {
  window.dispatchEvent(new CustomEvent(EVENT));
}

function setCache(baskets: Basket[]) {
  cache = baskets;
  loaded = true;
  notify();
}

export function readBaskets(): Basket[] {
  return cache;
}

export async function refreshBaskets(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const r = await fetch("/api/baskets");
    if (r.ok) setCache(await r.json());
  } catch {
    // Offline o.ä. – Cache behalten
  }
}

export function itemKey(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-").slice(0, 80);
}

export async function addToBasket(
  basketName: string,
  item: Omit<BasketItem, "key">
): Promise<void> {
  const r = await fetch("/api/baskets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ basket: basketName, item }),
  });
  if (r.ok) setCache(await r.json());
}

export async function removeFromBasket(
  basketName: string,
  key: string
): Promise<void> {
  const r = await fetch("/api/baskets", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ basket: basketName, key }),
  });
  if (r.ok) setCache(await r.json());
}

export async function removeBasket(basketName: string): Promise<void> {
  const r = await fetch("/api/baskets", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ basket: basketName }),
  });
  if (r.ok) setCache(await r.json());
}

export function isInBasket(name: string): boolean {
  const key = itemKey(name);
  return cache.some((b) => b.items.some((i) => i.key === key));
}

export function onBasketChange(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  if (!loaded) void refreshBaskets();
  return () => window.removeEventListener(EVENT, cb);
}
