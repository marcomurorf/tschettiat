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
      `SELECT day, SUM(tokens) AS tokens,
              SUM(input_tokens) AS inputTokens,
              SUM(output_tokens) AS outputTokens,
              COUNT(DISTINCT user_id) AS users
       FROM usage GROUP BY day ORDER BY day DESC LIMIT 14`
    )
    .all() as unknown as {
    day: string;
    tokens: number;
    inputTokens: number;
    outputTokens: number;
    users: number;
  }[];

  const totals = db
    .prepare(
      `SELECT
         (SELECT COUNT(DISTINCT user_id) FROM chats) AS chatUsers,
         (SELECT COUNT(*) FROM chats) AS chats,
         (SELECT COUNT(*) FROM basket_items) AS basketItems,
         (SELECT COALESCE(SUM(tokens), 0) FROM usage) AS tokens,
         (SELECT COALESCE(SUM(input_tokens), 0) FROM usage) AS inputTokens,
         (SELECT COALESCE(SUM(output_tokens), 0) FROM usage) AS outputTokens`
    )
    .get() as unknown as {
    chatUsers: number;
    chats: number;
    basketItems: number;
    tokens: number;
    inputTokens: number;
    outputTokens: number;
  };

  // Aktivste User (Token, letzte 7 Tage)
  const topUsers = db
    .prepare(
      `SELECT user_id AS userId, SUM(tokens) AS tokens,
              SUM(input_tokens) AS inputTokens,
              SUM(output_tokens) AS outputTokens,
              SUM(bonus_clicks) AS clicks
       FROM usage WHERE day >= date('now', '-7 days')
       GROUP BY user_id ORDER BY tokens DESC LIMIT 10`
    )
    .all() as unknown as {
    userId: string;
    tokens: number;
    inputTokens: number;
    outputTokens: number;
    clicks: number;
  }[];

  // Kosten: getrennte Sätze pro 1 Mio. Input-/Output-Token; für Alt-Daten
  // ohne Aufteilung greift der pauschale Fallback-Satz.
  const settings = await loadSettings();
  const costIn =
    settings.llm.costInPerMTokens ??
    DEFAULT_SETTINGS.llm.costInPerMTokens ??
    0;
  const costOut =
    settings.llm.costOutPerMTokens ??
    DEFAULT_SETTINGS.llm.costOutPerMTokens ??
    0;
  const costFlat = settings.llm.costPerMTokens ?? 4;
  const calcCost = (tokens: number, input: number, output: number): number => {
    const unattributed = Math.max(0, tokens - input - output);
    return (
      (input / 1_000_000) * costIn +
      (output / 1_000_000) * costOut +
      (unattributed / 1_000_000) * costFlat
    );
  };

  // Token gesamt je User (für Gesamtkosten je User)
  const userTotals = db
    .prepare(
      `SELECT user_id AS userId, SUM(tokens) AS tokens,
              SUM(input_tokens) AS inputTokens,
              SUM(output_tokens) AS outputTokens
       FROM usage GROUP BY user_id`
    )
    .all() as unknown as {
    userId: string;
    tokens: number;
    inputTokens: number;
    outputTokens: number;
  }[];
  const totalsByUser = new Map(userTotals.map((u) => [u.userId, u]));

  const topUsersWithCost = topUsers.map((u) => {
    const t = totalsByUser.get(u.userId);
    return {
      ...u,
      cost: calcCost(u.tokens, u.inputTokens, u.outputTokens),
      totalTokens: t?.tokens ?? u.tokens,
      totalCost: t
        ? calcCost(t.tokens, t.inputTokens, t.outputTokens)
        : calcCost(u.tokens, u.inputTokens, u.outputTokens),
    };
  });

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
      cost: calcCost(totals.tokens, totals.inputTokens, totals.outputTokens),
    },
    costInPerMTokens: costIn,
    costOutPerMTokens: costOut,
    topUsers: topUsersWithCost,
    visitors,
    viewsPerDay,
    topPaths,
    topReferrers,
  });
}
