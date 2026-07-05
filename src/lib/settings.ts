// Server-Konfiguration: data/settings.json (im Admin-Backend editierbar).
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const DATA_DIR = join(process.cwd(), "data");
const SETTINGS_FILE = join(DATA_DIR, "settings.json");

export interface ShopConfig {
  id: string;          // z.B. "amazon"
  name: string;        // Anzeigename
  enabled: boolean;
  domain: string;      // z.B. "www.amazon.de"
  tag: string;         // Affiliate-Tag / Partner-ID
  searchUrl: string;   // Template, {q} = Suchbegriff, {tag} = Tag
  productUrl: string;  // Template, {id} = Produkt-ID (ASIN o.ä.), {tag} = Tag
  imageUrl?: string;   // Template, {id} = Produkt-ID → Produktbild
}

export interface Settings {
  llm: {
    provider: "azure" | "google";
    model: string; // Azure: Deployment-Name, Google: Modell-ID
  };
  shops: ShopConfig[];
}

export const DEFAULT_SETTINGS: Settings = {
  llm: { provider: "azure", model: "gpt-4o" },
  shops: [
    {
      id: "amazon",
      name: "Amazon",
      enabled: true,
      domain: "www.amazon.de",
      tag: "smarteshome-21",
      searchUrl: "https://www.amazon.de/s?k={q}&tag={tag}",
      productUrl: "https://www.amazon.de/dp/{id}?tag={tag}",
      imageUrl: "https://images-eu.ssl-images-amazon.com/images/P/{id}.03._SL500_.jpg",
    },
  ],
};

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await readFile(SETTINGS_FILE, "utf8");
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(s: Settings): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(SETTINGS_FILE, JSON.stringify(s, null, 2), "utf8");
}
