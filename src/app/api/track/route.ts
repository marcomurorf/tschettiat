// Cookieloses Besucher-Tracking: speichert Seitenaufrufe in SQLite.
// Keine IP-Speicherung – nur ein täglich rotierender, nicht rückführbarer
// Hash aus (Datum + IP + User-Agent) zur Unterscheidung eindeutiger Besucher.
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { path?: string; referrer?: string };
    const path = (body.path || "/").slice(0, 200);
    // Interne Navigation nicht als Referrer werten
    let referrer = (body.referrer || "").slice(0, 300);
    try {
      if (referrer && new URL(referrer).hostname.endsWith("tschetti.at")) {
        referrer = "";
      }
    } catch {
      referrer = "";
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const ua = req.headers.get("user-agent") || "";
    // Bots nicht mitzählen
    if (/bot|crawler|spider|slurp|curl|wget|preview|facebookexternalhit/i.test(ua)) {
      return NextResponse.json({ ok: true });
    }

    const day = new Date().toISOString().slice(0, 10);
    const visitor = createHash("sha256")
      .update(`${day}|${ip}|${ua}|tschetti-stats`)
      .digest("hex")
      .slice(0, 16);

    db.prepare(
      "INSERT INTO page_views (ts, path, referrer, visitor) VALUES (?, ?, ?, ?)"
    ).run(Date.now(), path, referrer || null, visitor);
  } catch {
    // Statistik darf nie einen Request stören
  }
  return NextResponse.json({ ok: true });
}
