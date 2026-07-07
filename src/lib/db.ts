// Zentrale SQLite-Datenbank (node:sqlite, WAL-Modus).
// Ersetzt die früheren JSON-Dateien unter data/chats, data/baskets, data/usage.
// node:sqlite statt better-sqlite3: braucht keine nativen Builds
// (better-sqlite3 scheitert auf dem VPS an GLIBC 2.28 / Python 3.7).
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const DIR = join(process.cwd(), "data");
mkdirSync(DIR, { recursive: true });

// Ein Singleton pro Prozess (überlebt Hot-Reload im Dev-Modus).
const globalForDb = globalThis as unknown as { __tschettiDb?: DatabaseSync };

export const db: DatabaseSync =
  globalForDb.__tschettiDb ?? new DatabaseSync(join(DIR, "tschetti.db"));

if (!globalForDb.__tschettiDb) {
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA busy_timeout = 5000");
  db.exec(`
    CREATE TABLE IF NOT EXISTS chats (
      user_id    TEXT NOT NULL,
      id         TEXT NOT NULL,
      title      TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      messages   TEXT NOT NULL,
      PRIMARY KEY (user_id, id)
    );
    CREATE INDEX IF NOT EXISTS idx_chats_user_updated
      ON chats (user_id, updated_at DESC);

    CREATE TABLE IF NOT EXISTS basket_items (
      user_id     TEXT NOT NULL,
      basket_name TEXT NOT NULL,
      key         TEXT NOT NULL,
      name        TEXT NOT NULL,
      brand       TEXT,
      price_hint  TEXT,
      category    TEXT,
      url         TEXT NOT NULL,
      image       TEXT,
      created_at  INTEGER NOT NULL,
      PRIMARY KEY (user_id, basket_name, key)
    );

    CREATE TABLE IF NOT EXISTS usage (
      user_id       TEXT NOT NULL,
      day           TEXT NOT NULL,
      tokens        INTEGER NOT NULL DEFAULT 0,
      input_tokens  INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      bonus_tokens  INTEGER NOT NULL DEFAULT 0,
      bonus_clicks  INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, day)
    );

    -- Cache für Canopy-Produktsuchen (spart API-Kontingent)
    CREATE TABLE IF NOT EXISTS product_search_cache (
      query   TEXT PRIMARY KEY,
      results TEXT NOT NULL,
      ts      INTEGER NOT NULL
    );

    -- Event-Log für Statistiken (Klicks, Chat-Nachrichten, …)
    CREATE TABLE IF NOT EXISTS events (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      ts      INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      type    TEXT NOT NULL,
      meta    TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_events_ts ON events (ts);
    CREATE INDEX IF NOT EXISTS idx_events_type_ts ON events (type, ts);

    -- Cookielose Besucher-Statistik (keine IP-Speicherung, nur Tages-Hash)
    CREATE TABLE IF NOT EXISTS page_views (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      ts       INTEGER NOT NULL,
      path     TEXT NOT NULL,
      referrer TEXT,
      visitor  TEXT NOT NULL  -- sha256(Tag+IP+UA), täglich rotierend, nicht rückführbar
    );
    CREATE INDEX IF NOT EXISTS idx_page_views_ts ON page_views (ts);

    -- AWIN: Advertiser (Partnerprogramme), per Sync aus der Management-API
    CREATE TABLE IF NOT EXISTS awin_merchants (
      mid        TEXT PRIMARY KEY, -- AWIN Advertiser-ID
      name       TEXT NOT NULL,
      region     TEXT,             -- Primärregion, z.B. "AT"
      domain     TEXT,
      synced_at  INTEGER NOT NULL
    );

    -- AWIN: Produkt-Index aus den Datafeeds
    CREATE TABLE IF NOT EXISTS awin_products (
      id          TEXT PRIMARY KEY, -- aw_product_id
      mid         TEXT NOT NULL,
      merchant    TEXT NOT NULL,
      name        TEXT NOT NULL,
      brand       TEXT,
      category    TEXT,
      price       REAL,
      currency    TEXT,
      deep_link   TEXT NOT NULL,   -- vergüteter Affiliate-Link aus dem Feed
      image       TEXT,
      ean         TEXT,
      updated_at  INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_awin_products_mid ON awin_products (mid);

    -- Volltextsuche über den Produkt-Index
    CREATE VIRTUAL TABLE IF NOT EXISTS awin_products_fts USING fts5(
      name, brand, category,
      content='awin_products', content_rowid='rowid'
    );
    CREATE TRIGGER IF NOT EXISTS awin_products_ai AFTER INSERT ON awin_products BEGIN
      INSERT INTO awin_products_fts(rowid, name, brand, category)
      VALUES (new.rowid, new.name, new.brand, new.category);
    END;
    CREATE TRIGGER IF NOT EXISTS awin_products_ad AFTER DELETE ON awin_products BEGIN
      INSERT INTO awin_products_fts(awin_products_fts, rowid, name, brand, category)
      VALUES ('delete', old.rowid, old.name, old.brand, old.category);
    END;
    CREATE TRIGGER IF NOT EXISTS awin_products_au AFTER UPDATE ON awin_products BEGIN
      INSERT INTO awin_products_fts(awin_products_fts, rowid, name, brand, category)
      VALUES ('delete', old.rowid, old.name, old.brand, old.category);
      INSERT INTO awin_products_fts(rowid, name, brand, category)
      VALUES (new.rowid, new.name, new.brand, new.category);
    END;
  `);

  // Migration: Input-/Output-Token-Spalten für bestehende Datenbanken
  for (const col of ["input_tokens", "output_tokens"]) {
    try {
      db.exec(`ALTER TABLE usage ADD COLUMN ${col} INTEGER NOT NULL DEFAULT 0`);
    } catch {
      // Spalte existiert bereits
    }
  }

  globalForDb.__tschettiDb = db;
}

/** Statistik-Event festhalten (fire-and-forget, Fehler nicht fatal). */
export function logEvent(
  userId: string,
  type: string,
  meta?: Record<string, unknown>
): void {
  try {
    db.prepare(
      "INSERT INTO events (ts, user_id, type, meta) VALUES (?, ?, ?, ?)"
    ).run(Date.now(), userId, type, meta ? JSON.stringify(meta) : null);
  } catch {
    // Statistik darf nie einen Request umbringen
  }
}
