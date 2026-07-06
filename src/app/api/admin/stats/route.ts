// Aggregierte Statistiken für das Admin-Backend (durch Basic-Auth-Proxy geschützt).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { loadSettings, DEFAULT_SETTINGS } from "@/lib/settings";

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
// Kosten: €/1 Mio. Token aus den Einstellungen
  const settings = await loadSettings();
  const costPerMTokens =
    settings.llm.costPerMTokens ?? DEFAULT_SETTINGS.llm.costPerMTokens ?? 0;

  // Token gesamt je User (für Gesamtkosten je User)
  const userTotals = db
    .prepare(
      `SELECT user_id AS userId, SUM(tokens) AS tokens
       FROM usage GROUP BY user_id`
    )
    .all() as unknown as { userId: string; tokens: number }[];
  const totalTokensByUser = new Map(userTotals.map((u) => [u.userId, u.tokens]));

  const topUsersWithCost = topUsers.map((u) => ({
    ...u,
    cost: (u.tokens / 1_000_000) * costPerMTokens,
    totalTokens: totalTokensByUser.get(u.userId) ?? u.tokens,
    totalCost:
      ((totalTokensByUser.get(u.userId) ?? u.tokens) / 1_000_000) *
      costPerMTokens,
  }));

  // Besucher-Statistik (cookielos, page_views)
  const visitors = db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM page_views WHERE ts >= ?) AS viewsToday,
         (SELECT COUNT(DISTINCT visitor) FROM page_views WHERE ts >= ?) AS visitorsToday,
         (SELECT COUNT(*) FROM page_views WHERE ts >= ?) AS views7d,
         (SELECT COUNT(DISTINCT visitor) FROM page_views WHERE ts >= ?) AS visitors7d,
         (SELECT COUNT(*) FROM page_views) AS viewsTotal`
    )
    .get(
      new Date().setHours(0, 0, 0, 0),
      new Date().setHours(0, 0, 0, 0),
      since(7),
      since(7)
    ) as unknown as {
    viewsToday: number;
    visitorsToday: number;
    views7d: number;
    visitors7d: number;
    viewsTotal: number;
  };

  const viewsPerDay = db
    .prepare(
      `SELECT date(ts / 1000, 'unixepoch') AS day,
              COUNT(*) AS views,
              COUNT(DISTINCT visitor) AS visitors
       FROM page_views WHERE ts >= ?
       GROUP BY day ORDER BY day DESC`
    )
    .all(since(14)) as unknown as {
    day: string;
    views: number;
    visitors: number;
  }[];

  const topPaths = db
    .prepare(
      `SELECT path, COUNT(*) AS views
       FROM page_views WHERE ts >= ?
       GROUP BY path ORDER BY views DESC LIMIT 10`
    )
    .all(since(14)) as unknown as { path: string; views: number }[];

  const topReferrers = db
    .prepare(
      `SELECT referrer, COUNT(*) AS views
       FROM page_views
       WHERE ts >= ? AND referrer IS NOT NULL AND referrer != ''
       GROUP BY referrer ORDER BY views DESC LIMIT 10`
    )
    .all(since(14)) as unknown as { referrer: string; views: number }[];

  return NextResponse.json({
    clicks: { total: clickTotal, last7d: clicks7d, today: clicksToday },
    clicksPerDay,
    tokensPerDay,
    totals: {
      ...totals,
      cost: (totals.tokens / 1_000_000) * costPerMTokens,
    },
    costPerMTokens,
    topUsers: topUsersWithCost,
    visitors,
    viewsPerDay,
    topPaths,
    topReferrers,
  });
}
