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
      user_id      TEXT NOT NULL,
      day          TEXT NOT NULL,
      tokens       INTEGER NOT NULL DEFAULT 0,
      bonus_tokens INTEGER NOT NULL DEFAULT 0,
      bonus_clicks INTEGER NOT NULL DEFAULT 0,
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
  `);
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
