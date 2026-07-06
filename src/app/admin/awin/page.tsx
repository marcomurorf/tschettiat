"use client";

// Admin: AWIN-Konfiguration, Programme, Produkt-Feeds & Index.
import { useCallback, useEffect, useState } from "react";
import { useAdminSettings } from "../useSettings";

interface AwinStatus {
  publisherId: string | null;
  apiTokenSet: boolean;
  feedApiKeySet: boolean;
  index: {
    mid: string;
    merchant: string;
    products: number;
    updatedAt: number;
  }[];
  joined?: {
    id: number;
    name: string;
    displayUrl?: string;
    primaryRegion?: { countryCode: string };
  }[];
  pending?: {
    id: number;
    name: string;
    primaryRegion?: { countryCode: string };
  }[];
  feeds?: {
    advertiserId: string;
    advertiserName: string;
    primaryRegion: string;
    membershipStatus: string;
    feedId: string;
    feedName: string;
    language: string;
    vertical: string;
    lastImported: string;
    productCount: number;
  }[];
  programmesError?: string;
  feedsError?: string;
}

export default function AwinPage() {
  const { settings, setSettings, save, msg: saveMsg } = useAdminSettings();
  const [status, setStatus] = useState<AwinStatus | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [feedFilter, setFeedFilter] = useState("");
  const [onlyActive, setOnlyActive] = useState(true);

  const load = useCallback(() => {
    fetch("/api/admin/awin")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);
  useEffect(load, [load]);

  const run = async (action: string, feedId?: string) => {
    setBusy(action + (feedId ?? ""));
    setMsg("");
    try {
      const r = await fetch("/api/admin/awin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, feedId }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Fehler");
      if (action === "sync-merchants")
        setMsg(`✓ ${j.merchants} Programme synchronisiert`);
      else if (action === "sync-feeds")
        setMsg(
          `✓ Feeds importiert: ${(
            j.results as {
              advertiser: string;
              imported: number;
              error?: string;
            }[]
          )
            .map((x) => `${x.advertiser}: ${x.error ? "Fehler" : x.imported}`)
            .join(", ")}`
        );
      else setMsg(`✓ ${j.imported} Produkte importiert`);
      load();
    } catch (e) {
      setMsg(`✗ ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(null);
    }
  };

  if (!settings) return <p className="text-sm text-ink-soft">Lade …</p>;

  const visibleFeeds = (status?.feeds ?? []).filter((f) => {
    if (onlyActive && f.membershipStatus !== "active") return false;
    if (feedFilter) {
      const q = feedFilter.toLowerCase();
      if (
        !f.advertiserName.toLowerCase().includes(q) &&
        !f.feedName.toLowerCase().includes(q) &&
        !f.vertical.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Konfiguration */}
      <section className="bg-card border border-cream-dark rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Konfiguration</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-ink-soft">{saveMsg}</span>
            <button
              onClick={() => save()}
              className="bg-accent hover:bg-accent-dark text-white rounded-lg px-5 py-2 font-medium transition-colors"
            >
              Speichern
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col gap-1 text-sm w-64">
            Publisher-ID (awinaffid)
            <input
              placeholder="z.B. 363087"
              value={settings.awinPublisherId ?? ""}
              onChange={(e) =>
                setSettings({ ...settings, awinPublisherId: e.target.value })
              }
              className="border border-cream-dark rounded-lg px-3 py-2 bg-white"
            />
            <span className="text-xs text-ink-soft">
              Wird für alle AWIN-Deeplinks verwendet.
            </span>
          </label>
          <label className="flex flex-col gap-1 text-sm w-80">
            Feed-API-Key (Download-Key)
            <input
              placeholder="aus AWIN: Toolbox → Create-a-Feed"
              value={settings.awinFeedApiKey ?? ""}
              onChange={(e) =>
                setSettings({ ...settings, awinFeedApiKey: e.target.value })
              }
              className="border border-cream-dark rounded-lg px-3 py-2 bg-white font-mono"
            />
            <span className="text-xs text-ink-soft">
              Nötig für den Produkt-Feed-Import (unten).
            </span>
          </label>
        </div>
        {status && (
          <div className="flex flex-wrap gap-6 text-sm border-t border-cream-dark pt-4">
            <div>
              Management-API-Token:{" "}
              {status.apiTokenSet ? (
                <span className="text-green-700">✓ gesetzt (Env)</span>
              ) : (
                <span className="text-accent">✗ AWIN_API_TOKEN fehlt</span>
              )}
            </div>
            <div>
              Feed-Key:{" "}
              {status.feedApiKeySet ? (
                <span className="text-green-700">✓ gesetzt</span>
              ) : (
                <span className="text-accent">✗ fehlt</span>
              )}
            </div>
            <div>Publisher-ID: {status.publisherId ?? "—"}</div>
          </div>
        )}
      </section>

      {/* Programme */}
      <section className="bg-card border border-cream-dark rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Partnerprogramme</h2>
          <button
            onClick={() => run("sync-merchants")}
            disabled={!!busy || !status?.apiTokenSet}
            className="text-sm border border-cream-dark rounded-lg px-3 py-1.5 hover:border-accent hover:text-accent transition-colors disabled:opacity-40"
          >
            {busy === "sync-merchants" ? "…" : "Programme syncen"}
          </button>
        </div>
        {msg && <p className="text-sm text-ink-soft">{msg}</p>}
        {!status ? (
          <p className="text-sm text-ink-soft">Lade …</p>
        ) : (
          <>
            <div>
              <h3 className="font-medium text-sm mb-1">
                Bestätigt ({status.joined?.length ?? 0})
              </h3>
              {!status.joined || status.joined.length === 0 ? (
                <p className="text-sm text-ink-soft">
                  Noch keine – sobald ein Advertiser dich bestätigt, hier
                  „Programme syncen“ klicken.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {status.joined.map((p) => (
                    <span
                      key={p.id}
                      className="text-sm border border-cream-dark rounded-full px-3 py-1"
                    >
                      {p.name}{" "}
                      <span className="text-ink-soft">
                        ({p.primaryRegion?.countryCode ?? "?"} · {p.id})
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
            {status.pending && status.pending.length > 0 && (
              <div>
                <h3 className="font-medium text-sm mb-1">
                  Ausstehende Bewerbungen ({status.pending.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {status.pending.map((p) => (
                    <span
                      key={p.id}
                      className="text-sm border border-cream-dark border-dashed rounded-full px-3 py-1 text-ink-soft"
                    >
                      {p.name} ({p.primaryRegion?.countryCode ?? "?"})
                    </span>
                  ))}
                </div>
              </div>
            )}
            {status.programmesError && (
              <p className="text-xs text-accent">{status.programmesError}</p>
            )}
          </>
        )}
      </section>

      {/* Feeds */}
      <section className="bg-card border border-cream-dark rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Produkt-Feeds</h2>
          <button
            onClick={() => run("sync-feeds")}
            disabled={!!busy || !status?.feedApiKeySet}
            className="text-sm border border-cream-dark rounded-lg px-3 py-1.5 hover:border-accent hover:text-accent transition-colors disabled:opacity-40"
          >
            {busy === "sync-feeds" ? "Importiere …" : "Alle Feeds importieren"}
          </button>
        </div>
        <p className="text-xs text-ink-soft">
          „Alle Feeds importieren“ nimmt pro Advertiser einen Feed (Deutsch
          bevorzugt). Einzelne Feeds lassen sich unten gezielt importieren.
        </p>
        <div className="flex items-center gap-4 flex-wrap">
          <input
            placeholder="Feeds durchsuchen …"
            value={feedFilter}
            onChange={(e) => setFeedFilter(e.target.value)}
            className="border border-cream-dark rounded-lg px-3 py-1.5 text-sm w-64"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={onlyActive}
              onChange={(e) => setOnlyActive(e.target.checked)}
            />
            nur aktive Programme
          </label>
          {status?.feeds && (
            <span className="text-xs text-ink-soft">
              {visibleFeeds.length} von {status.feeds.length} Feeds
            </span>
          )}
        </div>
        {!status?.feeds || status.feeds.length === 0 ? (
          <p className="text-sm text-ink-soft">
            {status?.feedsError ?? "Keine Feeds verfügbar."}
          </p>
        ) : visibleFeeds.length === 0 ? (
          <p className="text-sm text-ink-soft">Kein Feed passt zum Filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-ink-soft border-b border-cream-dark">
                  <th className="text-left font-normal py-1.5">Advertiser</th>
                  <th className="text-left font-normal py-1.5">Feed</th>
                  <th className="text-left font-normal py-1.5">Sprache</th>
                  <th className="text-left font-normal py-1.5">Region</th>
                  <th className="text-left font-normal py-1.5">Status</th>
                  <th className="text-right font-normal py-1.5">Produkte</th>
                  <th className="py-1.5" />
                </tr>
              </thead>
              <tbody>
                {visibleFeeds.slice(0, 100).map((f) => (
                  <tr key={f.feedId} className="border-b border-cream-dark">
                    <td className="py-1.5 font-medium">{f.advertiserName}</td>
                    <td className="py-1.5 text-ink-soft">
                      {f.feedName || f.feedId}
                    </td>
                    <td className="py-1.5">{f.language}</td>
                    <td className="py-1.5">{f.primaryRegion}</td>
                    <td className="py-1.5">
                      <span
                        className={`text-xs rounded-full px-2 py-0.5 ${
                          f.membershipStatus === "active"
                            ? "bg-accent-soft text-accent-dark"
                            : "bg-cream text-ink-soft"
                        }`}
                      >
                        {f.membershipStatus}
                      </span>
                    </td>
                    <td className="py-1.5 text-right">
                      {f.productCount.toLocaleString("de-AT")}
                    </td>
                    <td className="py-1.5 text-right pl-2">
                      <button
                        onClick={() => run("import-feed", f.feedId)}
                        disabled={!!busy}
                        className="text-xs border border-cream-dark rounded px-2 py-1 hover:border-accent hover:text-accent transition-colors disabled:opacity-40"
                      >
                        {busy === "import-feed" + f.feedId
                          ? "…"
                          : "Importieren"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Produkt-Index */}
      <section className="bg-card border border-cream-dark rounded-2xl p-6 space-y-3">
        <h2 className="font-semibold text-lg">Produkt-Index</h2>
        {!status || status.index.length === 0 ? (
          <p className="text-sm text-ink-soft">
            Noch leer – Feed-Key eintragen, speichern und „Alle Feeds
            importieren“ klicken.
          </p>
        ) : (
          <table className="w-full text-sm max-w-lg">
            <thead>
              <tr className="text-xs text-ink-soft border-b border-cream-dark">
                <th className="text-left font-normal py-1.5">Merchant</th>
                <th className="text-right font-normal py-1.5">Produkte</th>
                <th className="text-right font-normal py-1.5">Stand</th>
              </tr>
            </thead>
            <tbody>
              {status.index.map((x) => (
                <tr key={x.mid} className="border-b border-cream-dark">
                  <td className="py-1.5">{x.merchant || x.mid}</td>
                  <td className="py-1.5 text-right">
                    {x.products.toLocaleString("de-AT")}
                  </td>
                  <td className="py-1.5 text-right text-ink-soft">
                    {new Date(x.updatedAt).toLocaleDateString("de-AT")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
