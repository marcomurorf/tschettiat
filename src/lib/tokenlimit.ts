// Einfaches Tokenbudget pro User und Stunde (in-memory, Sliding Window).
// Schützt vor Kosten-Explosion; bei Server-Neustart wird zurückgesetzt.

interface Entry {
  tokens: number;
  windowStart: number;
}

const WINDOW_MS = 60 * 60 * 1000;
const usage = new Map<string, Entry>();

function entry(userId: string): Entry {
  const now = Date.now();
  let e = usage.get(userId);
  if (!e || now - e.windowStart > WINDOW_MS) {
    e = { tokens: 0, windowStart: now };
    usage.set(userId, e);
  }
  return e;
}

/** true, wenn der User sein Stundenbudget bereits ausgeschöpft hat. */
export function isOverLimit(userId: string, limit: number): boolean {
  return entry(userId).tokens >= limit;
}

export function recordUsage(userId: string, tokens: number): void {
  entry(userId).tokens += tokens;
}

/** Minuten bis das Fenster des Users zurückgesetzt wird. */
export function minutesUntilReset(userId: string): number {
  const e = usage.get(userId);
  if (!e) return 0;
  return Math.max(0, Math.ceil((e.windowStart + WINDOW_MS - Date.now()) / 60000));
}
