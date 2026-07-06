// Aggregierte Statistiken für das Admin-Backend (durch Basic-Auth-Proxy geschützt).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function since(days: number): number {
  return Date.now() - days * 86_400_000;
}

export async function GET() {
  const clickTotal = (db
    .prepare("SELECT COUNT(*) AS n FROM events WHERE type = 'affiliate_click'")
    .get() as unknown as { n: number }).n;
  const clicks7d = (db
    .prepare(
      "SELECT COUNT(*) AS n FROM events WHERE type = 'affiliate_click' AND ts >= ?"
    )
    .get(since(7)) as unknown as { n: number }).n;
  const clicksToday = (db
    .prepare(
      "SELECT COUNT(*) AS n FROM events WHERE type = 'affiliate_click' AND ts >= ?"
    )
    .get(new Date().setHours(0, 0, 0, 0)) as unknown as { n: number }).n;

  // Klicks pro Tag, letzte 14 Tage
  const clicksPerDay = db
    .prepare(
      `SELECT date(ts / 1000, 'unixepoch') AS day, COUNT(*) AS clicks
       FROM events WHERE type = 'affiliate_click' AND ts >= ?
       GROUP BY day ORDER BY day DESC`
    )
    .all(since(14)) as unknown as { day: string; clicks: number }[];

  // Token-Verbrauch pro Tag, letzte 14 Tage
  const tokensPerDay = db
    .prepare(
      `SELECT day, SUM(tokens) AS tokens, COUNT(DISTINCT user_id) AS users
       FROM usage GROUP BY day ORDER BY day DESC LIMIT 14`
    )
    .all() as unknown as { day: string; tokens: number; users: number }[];

  const totals = db
    .prepare(
      `SELECT
         (SELECT COUNT(DISTINCT user_id) FROM chats) AS chatUsers,
         (SELECT COUNT(*) FROM chats) AS chats,
         (SELECT COUNT(*) FROM basket_items) AS basketItems,
         (SELECT COALESCE(SUM(tokens), 0) FROM usage) AS tokens`
    )
    .get() as unknown as {
    chatUsers: number;
    chats: number;
    basketItems: number;
    tokens: number;
  };

  // Aktivste User (Token, letzte 7 Tage)
  const topUsers = db
    .prepare(
      `SELECT user_id AS userId, SUM(tokens) AS tokens, SUM(bonus_clicks) AS clicks
       FROM usage WHERE day >= date('now', '-7 days')
       GROUP BY user_id ORDER BY tokens DESC LIMIT 10`
    )
    .all() as unknown as { userId: string; tokens: number; clicks: number }[];

  return NextResponse.json({
    clicks: { total: clickTotal, last7d: clicks7d, today: clicksToday },
    clicksPerDay,
    tokensPerDay,
    totals,
    topUsers,
  });
}
