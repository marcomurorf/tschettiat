// Serverseitige Sammelkörbe in SQLite (Tabelle basket_items).
// Mehrere benannte Körbe pro User; der Chat-Agent kann sie per Tool lesen.
import { db, logEvent } from "./db";

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

export function itemKey(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-").slice(0, 80);
}

interface Row {
  basket_name: string;
  key: string;
  name: string;
  brand: string | null;
  price_hint: string | null;
  category: string | null;
  url: string;
  image: string | null;
}

export async function loadBaskets(userId: string): Promise<Basket[]> {
  const rows = db
    .prepare(
      `SELECT basket_name, key, name, brand, price_hint, category, url, image
       FROM basket_items WHERE user_id = ? ORDER BY created_at`
    )
    .all(userId) as Row[];
  const map = new Map<string, Basket>();
  for (const r of rows) {
    let basket = map.get(r.basket_name);
    if (!basket) {
      basket = { name: r.basket_name, items: [] };
      map.set(r.basket_name, basket);
    }
    basket.items.push({
      key: r.key,
      name: r.name,
      brand: r.brand ?? undefined,
      priceHint: r.price_hint ?? undefined,
      category: r.category ?? undefined,
      url: r.url,
      image: r.image ?? undefined,
    });
  }
  return [...map.values()];
}

export async function addItem(
  userId: string,
  basketName: string,
  item: Omit<BasketItem, "key">
): Promise<Basket[]> {
  const name = basketName.trim().slice(0, 40) || "Mein Korb";
  const key = itemKey(item.name);
  db.prepare(
    `INSERT OR IGNORE INTO basket_items
       (user_id, basket_name, key, name, brand, price_hint, category, url, image, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    userId,
    name,
    key,
    item.name,
    item.brand ?? null,
    item.priceHint ?? null,
    item.category ?? null,
    item.url,
    item.image ?? null,
    Date.now()
  );
  logEvent(userId, "basket_add", { basket: name, item: item.name });
  return loadBaskets(userId);
}

export async function removeItem(
  userId: string,
  basketName: string,
  key: string
): Promise<Basket[]> {
  db.prepare(
    "DELETE FROM basket_items WHERE user_id = ? AND basket_name = ? AND key = ?"
  ).run(userId, basketName, key);
  return loadBaskets(userId);
}

export async function removeBasket(
  userId: string,
  basketName: string
): Promise<Basket[]> {
  db.prepare(
    "DELETE FROM basket_items WHERE user_id = ? AND basket_name = ?"
  ).run(userId, basketName);
  return loadBaskets(userId);
}
