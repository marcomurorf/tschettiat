// Sammelkorb: rein clientseitig in localStorage, synchronisiert über ein
// CustomEvent, damit Karten und Korb-Panel ohne Context auskommen.
"use client";

export interface BasketItem {
  key: string; // eindeutig: Name normalisiert
  name: string;
  brand?: string;
  priceHint?: string;
  category?: string;
  url: string;
  image?: string;
}

const STORAGE_KEY = "tschetti-basket";
const EVENT = "tschetti-basket-changed";

export function readBasket(): BasketItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function write(items: BasketItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function itemKey(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-").slice(0, 80);
}

export function addToBasket(item: Omit<BasketItem, "key">) {
  const key = itemKey(item.name);
  const items = readBasket();
  if (items.some((i) => i.key === key)) return;
  write([...items, { ...item, key }]);
}

export function removeFromBasket(key: string) {
  write(readBasket().filter((i) => i.key !== key));
}

export function clearBasket() {
  write([]);
}

export function isInBasket(name: string): boolean {
  return readBasket().some((i) => i.key === itemKey(name));
}

export function onBasketChange(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}
