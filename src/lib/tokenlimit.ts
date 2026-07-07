// Tokenbudget pro User und Tag in SQLite (Tabelle usage).
// Klicks auf Partnerlinks erhöhen das Budget still im Hintergrund.
import { db, logEvent } from "./db";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

interface UsageRow {
  tokens: number;
  bonus_tokens: number;
  bonus_clicks: number;
}

function get(userId: string): UsageRow {
  const row = db
    .prepare(
      "SELECT tokens, bonus_tokens, bonus_clicks FROM usage WHERE user_id = ? AND day = ?"
    )
    .get(userId, today()) as unknown as UsageRow | undefined;
  return row ?? { tokens: 0, bonus_tokens: 0, bonus_clicks: 0 };
}

/** true, wenn der User sein Tagesbudget (inkl. Bonus) ausgeschöpft hat. */
export async function isOverLimit(
  userId: string,
  dailyLimit: number
): Promise<boolean> {
  const u = get(userId);
  return u.tokens >= dailyLimit + u.bonus_tokens;
}

export async function recordUsage(
  userId: string,
  tokens: number,
  inputTokens = 0,
  outputTokens = 0
): Promise<void> {
  db.prepare(
    `INSERT INTO usage (user_id, day, tokens, input_tokens, output_tokens)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (user_id, day) DO UPDATE SET
       tokens = tokens + excluded.tokens,
       input_tokens = input_tokens + excluded.input_tokens,
       output_tokens = output_tokens + excluded.output_tokens`
  ).run(userId, today(), tokens, inputTokens, outputTokens);
  logEvent(userId, "chat_usage", { tokens, inputTokens, outputTokens });
}

/** Stiller Bonus für einen Klick auf einen Partnerlink (gedeckelt pro Tag). */
export async function recordClickBonus(
  userId: string,
  bonusTokens: number,
  maxClicksPerDay: number
): Promise<void> {
  logEvent(userId, "affiliate_click");
  if (maxClicksPerDay <= 0 || bonusTokens <= 0) return;
  const changed = db
    .prepare(
      `INSERT INTO usage (user_id, day, bonus_tokens, bonus_clicks)
       VALUES (?, ?, ?, 1)
       ON CONFLICT (user_id, day) DO UPDATE SET
         bonus_tokens = bonus_tokens + excluded.bonus_tokens,
         bonus_clicks = bonus_clicks + 1
       WHERE bonus_clicks < ?`
    )
    .run(userId, today(), bonusTokens, maxClicksPerDay);
  void changed;
}
