import { request } from "node:https";
import { db } from "./db";

const TP_TOKEN = process.env.TRAVELPAYOUTS_TOKEN;
const TP_MARKER = process.env.TRAVELPAYOUTS_MARKER ?? "547391";
const LITEAPI_KEY = process.env.LITEAPI_KEY;

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h

// ---------- HTTP-Helfer (node:https statt fetch – Nexts gepatchter fetch hängt in Tool-Execute) ----------

function httpJson(
  method: "GET" | "POST",
  url: string,
  headers: Record<string, string> = {},
  body?: unknown
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const payload = body !== undefined ? JSON.stringify(body) : undefined;
    const req = request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method,
        headers: {
          Accept: "application/json",
          ...(payload
            ? {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(payload),
              }
            : {}),
          ...headers,
        },
        timeout: 12_000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          if (!res.statusCode || res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${text.slice(0, 200)}`));
            return;
          }
          try {
            resolve(JSON.parse(text));
          } catch {
            reject(new Error("Invalid JSON response"));
          }
        });
      }
    );
    req.on("timeout", () => req.destroy(new Error("Request timeout")));
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function httpJsonRetry(
  method: "GET" | "POST",
  url: string,
  headers: Record<string, string> = {},
  body?: unknown
): Promise<unknown> {
  try {
    return await httpJson(method, url, headers, body);
  } catch {
    return await httpJson(method, url, headers, body);
  }
}

// Serialisierung: nie mehrere Travel-Requests parallel
let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const next = queue.then(fn, fn);
  queue = next.catch(() => {});
  return next;
}

// ---------- Cache (nutzt product_search_cache mit Präfix) ----------

function cacheGet(key: string): unknown | null {
  try {
    const row = db
      .prepare("SELECT results, ts FROM product_search_cache WHERE query = ?")
      .get(key) as { results: string; ts: number } | undefined;
    if (row && Date.now() - row.ts < CACHE_TTL_MS) {
      return JSON.parse(row.results);
    }
  } catch {
    // Cache-Fehler ignorieren
  }
  return null;
}

function cacheSet(key: string, value: unknown) {
  try {
    db.prepare(
      `INSERT INTO product_search_cache (query, results, ts) VALUES (?, ?, ?)
       ON CONFLICT(query) DO UPDATE SET results = excluded.results, ts = excluded.ts`
    ).run(key, JSON.stringify(value), Date.now());
  } catch {
    // Cache-Fehler ignorieren
  }
}

// ---------- Flüge (Travelpayouts / Aviasales) ----------

export interface FlightOption {
  origin: string;
  destination: string;
  departureAt: string; // ISO
  returnAt?: string;
  airline: string; // IATA-Code
  flightNumber: string;
  price: number; // EUR
  durationMinutes: number;
  transfers: number;
  returnTransfers?: number;
  link: string; // Aviasales-Buchungslink mit Marker
}

interface TpFlight {
  origin: string;
  destination: string;
  origin_airport: string;
  destination_airport: string;
  departure_at: string;
  return_at?: string;
  airline: string;
  flight_number: string;
  price: number;
  duration: number;
  duration_to?: number;
  duration_back?: number;
  transfers: number;
  return_transfers?: number;
  link: string;
}

async function tpPricesForDates(params: Record<string, string>): Promise<TpFlight[]> {
  const qs = new URLSearchParams({
    ...params,
    currency: "eur",
    sorting: "price",
    token: TP_TOKEN!,
  });
  const res = (await httpJsonRetry(
    "GET",
    `https://api.travelpayouts.com/aviasales/v3/prices_for_dates?${qs}`
  )) as { data?: TpFlight[] };
  return res.data ?? [];
}

function toFlightOption(f: TpFlight): FlightOption {
  return {
    origin: f.origin_airport || f.origin,
    destination: f.destination_airport || f.destination,
    departureAt: f.departure_at,
    returnAt: f.return_at,
    airline: f.airline,
    flightNumber: f.flight_number,
    price: f.price,
    durationMinutes: f.duration_to ?? f.duration,
    transfers: f.transfers,
    returnTransfers: f.return_transfers,
    link: `https://www.aviasales.com${f.link}${f.link.includes("?") ? "&" : "?"}marker=${TP_MARKER}`,
  };
}

/**
 * Sucht Flüge. departDate/returnDate im Format YYYY-MM-DD.
 * Fallback: Wenn das exakte Datum keine Treffer liefert, wird der Monat (YYYY-MM) abgefragt.
 */
export async function searchFlights(
  origin: string,
  destination: string,
  departDate: string,
  returnDate?: string,
  limit = 4
): Promise<{ flights: FlightOption[]; dateExact: boolean }> {
  if (!TP_TOKEN) return { flights: [], dateExact: true };

  const cacheKey = `flight:${origin}:${destination}:${departDate}:${returnDate ?? ""}:${limit}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached as { flights: FlightOption[]; dateExact: boolean };

  const result = await enqueue(async () => {
    const base: Record<string, string> = {
      origin: origin.toUpperCase(),
      destination: destination.toUpperCase(),
      departure_at: departDate,
      limit: String(limit),
      one_way: returnDate ? "false" : "true",
    };
    if (returnDate) base.return_at = returnDate;

    // 1. Versuch: exaktes Datum
    let data = await tpPricesForDates(base).catch(() => [] as TpFlight[]);
    let dateExact = true;

    // 2. Fallback: Monat
    if (data.length === 0) {
      const monthParams: Record<string, string> = { ...base, departure_at: departDate.slice(0, 7) };
      if (returnDate) monthParams.return_at = returnDate.slice(0, 7);
      data = await tpPricesForDates(monthParams).catch(() => [] as TpFlight[]);
      dateExact = false;
    }

    return { flights: data.map(toFlightOption), dateExact };
  });

  if (result.flights.length > 0) cacheSet(cacheKey, result);
  return result;
}

// ---------- Hotels (LiteAPI) ----------

export interface HotelOption {
  hotelId: string;
  name: string;
  stars?: number;
  rating?: number;
  reviewCount?: number;
  address?: string;
  city: string;
  photo?: string;
  pricePerStay: number; // Gesamtpreis für den Aufenthalt, EUR
  currency: string;
  roomName?: string;
  boardName?: string;
  parking?: boolean;
  petsAllowed?: boolean;
  facilities: string[];
  link: string; // Fallback: Google-Hotels-Suche (Buchung direkt kommt in V2)
}

interface LiteRateHotel {
  hotelId: string;
  roomTypes?: Array<{
    offerId?: string;
    rates?: Array<{
      name?: string;
      boardName?: string;
      retailRate?: { total?: Array<{ amount?: number; currency?: string }> };
    }>;
  }>;
}

interface LiteHotelDetails {
  name?: string;
  starRating?: number;
  rating?: number;
  reviewCount?: number;
  address?: string;
  city?: string;
  main_photo?: string;
  thumbnail?: string;
  parking?: string | boolean;
  petsAllowed?: string | boolean;
  hotelFacilities?: Array<string | { name?: string }>;
}

function toBool(v: string | boolean | undefined): boolean | undefined {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.toLowerCase();
    if (s.includes("yes") || s.includes("free") || s.includes("available")) return true;
    if (s.includes("no")) return false;
    return true; // nicht-leerer String → vorhanden
  }
  return undefined;
}

async function liteGet(path: string): Promise<unknown> {
  return httpJsonRetry("GET", `https://api.liteapi.travel/v3.0${path}`, {
    "X-API-Key": LITEAPI_KEY!,
  });
}

async function litePost(path: string, body: unknown): Promise<unknown> {
  return httpJsonRetry("POST", `https://api.liteapi.travel/v3.0${path}`, {
    "X-API-Key": LITEAPI_KEY!,
  }, body);
}

/**
 * Sucht Hotels mit Verfügbarkeit und Preisen.
 * checkin/checkout im Format YYYY-MM-DD. maxPricePerNight in EUR.
 */
export async function searchHotels(opts: {
  city: string;
  countryCode: string; // ISO-2, z.B. DE, US
  checkin: string;
  checkout: string;
  adults?: number;
  minStars?: number;
  maxPricePerNight?: number;
  needsParking?: boolean;
  needsPets?: boolean;
  limit?: number;
}): Promise<HotelOption[]> {
  if (!LITEAPI_KEY) return [];

  const {
    city,
    countryCode,
    checkin,
    checkout,
    adults = 2,
    minStars,
    maxPricePerNight,
    needsParking,
    needsPets,
    limit = 4,
  } = opts;

  const cacheKey = `hotel:${countryCode}:${city.toLowerCase()}:${checkin}:${checkout}:${adults}:${minStars ?? ""}:${maxPricePerNight ?? ""}:${needsParking ? 1 : 0}:${needsPets ? 1 : 0}:${limit}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached as HotelOption[];

  const result = await enqueue(async () => {
    const nights = Math.max(
      1,
      Math.round((Date.parse(checkout) - Date.parse(checkin)) / 86_400_000)
    );

    const body: Record<string, unknown> = {
      countryCode: countryCode.toUpperCase(),
      cityName: city,
      checkin,
      checkout,
      currency: "EUR",
      guestNationality: "AT",
      occupancies: [{ adults }],
      limit: Math.max(limit * 3, 10), // mehr holen, wir filtern clientseitig
    };
    if (minStars) body.starRating = [minStars, Math.min(minStars + 1, 5)].filter(
      (v, i, a) => a.indexOf(v) === i
    );

    const ratesRes = (await litePost("/hotels/rates", body).catch(() => null)) as {
      data?: LiteRateHotel[];
    } | null;
    const rateHotels = ratesRes?.data ?? [];

    const options: HotelOption[] = [];
    for (const rh of rateHotels) {
      if (options.length >= limit) break;

      // günstigste Rate des Hotels finden
      let bestPrice = Infinity;
      let bestCurrency = "EUR";
      let bestRoom: string | undefined;
      let bestBoard: string | undefined;
      for (const rt of rh.roomTypes ?? []) {
        for (const rate of rt.rates ?? []) {
          const total = rate.retailRate?.total?.[0];
          if (total?.amount && total.amount < bestPrice) {
            bestPrice = total.amount;
            bestCurrency = total.currency ?? "EUR";
            bestRoom = rate.name;
            bestBoard = rate.boardName;
          }
        }
      }
      if (!isFinite(bestPrice)) continue;
      if (maxPricePerNight && bestPrice / nights > maxPricePerNight) continue;

      // Details (Sterne, Foto, Parken, Haustiere)
      const detailsRes = (await liteGet(
        `/data/hotel?hotelId=${encodeURIComponent(rh.hotelId)}`
      ).catch(() => null)) as { data?: LiteHotelDetails } | null;
      const d = detailsRes?.data;
      if (!d?.name) continue;

      const facilities = (d.hotelFacilities ?? [])
        .map((f) => (typeof f === "string" ? f : f.name ?? ""))
        .filter(Boolean);
      const facLower = facilities.map((f) => f.toLowerCase());
      const parking =
        toBool(d.parking) ?? facLower.some((f) => f.includes("parking"));
      const petsAllowed =
        toBool(d.petsAllowed) ?? facLower.some((f) => f.includes("pet"));

      if (needsParking && !parking) continue;
      if (needsPets && !petsAllowed) continue;

      options.push({
        hotelId: rh.hotelId,
        name: d.name,
        stars: d.starRating,
        rating: d.rating,
        reviewCount: d.reviewCount,
        address: d.address,
        city: d.city ?? city,
        photo: d.main_photo ?? d.thumbnail,
        pricePerStay: Math.round(bestPrice),
        currency: bestCurrency,
        roomName: bestRoom,
        boardName: bestBoard,
        parking,
        petsAllowed,
        facilities: facilities.slice(0, 8),
        link: `https://www.google.com/travel/hotels?q=${encodeURIComponent(`${d.name} ${d.city ?? city}`)}`,
      });
    }
    return options;
  });

  if (result.length > 0) cacheSet(cacheKey, result);
  return result;
}
