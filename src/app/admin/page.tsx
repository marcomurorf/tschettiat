"use client";

// Admin-Dashboard: Statistiken.
import { useEffect, useState } from "react";

interface Stats {
  clicks: { total: number; last7d: number; today: number };
  clicksPerDay: { day: string; clicks: number }[];
  tokensPerDay: { day: string; tokens: number; users: number }[];
  totals: {
    chatUsers: number;
    chats: number;
    basketItems: number;
    tokens: number;
    cost: number;
  };
  costPerMTokens: number;
  topUsers: {
    userId: string;
    tokens: number;
    clicks: number;
    cost: number;
    totalTokens: number;
    totalCost: number;
  }[];
  visitors: {
    viewsToday: number;
    visitorsToday: number;
    views7d: number;
    visitors7d: number;
    viewsTotal: number;
  };
  viewsPerDay: { day: string; views: number; visitors: number }[];
  topPaths: { path: string; views: number }[];
  topReferrers: { referrer: string; views: number }[];
}

function euro(n: number): string {
  return n.toLocaleString("de-AT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  return (
    <section className="bg-card border border-cream-dark rounded-2xl p-6 space-y-5">
      <h2 className="font-semibold text-lg">Statistiken</h2>
      {!stats ? (
        <p className="text-sm text-ink-soft">Lade …</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(
              [
                ["Besucher heute", stats.visitors?.visitorsToday ?? 0],
                ["Besucher 7 Tage", stats.visitors?.visitors7d ?? 0],
                ["Klicks heute", stats.clicks.today],
                ["Klicks gesamt", stats.clicks.total],
                ["Token gesamt", stats.totals.tokens.toLocaleString("de-AT")],
                ["Kosten gesamt", euro(stats.totals.cost ?? 0)],
                ["User (mit Chats)", stats.totals.chatUsers],
                ["Chats", stats.totals.chats],
              ] as const
            ).map(([label, value]) => (
              <div
                key={label}
                className="border border-cream-dark rounded-xl p-3 text-center"
              >
                <div className="text-xl font-semibold">{value}</div>
                <div className="text-xs text-ink-soft">{label}</div>
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium mb-2">
                Partnerlink-Klicks (14 Tage)
              </h3>
              {stats.clicksPerDay.length === 0 ? (
                <p className="text-xs text-ink-soft">Noch keine Klicks.</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {stats.clicksPerDay.map((r) => (
                      <tr key={r.day} className="border-b border-cream-dark">
                        <td className="py-1">{r.day}</td>
                        <td className="py-1 text-right font-medium">
                          {r.clicks}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2">
                Token-Verbrauch (14 Tage)
              </h3>
              {stats.tokensPerDay.length === 0 ? (
                <p className="text-xs text-ink-soft">Noch kein Verbrauch.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-ink-soft">
                      <th className="text-left font-normal">Tag</th>
                      <th className="text-right font-normal">Token</th>
                      <th className="text-right font-normal">User</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.tokensPerDay.map((r) => (
                      <tr key={r.day} className="border-b border-cream-dark">
                        <td className="py-1">{r.day}</td>
                        <td className="py-1 text-right font-medium">
                          {r.tokens.toLocaleString("de-AT")}
                        </td>
                        <td className="py-1 text-right">{r.users}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {stats.topUsers.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">
                Aktivste User (7 Tage) · Kosten bei{" "}
                {euro(stats.costPerMTokens ?? 0)} / 1 Mio. Token
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-ink-soft">
                    <th className="text-left font-normal">User</th>
                    <th className="text-right font-normal">Token (7 T)</th>
                    <th className="text-right font-normal">Kosten (7 T)</th>
                    <th className="text-right font-normal">Kosten gesamt</th>
                    <th className="text-right font-normal">Bonus-Klicks</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topUsers.map((u) => (
                    <tr key={u.userId} className="border-b border-cream-dark">
                      <td className="py-1 truncate max-w-48">{u.userId}</td>
                      <td className="py-1 text-right font-medium">
                        {u.tokens.toLocaleString("de-AT")}
                      </td>
                      <td className="py-1 text-right">{euro(u.cost ?? 0)}</td>
                      <td className="py-1 text-right">
                        {euro(u.totalCost ?? 0)}
                      </td>
                      <td className="py-1 text-right">{u.clicks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Besucher-Statistik */}
          <div className="pt-2 border-t border-cream-dark space-y-5">
            <h2 className="font-semibold text-lg">Besucher (cookielos)</h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {(
                [
                  ["Aufrufe heute", stats.visitors?.viewsToday ?? 0],
                  ["Besucher heute", stats.visitors?.visitorsToday ?? 0],
                  ["Aufrufe 7 Tage", stats.visitors?.views7d ?? 0],
                  ["Besucher 7 Tage", stats.visitors?.visitors7d ?? 0],
                  ["Aufrufe gesamt", stats.visitors?.viewsTotal ?? 0],
                ] as const
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="border border-cream-dark rounded-xl p-3 text-center"
                >
                  <div className="text-xl font-semibold">{value}</div>
                  <div className="text-xs text-ink-soft">{label}</div>
                </div>
              ))}
            </div>

            <div className="grid sm:grid-cols-3 gap-6">
              <div>
                <h3 className="text-sm font-medium mb-2">
                  Aufrufe pro Tag (14 Tage)
                </h3>
                {(stats.viewsPerDay ?? []).length === 0 ? (
                  <p className="text-xs text-ink-soft">Noch keine Daten.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-ink-soft">
                        <th className="text-left font-normal">Tag</th>
                        <th className="text-right font-normal">Aufrufe</th>
                        <th className="text-right font-normal">Besucher</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.viewsPerDay.map((r) => (
                        <tr key={r.day} className="border-b border-cream-dark">
                          <td className="py-1">{r.day}</td>
                          <td className="py-1 text-right font-medium">
                            {r.views}
                          </td>
                          <td className="py-1 text-right">{r.visitors}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">
                  Top-Seiten (14 Tage)
                </h3>
                {(stats.topPaths ?? []).length === 0 ? (
                  <p className="text-xs text-ink-soft">Noch keine Daten.</p>
                ) : (
                  <table className="w-full text-sm">
                    <tbody>
                      {stats.topPaths.map((r) => (
                        <tr key={r.path} className="border-b border-cream-dark">
                          <td className="py-1 truncate max-w-40">{r.path}</td>
                          <td className="py-1 text-right font-medium">
                            {r.views}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">
                  Herkunft / Referrer (14 Tage)
                </h3>
                {(stats.topReferrers ?? []).length === 0 ? (
                  <p className="text-xs text-ink-soft">
                    Noch keine externen Referrer.
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <tbody>
                      {stats.topReferrers.map((r) => (
                        <tr
                          key={r.referrer}
                          className="border-b border-cream-dark"
                        >
                          <td className="py-1 truncate max-w-40">
                            {r.referrer}
                          </td>
                          <td className="py-1 text-right font-medium">
                            {r.views}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
