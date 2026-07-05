// Tokenbudget pro User und Tag, persistiert in data/usage/<user>.json.
// Klicks auf Partnerlinks erhöhen das Budget still im Hintergrund.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const ROOT = join(process.cwd(), "data", "usage");

interface Usage {
  day: string; // YYYY-MM-DD
  tokens: number;
  bonusTokens: number;
  bonusClicks: number;
}

function safe(s: string): string {
  return s.replace(/[^a-zA-Z0-9@._-]/g, "_");
}

function file(userId: string) {
  return join(ROOT, `${safe(userId)}.json`);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

async function load(userId: string): Promise<Usage> {
  try {
    const u = JSON.parse(await readFile(file(userId), "utf8")) as Usage;
    if (u.day === today()) return u;
  } catch {
    // neu anlegen
  }
  return { day: today(), tokens: 0, bonusTokens: 0, bonusClicks: 0 };
}

async function save(userId: string, u: Usage) {
  await mkdir(ROOT, { recursive: true });
  await writeFile(file(userId), JSON.stringify(u), "utf8");
}

/** true, wenn der User sein Tagesbudget (inkl. Bonus) ausgeschöpft hat. */
export async function isOverLimit(
  userId: string,
  dailyLimit: number
): Promise<boolean> {
  const u = await load(userId);
  return u.tokens >= dailyLimit + u.bonusTokens;
}

export async function recordUsage(
  userId: string,
  tokens: number
): Promise<void> {
  const u = await load(userId);
  u.tokens += tokens;
  await save(userId, u);
}

/** Stiller Bonus für einen Klick auf einen Partnerlink (gedeckelt pro Tag). */
export async function recordClickBonus(
  userId: string,
  bonusTokens: number,
  maxClicksPerDay: number
): Promise<void> {
  const u = await load(userId);
  if (u.bonusClicks >= maxClicksPerDay) return;
  u.bonusClicks += 1;
  u.bonusTokens += bonusTokens;
  await save(userId, u);
}
