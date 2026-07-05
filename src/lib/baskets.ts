// Serverseitige Sammelkörbe: eine JSON-Datei pro User unter data/baskets/.
// Mehrere benannte Körbe pro User; der Chat-Agent kann sie per Tool lesen.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const ROOT = join(process.cwd(), "data", "baskets");

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

function safe(s: string): string {
  return s.replace(/[^a-zA-Z0-9@._-]/g, "_");
}

function file(userId: string) {
  return join(ROOT, `${safe(userId)}.json`);
}

export function itemKey(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-").slice(0, 80);
}

export async function loadBaskets(userId: string): Promise<Basket[]> {
  try {
    return JSON.parse(await readFile(file(userId), "utf8"));
  } catch {
    return [];
  }
}

async function save(userId: string, baskets: Basket[]) {
  await mkdir(ROOT, { recursive: true });
  await writeFile(file(userId), JSON.stringify(baskets), "utf8");
}

export async function addItem(
  userId: string,
  basketName: string,
  item: Omit<BasketItem, "key">
): Promise<Basket[]> {
  const name = basketName.trim().slice(0, 40) || "Mein Korb";
  const baskets = await loadBaskets(userId);
  let basket = baskets.find((b) => b.name === name);
  if (!basket) {
    basket = { name, items: [] };
    baskets.push(basket);
  }
  const key = itemKey(item.name);
  if (!basket.items.some((i) => i.key === key)) {
    basket.items.push({ ...item, key });
  }
  await save(userId, baskets);
  return baskets;
}

export async function removeItem(
  userId: string,
  basketName: string,
  key: string
): Promise<Basket[]> {
  const baskets = await loadBaskets(userId);
  const basket = baskets.find((b) => b.name === basketName);
  if (basket) {
    basket.items = basket.items.filter((i) => i.key !== key);
  }
  await save(userId, baskets);
  return baskets;
}

export async function removeBasket(
  userId: string,
  basketName: string
): Promise<Basket[]> {
  const baskets = (await loadBaskets(userId)).filter(
    (b) => b.name !== basketName
  );
  await save(userId, baskets);
  return baskets;
}
