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
  country?: string;    // ISO-Ländercode des Anbieters, z.B. "AT" oder "DE"
  network?: "direct" | "awin"; // Affiliate-Netzwerk; "awin" wrappt Links als Deeplink
  awinMid?: string;    // AWIN Advertiser-ID (Merchant-ID) des Shops
  description?: string; // Kurzbeschreibung des Sortiments – hilft dem LLM bei der Shop-Wahl
}

export interface CreditPackage {
  id: string;        // z.B. "s", "m", "l"
  name: string;      // Anzeigename, z.B. "Starter"
  tokens: number;    // gutgeschriebene Tokens
  priceCents: number; // Preis in Euro-Cent (Stripe)
}

export interface Settings {
  llm: {
    provider: "azure" | "google" | "openai";
    model: string; // Azure: Deployment-Name, Google/OpenAI: Modell-ID
    costPerMTokens?: number; // veraltet: Pauschalsatz €/1 Mio. Token (Fallback)
    costInPerMTokens?: number; // Kosten pro 1 Mio. Input-Token (für Admin-Statistik)
    costOutPerMTokens?: number; // Kosten pro 1 Mio. Output-Token
  };
  features?: {
    travel?: boolean; // Reiseplanung (Flüge & Hotels) im Chat aktivieren
  };
  awinPublisherId?: string; // eigene AWIN Publisher-ID (awinaffid) für Deeplinks
  awinApiToken?: string; // OAuth-Token für api.awin.com (Programme, Transaktionen)
  awinFeedApiKey?: string; // separater Key für Produkt-Feeds (AWIN: Toolbox → Create-a-Feed)
  limits: {
    tokensPerDay: number; // Tokenbudget pro User und Tag
    clickBonusTokens: number; // Extra-Token je Klick auf einen Partnerlink
    clickBonusMaxPerDay: number; // max. belohnte Klicks pro Tag
    unlimitedUsers?: string[]; // E-Mail-Adressen ohne Tageslimit
    referralBonusTokens?: number; // Credits für den Werber je neu registriertem User
  };
  creditPackages?: CreditPackage[]; // kaufbare Token-Pakete (Stripe)
  shops: ShopConfig[];
}

export const DEFAULT_SETTINGS: Settings = {
  llm: {
    provider: "azure",
    model: "gpt-4o",
    costInPerMTokens: 2.5, // gpt-4o: $2,50 / 1 Mio. Input-Token
    costOutPerMTokens: 10, // gpt-4o: $10 / 1 Mio. Output-Token
  },
  awinPublisherId: "363087",
  features: {
    travel: false, // zuerst nur Produktsuche; im Admin aktivierbar
  },
  limits: {
    tokensPerDay: 60000,
    clickBonusTokens: 5000,
    clickBonusMaxPerDay: 6,
    referralBonusTokens: 100000,
  },
  creditPackages: [
    { id: "s", name: "Starter", tokens: 250_000, priceCents: 299 },
    { id: "m", name: "Standard", tokens: 1_000_000, priceCents: 799 },
    { id: "l", name: "Power", tokens: 3_000_000, priceCents: 1999 },
  ],
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
      country: "DE",
      network: "direct",
      description: "Vollsortiment, liefert nach Österreich",
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
