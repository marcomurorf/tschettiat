// AWIN-Integration: Management-API (Programme) + Produkt-Feeds (Datafeed-API).
// - Management-API (api.awin.com): OAuth-Token, liefert Partnerprogramme.
// - Datafeed-API (productdata.awin.com): separater "Download-API-Key" aus der
//   AWIN-Toolbox (Toolbox → Create-a-Feed), liefert CSV-Produktfeeds.
// Produkte werden in SQLite (awin_products + FTS5) indexiert und lokal durchsucht.
import { Readable } from "node:stream";
import { createGunzip } from "node:zlib";
import { parse } from "csv-parse";
import { db } from "./db";
import { loadSettings } from "./settings";

const API_BASE = "https://api.awin.com";
const FEED_BASE = "https://productdata.awin.com";

function apiToken(): string {
  const t = process.env.AWIN_API_TOKEN;
  if (!t) throw new Error("AWIN_API_TOKEN fehlt in der Umgebung");
  return t;
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${apiToken()}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`AWIN API ${path}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

// ---------- Management-API: Partnerprogramme ----------

export interface AwinProgramme {
  id: number;
  name: string;
  displayUrl?: string;
  primaryRegion?: { name: string; countryCode: string };
  currencyCode?: string;
}

export async function listProgrammes(
  publisherId: string,
  relationship: "joined" | "pending" | "suspended"
): Promise<AwinProgramme[]> {
  return apiGet<AwinProgramme[]>(
    `/publishers/${encodeURIComponent(publisherId)}/programmes?relationship=${relationship}`
  );
}

/** Bestätigte Programme in die Merchant-Tabelle übernehmen. */
export async function syncMerchants(): Promise<AwinProgramme[]> {
  const settings = await loadSettings();
  const pubId = settings.awinPublisherId;
  if (!pubId) throw new Error("AWIN Publisher-ID fehlt in den Einstellungen");
  const joined = await listProgrammes(pubId, "joined");
  const upsert = db.prepare(
    `INSERT INTO awin_merchants (mid, name, region, domain, synced_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(mid) DO UPDATE SET
       name = excluded.name, region = excluded.region,
       domain = excluded.domain, synced_at = excluded.synced_at`
  );
  for (const p of joined) {
    upsert.run(
      String(p.id),
      p.name,
      p.primaryRegion?.countryCode ?? null,
      p.displayUrl ?? null,
      Date.now()
    );
  }
  return joined;
}

// ---------- Datafeed-API: Produkt-Feeds ----------

export interface AwinFeedInfo {
  advertiserId: string;
  advertiserName: string;
  primaryRegion: string;
  membershipStatus: string;
  feedId: string;
  feedName: string;
  language: string;
  vertical: string;
  lastImported: string;
  productCount: number;
  url: string;
}

/** Verfügbare Feeds auflisten (CSV der Datafeed-API parsen). */
export async function listFeeds(feedApiKey: string): Promise<AwinFeedInfo[]> {
  const res = await fetch(
    `${FEED_BASE}/datafeed/list/apikey/${encodeURIComponent(feedApiKey)}`,
    { redirect: "follow", signal: AbortSignal.timeout(30000) }
  );
  if (!res.ok) throw new Error(`AWIN Feed-Liste: HTTP ${res.status}`);
  const text = await res.text();
  const rows: Record<string, string>[] = await new Promise((resolve, reject) => {
    parse(text, { columns: true, skip_empty_lines: true }, (err, out) =>
      err ? reject(err) : resolve(out as Record<string, string>[])
    );
  });
  return rows.map((r) => ({
    advertiserId: r["Advertiser ID"] ?? "",
    advertiserName: r["Advertiser Name"] ?? "",
    primaryRegion: r["Primary Region"] ?? "",
    membershipStatus: r["Membership Status"] ?? "",
    feedId: r["Feed ID"] ?? "",
    feedName: r["Feed Name"] ?? "",
    language: r["Language"] ?? "",
    vertical: r["Vertical"] ?? "",
    lastImported: r["Last Imported"] ?? "",
    productCount: Number(r["No of products"] ?? 0),
    url: r["URL"] ?? "",
  }));
}

// Spalten, die wir aus dem Feed brauchen.
const FEED_COLUMNS = [
  "aw_product_id",
  "merchant_id",
  "merchant_name",
  "product_name",
  "brand_name",
  "merchant_category",
  "search_price",
  "currency",
  "aw_deep_link",
  "aw_image_url",
  "merchant_image_url",
  "ean",
].join(",");

// Die Feed-Liste nennt Sprachen ausgeschrieben ("German"), die Download-URL
// braucht ISO-Kürzel ("de").
const LANGUAGE_CODES: Record<string, string> = {
  german: "de",
  english: "en",
  french: "fr",
  italian: "it",
  spanish: "es",
  dutch: "nl",
  swedish: "sv",
  polish: "pl",
  danish: "da",
  norwegian: "no",
  finnish: "fi",
  portuguese: "pt",
};

function langCode(language?: string): string {
  if (!language) return "de";
  const l = language.trim().toLowerCase();
  if (l.length === 2) return l;
  return LANGUAGE_CODES[l] ?? "de";
}

function feedDownloadUrl(feedApiKey: string, feedId: string, language = "de") {
  return (
    `${FEED_BASE}/datafeed/download/apikey/${encodeURIComponent(feedApiKey)}` +
    `/language/${language}/fid/${encodeURIComponent(feedId)}` +
    `/columns/${FEED_COLUMNS}/format/csv/delimiter/%2C/compression/gzip/`
  );
}

// Sicherheitslimit pro Feed, damit Riesen-Feeds den VPS nicht fluten.
const MAX_PRODUCTS_PER_FEED = 100_000;

/**
 * Einen Feed herunterladen (gzip-CSV, gestreamt) und in den Produkt-Index
 * schreiben. Ersetzt vorhandene Produkte des Merchants.
 */
export async function importFeed(
  feedApiKey: string,
  feed: { feedId: string; advertiserId: string; language?: string }
): Promise<{ imported: number }> {
  const url = feedDownloadUrl(feedApiKey, feed.feedId, langCode(feed.language));
  const res = await fetch(url, { signal: AbortSignal.timeout(300_000) });
  if (!res.ok || !res.body) {
    throw new Error(`AWIN Feed-Download fid=${feed.feedId}: HTTP ${res.status}`);
  }

  const parser = Readable.fromWeb(res.body as import("stream/web").ReadableStream)
    .pipe(createGunzip())
    .pipe(parse({ columns: true, skip_empty_lines: true, relax_column_count: true }));

  const upsert = db.prepare(
    `INSERT INTO awin_products
       (id, mid, merchant, name, brand, category, price, currency, deep_link, image, ean, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       mid = excluded.mid, merchant = excluded.merchant, name = excluded.name,
       brand = excluded.brand, category = excluded.category, price = excluded.price,
       currency = excluded.currency, deep_link = excluded.deep_link,
       image = excluded.image, ean = excluded.ean, updated_at = excluded.updated_at`
  );

  const startedAt = Date.now();
  let count = 0;
  db.exec("BEGIN");
  try {
    for await (const row of parser as AsyncIterable<Record<string, string>>) {
      const id = row.aw_product_id;
      const name = row.product_name;
      const link = row.aw_deep_link;
      if (!id || !name || !link) continue;
      upsert.run(
        id,
        row.merchant_id || feed.advertiserId,
        row.merchant_name || "",
        name,
        row.brand_name || null,
        row.merchant_category || null,
        Number.parseFloat(row.search_price) || null,
        row.currency || null,
        link,
        row.aw_image_url || row.merchant_image_url || null,
        row.ean || null,
        startedAt
      );
      count++;
      if (count % 5000 === 0) {
        db.exec("COMMIT");
        db.exec("BEGIN");
      }
      if (count >= MAX_PRODUCTS_PER_FEED) break;
    }
    // Veraltete Produkte dieses Merchants entfernen (waren im Feed nicht mehr enthalten).
    db.prepare("DELETE FROM awin_products WHERE mid = ? AND updated_at < ?").run(
      feed.advertiserId,
      startedAt
    );
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  return { imported: count };
}

/** Alle Feeds bestätigter Programme importieren. */
export async function syncAllFeeds(): Promise<
  { advertiser: string; feedId: string; imported: number; error?: string }[]
> {
  const settings = await loadSettings();
  const key = settings.awinFeedApiKey;
  if (!key) throw new Error("AWIN Feed-API-Key fehlt in den Einstellungen");
  const feeds = await listFeeds(key);
  const active = feeds.filter(
    (f) => f.membershipStatus.toLowerCase() === "active"
  );
  // Pro Advertiser nur EINEN Feed importieren (Deutsch bevorzugt, dann Englisch),
  // sonst überschreiben sich mehrsprachige Feeds desselben Merchants gegenseitig.
  const langRank = (l: string) => {
    const lang = l.toLowerCase();
    if (lang.startsWith("german")) return 0;
    if (lang.startsWith("english")) return 1;
    return 2;
  };
  const byAdvertiser = new Map<string, AwinFeedInfo>();
  for (const f of active) {
    const cur = byAdvertiser.get(f.advertiserId);
    if (!cur || langRank(f.language) < langRank(cur.language)) {
      byAdvertiser.set(f.advertiserId, f);
    }
  }
  const results = [];
  for (const f of byAdvertiser.values()) {
    try {
      const { imported } = await importFeed(key, f);
      results.push({ advertiser: f.advertiserName, feedId: f.feedId, imported });
    } catch (e) {
      results.push({
        advertiser: f.advertiserName,
        feedId: f.feedId,
        imported: 0,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return results;
}

// ---------- Lokale Produktsuche (FTS5) ----------

export interface AwinProduct {
  id: string;
  mid: string;
  merchant: string;
  name: string;
  brand?: string;
  category?: string;
  price?: number;
  currency?: string;
  deepLink: string;
  image?: string;
}

/** Produkt-Index durchsuchen; optional auf bestimmte Merchants beschränkt. */
export function searchAwinProducts(
  query: string,
  limit = 5,
  mids?: string[]
): AwinProduct[] {
  // FTS5-Query bauen: Begriffe als Prefix-Suche verANDen, Sonderzeichen raus.
  const terms = query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1)
    .slice(0, 8);
  if (terms.length === 0) return [];

  const midFilter =
    mids && mids.length > 0
      ? ` AND p.mid IN (${mids.map(() => "?").join(",")})`
      : "";
  const runQuery = (ftsQuery: string): AwinProduct[] =>
    db
      .prepare(
        `SELECT p.id, p.mid, p.merchant, p.name, p.brand, p.category,
                p.price, p.currency, p.deep_link AS deepLink, p.image
         FROM awin_products_fts f
         JOIN awin_products p ON p.rowid = f.rowid
         WHERE awin_products_fts MATCH ?${midFilter}
         ORDER BY rank
         LIMIT ?`
      )
      .all(ftsQuery, ...(mids ?? []), limit) as unknown as AwinProduct[];

  try {
    // Erst streng (alle Begriffe müssen vorkommen), dann locker (mindestens
    // einer) – LLM-Suchbegriffe enthalten oft Zusatzwörter, die im
    // Produktnamen fehlen ("Segway Navimow Mähroboter" → nur "Navimow" matcht).
    const strict = runQuery(terms.map((t) => `"${t}"*`).join(" AND "));
    if (strict.length > 0) return strict;
    return runQuery(terms.map((t) => `"${t}"*`).join(" OR "));
  } catch {
    return [];
  }
}

/** Anzahl indexierter Produkte je Merchant (für die Admin-Anzeige). */
export function productIndexStats(): {
  mid: string;
  merchant: string;
  products: number;
  updatedAt: number;
}[] {
  return db
    .prepare(
      `SELECT mid, merchant, COUNT(*) AS products, MAX(updated_at) AS updatedAt
       FROM awin_products GROUP BY mid ORDER BY merchant`
    )
    .all() as unknown as {
    mid: string;
    merchant: string;
    products: number;
    updatedAt: number;
  }[];
}
