// Admin-API: AWIN-Status und Sync (geschützt durch proxy.ts).
// GET  → Programme (joined/pending), Feed-Liste, Produkt-Index-Statistik
// POST → { action: "sync-merchants" | "sync-feeds" | "import-feed", feedId? }
import { NextRequest, NextResponse } from "next/server";
import { loadSettings } from "@/lib/settings";
import {
  listProgrammes,
  listFeeds,
  syncMerchants,
  syncAllFeeds,
  importFeed,
  productIndexStats,
} from "@/lib/awin";

export const maxDuration = 300;

export async function GET() {
  const settings = await loadSettings();
  const pubId = settings.awinPublisherId;
  const out: Record<string, unknown> = {
    publisherId: pubId ?? null,
    apiTokenSet: Boolean(process.env.AWIN_API_TOKEN),
    feedApiKeySet: Boolean(settings.awinFeedApiKey),
    index: productIndexStats(),
  };
  if (pubId && process.env.AWIN_API_TOKEN) {
    try {
      const [joined, pending] = await Promise.all([
        listProgrammes(pubId, "joined"),
        listProgrammes(pubId, "pending"),
      ]);
      out.joined = joined;
      out.pending = pending;
    } catch (e) {
      out.programmesError = e instanceof Error ? e.message : String(e);
    }
  }
  if (settings.awinFeedApiKey) {
    try {
      out.feeds = await listFeeds(settings.awinFeedApiKey);
    } catch (e) {
      out.feedsError = e instanceof Error ? e.message : String(e);
    }
  }
  return NextResponse.json(out);
}

export async function POST(req: NextRequest) {
  const { action, feedId } = (await req.json()) as {
    action?: string;
    feedId?: string;
  };
  try {
    if (action === "sync-merchants") {
      const joined = await syncMerchants();
      return NextResponse.json({ ok: true, merchants: joined.length });
    }
    if (action === "sync-feeds") {
      const results = await syncAllFeeds();
      return NextResponse.json({ ok: true, results });
    }
    if (action === "import-feed" && feedId) {
      const settings = await loadSettings();
      if (!settings.awinFeedApiKey) {
        return NextResponse.json(
          { error: "Feed-API-Key fehlt" },
          { status: 400 }
        );
      }
      const feeds = await listFeeds(settings.awinFeedApiKey);
      const feed = feeds.find((f) => f.feedId === feedId);
      if (!feed) {
        return NextResponse.json({ error: "Feed nicht gefunden" }, { status: 404 });
      }
      const { imported } = await importFeed(settings.awinFeedApiKey, feed);
      return NextResponse.json({ ok: true, imported });
    }
    return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
