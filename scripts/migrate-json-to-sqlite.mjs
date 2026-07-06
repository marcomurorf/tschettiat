// Einmalige Migration: JSON-Dateien (data/chats, data/baskets, data/usage) → SQLite.
// Idempotent (INSERT OR REPLACE / OR IGNORE). Aufruf: node scripts/migrate-json-to-sqlite.mjs
import Database from "better-sqlite3";
import { readdirSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const DATA = join(process.cwd(), "data");
mkdirSync(DATA, { recursive: true });
const db = new Database(join(DATA, "tschetti.db"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS chats (
    user_id TEXT NOT NULL, id TEXT NOT NULL, title TEXT NOT NULL,
    updated_at INTEGER NOT NULL, messages TEXT NOT NULL,
    PRIMARY KEY (user_id, id)
  );
  CREATE INDEX IF NOT EXISTS idx_chats_user_updated ON chats (user_id, updated_at DESC);
  CREATE TABLE IF NOT EXISTS basket_items (
    user_id TEXT NOT NULL, basket_name TEXT NOT NULL, key TEXT NOT NULL,
    name TEXT NOT NULL, brand TEXT, price_hint TEXT, category TEXT,
    url TEXT NOT NULL, image TEXT, created_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, basket_name, key)
  );
  CREATE TABLE IF NOT EXISTS usage (
    user_id TEXT NOT NULL, day TEXT NOT NULL,
    tokens INTEGER NOT NULL DEFAULT 0, bonus_tokens INTEGER NOT NULL DEFAULT 0,
    bonus_clicks INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, day)
  );
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL,
    user_id TEXT NOT NULL, type TEXT NOT NULL, meta TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_events_ts ON events (ts);
  CREATE INDEX IF NOT EXISTS idx_events_type_ts ON events (type, ts);
`);

let chats = 0, baskets = 0, usage = 0;

// Chats: data/chats/<user>/<chatId>.json
const chatsDir = join(DATA, "chats");
if (existsSync(chatsDir)) {
  const insChat = db.prepare(
    "INSERT OR REPLACE INTO chats (user_id, id, title, updated_at, messages) VALUES (?, ?, ?, ?, ?)"
  );
  for (const user of readdirSync(chatsDir)) {
    const dir = join(chatsDir, user);
    let files;
    try { files = readdirSync(dir).filter((f) => f.endsWith(".json")); } catch { continue; }
    for (const f of files) {
      try {
        const c = JSON.parse(readFileSync(join(dir, f), "utf8"));
        if (!c?.id || !Array.isArray(c.messages)) continue;
        insChat.run(user, c.id, c.title ?? "Neuer Chat", c.updatedAt ?? Date.now(), JSON.stringify(c.messages));
        chats++;
      } catch (e) { console.warn(`Chat übersprungen: ${user}/${f}`, e.message); }
    }
  }
}

// Baskets: data/baskets/<user>.json = Basket[]
const basketsDir = join(DATA, "baskets");
if (existsSync(basketsDir)) {
  const insItem = db.prepare(
    `INSERT OR IGNORE INTO basket_items
     (user_id, basket_name, key, name, brand, price_hint, category, url, image, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const f of readdirSync(basketsDir).filter((f) => f.endsWith(".json"))) {
    const user = f.slice(0, -5);
    try {
      const list = JSON.parse(readFileSync(join(basketsDir, f), "utf8"));
      if (!Array.isArray(list)) continue;
      let i = 0;
      for (const b of list) {
        for (const it of b.items ?? []) {
          insItem.run(user, b.name, it.key, it.name, it.brand ?? null,
            it.priceHint ?? null, it.category ?? null, it.url, it.image ?? null, Date.now() + i++);
          baskets++;
        }
      }
    } catch (e) { console.warn(`Korb übersprungen: ${f}`, e.message); }
  }
}

// Usage: data/usage/<user>.json = {day, tokens, bonusTokens, bonusClicks}
const usageDir = join(DATA, "usage");
if (existsSync(usageDir)) {
  const insUsage = db.prepare(
    `INSERT OR REPLACE INTO usage (user_id, day, tokens, bonus_tokens, bonus_clicks)
     VALUES (?, ?, ?, ?, ?)`
  );
  for (const f of readdirSync(usageDir).filter((f) => f.endsWith(".json"))) {
    const user = f.slice(0, -5);
    try {
      const u = JSON.parse(readFileSync(join(usageDir, f), "utf8"));
      if (!u?.day) continue;
      insUsage.run(user, u.day, u.tokens ?? 0, u.bonusTokens ?? 0, u.bonusClicks ?? 0);
      usage++;
    } catch (e) { console.warn(`Usage übersprungen: ${f}`, e.message); }
  }
}

console.log(`Fertig: ${chats} Chats, ${baskets} Korb-Artikel, ${usage} Usage-Einträge migriert.`);
db.close();
