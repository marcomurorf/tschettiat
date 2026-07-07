// Persistentes Token-Guthaben (Credits) + Weiterempfehlung.
// Credits verfallen nicht und werden verbraucht, sobald das Tagesbudget
// ausgeschöpft ist. Quellen: Stripe-Kauf, Ref-Link-Empfehlung.
import { randomBytes } from "node:crypto";
import { db, logEvent } from "./db";

/** Aktueller Kontostand (Summe aller Buchungen). */
export function getCreditBalance(userId: string): number {
  const row = db
    .prepare(
      "SELECT COALESCE(SUM(amount), 0) AS balance FROM credit_ledger WHERE user_id = ?"
    )
    .get(userId) as unknown as { balance: number };
  return row.balance;
}

/**
 * Gutschrift verbuchen. `ref` macht die Buchung idempotent (z.B. Stripe-
 * Session-ID): dieselbe Referenz wird nur einmal gutgeschrieben.
 * @returns false, wenn die Referenz bereits verbucht war.
 */
export function addCredits(
  userId: string,
  amount: number,
  reason: "purchase" | "referral" | "admin",
  ref?: string
): boolean {
  if (amount <= 0) return false;
  try {
    db.prepare(
      "INSERT INTO credit_ledger (ts, user_id, amount, reason, ref) VALUES (?, ?, ?, ?, ?)"
    ).run(Date.now(), userId, amount, reason, ref ?? null);
    logEvent(userId, "credits_added", { amount, reason, ref });
    return true;
  } catch {
    // UNIQUE-Verletzung auf (reason, ref): doppelter Webhook o.ä.
    return false;
  }
}

/** Verbrauch abbuchen (nie unter 0 – überschüssiger Verbrauch verfällt). */
export function consumeCredits(userId: string, tokens: number): void {
  if (tokens <= 0) return;
  const balance = getCreditBalance(userId);
  const amount = Math.min(tokens, balance);
  if (amount <= 0) return;
  db.prepare(
    "INSERT INTO credit_ledger (ts, user_id, amount, reason) VALUES (?, ?, ?, 'usage')"
  ).run(Date.now(), userId, -amount);
}

/** Ref-Code des Users holen bzw. beim ersten Aufruf erzeugen. */
export function getOrCreateRefCode(userId: string): string {
  const row = db
    .prepare("SELECT code FROM referral_codes WHERE user_id = ?")
    .get(userId) as unknown as { code: string } | undefined;
  if (row) return row.code;
  // 8 Zeichen, URL-sicher; Kollisionen sind extrem unwahrscheinlich,
  // zur Sicherheit ein paar Versuche.
  for (let i = 0; i < 5; i++) {
    const code = randomBytes(6).toString("base64url").slice(0, 8);
    try {
      db.prepare(
        "INSERT INTO referral_codes (code, user_id) VALUES (?, ?)"
      ).run(code, userId);
      return code;
    } catch {
      // Kollision → nochmal
    }
  }
  throw new Error("Ref-Code konnte nicht erzeugt werden");
}

/** Werber zu einem Ref-Code auflösen. */
export function resolveRefCode(code: string): string | undefined {
  const row = db
    .prepare("SELECT user_id FROM referral_codes WHERE code = ?")
    .get(code) as unknown as { user_id: string } | undefined;
  return row?.user_id;
}

/**
 * Empfehlung verbuchen: der Geworbene wird genau einmal registriert,
 * der Werber bekommt die Gutschrift. Selbst-Werbung zählt nicht.
 * @returns true, wenn die Gutschrift erfolgt ist.
 */
export function recordReferral(
  referredUser: string,
  refCode: string,
  bonusTokens: number
): boolean {
  const referrer = resolveRefCode(refCode);
  if (!referrer || referrer.toLowerCase() === referredUser.toLowerCase())
    return false;
  try {
    db.prepare(
      "INSERT INTO referrals (referred_user, referrer_user, ts) VALUES (?, ?, ?)"
    ).run(referredUser, referrer, Date.now());
  } catch {
    // schon geworben
    return false;
  }
  logEvent(referrer, "referral", { referred: referredUser });
  if (bonusTokens > 0)
    addCredits(referrer, bonusTokens, "referral", referredUser);
  return true;
}
