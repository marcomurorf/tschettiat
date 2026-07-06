// Canopy API: echte Amazon-Produktdaten (Titel, Preis, Bild, Rating) per Suche.
// Ergebnisse werden in SQLite gecacht, um das API-Kontingent zu schonen.
import { request as httpsRequest } from "node:https";
import { db } from "./db";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 h

// Canopy (Free Tier) drosselt parallele Anfragen → Requests serialisieren.
let queue: Promise<unknown> = Promise.resolve();

export interface CanopyProduct {
  asin: string;
  title: string;
  brand?: string;
  price?: string;
  priceValue?: number;
  image?: string;
  rating?: number;
  ratingsTotal?: number;
}

interface RawResult {
  asin: string;
  title: string;
  brand?: string | null;
  price?: { display?: string; value?: number } | null;
  mainImageUrl?: string | null;
  rating?: number | null;
  ratingsTotal?: number | null;
}

/**
 * Sucht Produkte auf amazon.de über Canopy. Liefert [] bei Fehlern
 * oder fehlendem API-Key – der Chat funktioniert dann wie bisher.
 */
export function searchAmazonProducts(
  query: string,
  limit = 8
): Promise<CanopyProduct[]> {
  const next = queue.then(() => doSearch(query, limit));
  queue = next.catch(() => {});
  return next;
}

// Achtung: das Feld "brand" NICHT abfragen – es macht Canopy-Queries
// extrem langsam (>60 s statt ~4 s). Marke steckt ohnehin im Titel.
function buildQuery(term: string): string {
  return `query {
  amazonProductSearchResults(input: { searchTerm: ${JSON.stringify(term)}, domain: DE }) {
    productResults {
      results {
        asin title
        price { display value }
        mainImageUrl rating ratingsTotal
      }
    }
  }
}`;
}

// Direkter HTTPS-Request statt fetch: Nexts gepatchter fetch hängt im
// Streaming-Kontext (Tool-Execute) reproduzierbar bei externen POSTs.
function postCanopy(
  apiKey: string,
  term: string
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ query: buildQuery(term) });
    const req = httpsRequest(
      "https://graphql.canopyapi.co/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
          "API-KEY": apiKey,
        },
        timeout: 12_000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve({
            status: res.statusCode ?? 0,
            body: Buffer.concat(chunks).toString("utf8"),
          })
        );
        res.on("error", reject);
      }
    );
    req.on("timeout", () => req.destroy(new Error("Canopy-Timeout")));
    req.on("error", reject);
    req.end(payload);
  });
}

// Canopy hängt gelegentlich → kurzer Timeout mit einem Retry.
async function fetchWithRetry(
  apiKey: string,
  term: string
): Promise<{ status: number; body: string }> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await postCanopy(apiKey, term);
    } catch (err) {
      if (attempt >= 1) throw err;
      console.warn("[canopy] Timeout, versuche erneut:", term);
    }
  }
}

async function doSearch(query: string, limit: number): Promise<CanopyProduct[]> {
  const apiKey = process.env.CANOPY_API_KEY;
  if (!apiKey) return [];

  const key = query.trim().toLowerCase().slice(0, 200);

  // Cache-Hit?
  const cached = db
    .prepare("SELECT results, ts FROM product_search_cache WHERE query = ?")
    .get(key) as { results: string; ts: number } | undefined;
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    try {
      return (JSON.parse(cached.results) as CanopyProduct[]).slice(0, limit);
    } catch {
      /* Cache kaputt → neu laden */
    }
  }

  try {
    const res = await fetchWithRetry(apiKey, query);
    if (res.status !== 200) {
      console.error("[canopy] HTTP", res.status, res.body.slice(0, 300));
      return [];
    }
    const json = JSON.parse(res.body) as {
      errors?: unknown;
      data?: {
        amazonProductSearchResults?: {
          productResults?: { results?: RawResult[] };
        };
      };
    };
    if (json.errors) console.error("[canopy] GraphQL:", JSON.stringify(json.errors).slice(0, 500));
    const raw =
      json.data?.amazonProductSearchResults?.productResults?.results ?? [];

    const products: CanopyProduct[] = raw
      .filter((r) => r.asin && r.title)
      .map((r) => ({
        asin: r.asin,
        title: r.title,
        price: r.price?.display ?? undefined,
        priceValue: r.price?.value ?? undefined,
        // Bild in größerer Auflösung anfordern (Canopy liefert Thumbnails)
        image: r.mainImageUrl?.replace(/\._AC_[^.]+\./, "._AC_SL500_.") ?? undefined,
        rating: r.rating ?? undefined,
        ratingsTotal: r.ratingsTotal ?? undefined,
      }));

    db.prepare(
      `INSERT INTO product_search_cache (query, results, ts) VALUES (?, ?, ?)
       ON CONFLICT (query) DO UPDATE SET results = excluded.results, ts = excluded.ts`
    ).run(key, JSON.stringify(products), Date.now());

    return products.slice(0, limit);
  } catch (err) {
    console.error("[canopy] Fehler:", err);
    return [];
  }
}
