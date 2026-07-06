"use client";

import { useEffect, useState } from "react";
import type { Settings, ShopConfig } from "@/lib/settings";

const MODELS: Record<string, string[]> = {
  azure: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini"],
  google: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"],
};

interface Stats {
  clicks: { total: number; last7d: number; today: number };
  clicksPerDay: { day: string; clicks: number }[];
  tokensPerDay: { day: string; tokens: number; users: number }[];
  totals: { chatUsers: number; chats: number; basketItems: number; tokens: number };
  topUsers: { userId: string; tokens: number; clicks: number }[];
}

const EMPTY_SHOP: ShopConfig = {
  id: "",
  name: "",
  enabled: true,
  domain: "",
  tag: "",
  searchUrl: "",
  productUrl: "",
  imageUrl: "",
  country: "",
  network: "direct",
  awinMid: "",
  description: "",
};

export default function AdminPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then(setSettings);
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  if (!settings) return <main className="p-8">Lade …</main>;

  const save = async () => {
    setMsg("Speichere …");
    const r = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setMsg(r.ok ? "✓ Gespeichert" : "✗ Fehler beim Speichern");
    setTimeout(() => setMsg(""), 3000);
  };

  const updateShop = (i: number, patch: Partial<ShopConfig>) => {
    const shops = [...settings.shops];
    shops[i] = { ...shops[i], ...patch };
    setSettings({ ...settings, shops });
  };

  return (
    <main className="max-w-3xl mx-auto p-8 space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          tschetti<span className="text-accent">.at</span> · Admin
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-ink-soft">{msg}</span>
          <button
            onClick={save}
            className="bg-accent hover:bg-accent-dark text-white rounded-lg px-5 py-2 font-medium transition-colors"
          >
            Speichern
          </button>
        </div>
      </header>

      {/* Statistiken */}
      <section className="bg-card border border-cream-dark rounded-2xl p-6 space-y-5">
        <h2 className="font-semibold text-lg">Statistiken</h2>
        {!stats ? (
          <p className="text-sm text-ink-soft">Lade …</p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(
                [
                  ["Klicks heute", stats.clicks.today],
                  ["Klicks 7 Tage", stats.clicks.last7d],
                  ["Klicks gesamt", stats.clicks.total],
                  ["Token gesamt", stats.totals.tokens.toLocaleString("de-AT")],
                  ["User (mit Chats)", stats.totals.chatUsers],
                  ["Chats", stats.totals.chats],
                  ["Korb-Artikel", stats.totals.basketItems],
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
                  Aktivste User (7 Tage)
                </h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-ink-soft">
                      <th className="text-left font-normal">User</th>
                      <th className="text-right font-normal">Token</th>
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
                        <td className="py-1 text-right">{u.clicks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      {/* LLM */}
      <section className="bg-card border border-cream-dark rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold text-lg">LLM</h2>
        <div className="flex gap-4 flex-wrap">
          <label className="flex flex-col gap-1 text-sm">
            Provider
            <select
              value={settings.llm.provider}
              onChange={(e) => {
                const provider = e.target.value as "azure" | "google";
                setSettings({
                  ...settings,
                  llm: { provider, model: MODELS[provider][0] },
                });
              }}
              className="border border-cream-dark rounded-lg px-3 py-2 bg-white"
            >
              <option value="azure">Azure OpenAI</option>
              <option value="google">Google Gemini</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Modell{" "}
            {settings.llm.provider === "azure" && (
              <span className="text-ink-soft">(= Deployment-Name)</span>
            )}
            <input
              list="model-list"
              value={settings.llm.model}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  llm: { ...settings.llm, model: e.target.value },
                })
              }
              className="border border-cream-dark rounded-lg px-3 py-2 bg-white w-56"
            />
            <datalist id="model-list">
              {MODELS[settings.llm.provider].map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </label>
        </div>
        <p className="text-xs text-ink-soft">
          API-Keys liegen in der .env auf dem Server (AZURE_OPENAI_*,
          GOOGLE_GENERATIVE_AI_API_KEY).
        </p>
      </section>

      {/* Limits */}
      <section className="bg-card border border-cream-dark rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold text-lg">Limits</h2>
        <div className="flex gap-4 flex-wrap">
          <label className="flex flex-col gap-1 text-sm w-52">
            Token pro User & Tag
            <input
              type="number"
              min={1000}
              step={1000}
              value={settings.limits?.tokensPerDay ?? 60000}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  limits: {
                    ...settings.limits,
                    tokensPerDay: Number(e.target.value) || 60000,
                  },
                })
              }
              className="border border-cream-dark rounded-lg px-3 py-2 bg-white"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm w-52">
            Bonus-Token je Partnerlink-Klick
            <input
              type="number"
              min={0}
              step={1000}
              value={settings.limits?.clickBonusTokens ?? 5000}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  limits: {
                    ...settings.limits,
                    clickBonusTokens: Number(e.target.value) || 0,
                  },
                })
              }
              className="border border-cream-dark rounded-lg px-3 py-2 bg-white"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm w-52">
            Max. belohnte Klicks pro Tag
            <input
              type="number"
              min={0}
              step={1}
              value={settings.limits?.clickBonusMaxPerDay ?? 6}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  limits: {
                    ...settings.limits,
                    clickBonusMaxPerDay: Number(e.target.value) || 0,
                  },
                })
              }
              className="border border-cream-dark rounded-lg px-3 py-2 bg-white"
            />
          </label>
        </div>
        <p className="text-xs text-ink-soft">
          Klicks auf Partnerlinks erhöhen das Tagesbudget still im
          Hintergrund. 60.000 Token/Tag ≈ 40-60 Anfragen.
        </p>
      </section>

      {/* Shops */}
      <section className="bg-card border border-cream-dark rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Affiliate-Shops</h2>
          <button
            onClick={() =>
              setSettings({
                ...settings,
                shops: [...settings.shops, { ...EMPTY_SHOP }],
              })
            }
            className="text-sm border border-cream-dark rounded-lg px-3 py-1.5 hover:border-accent hover:text-accent transition-colors"
          >
            + Shop hinzufügen
          </button>
        </div>

        <label className="flex flex-col gap-1 text-sm w-64">
          AWIN Publisher-ID (awinaffid)
          <input
            placeholder="z.B. 123456"
            value={settings.awinPublisherId ?? ""}
            onChange={(e) =>
              setSettings({ ...settings, awinPublisherId: e.target.value })
            }
            className="border border-cream-dark rounded-lg px-3 py-2 bg-white"
          />
          <span className="text-xs text-ink-soft">
            Wird für Deeplinks aller Shops mit Netzwerk „AWIN“ verwendet.
          </span>
        </label>

        {settings.shops.map((shop, i) => (
          <div
            key={i}
            className="border border-cream-dark rounded-xl p-4 space-y-3"
          >
            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={shop.enabled}
                  onChange={(e) => updateShop(i, { enabled: e.target.checked })}
                />
                aktiv
              </label>
              <input
                placeholder="ID (z.B. amazon)"
                value={shop.id}
                onChange={(e) => updateShop(i, { id: e.target.value })}
                className="border border-cream-dark rounded-lg px-3 py-1.5 text-sm w-36"
              />
              <input
                placeholder="Name"
                value={shop.name}
                onChange={(e) => updateShop(i, { name: e.target.value })}
                className="border border-cream-dark rounded-lg px-3 py-1.5 text-sm w-36"
              />
              <input
                placeholder="Affiliate-Tag"
                value={shop.tag}
                onChange={(e) => updateShop(i, { tag: e.target.value })}
                className="border border-cream-dark rounded-lg px-3 py-1.5 text-sm w-44"
              />
              <input
                placeholder="Land (AT/DE)"
                value={shop.country ?? ""}
                maxLength={2}
                onChange={(e) =>
                  updateShop(i, { country: e.target.value.toUpperCase() })
                }
                className="border border-cream-dark rounded-lg px-3 py-1.5 text-sm w-24 uppercase"
              />
              {shop.country === "AT" && (
                <span className="text-xs bg-accent-soft text-accent-dark font-semibold rounded-full px-2 py-0.5">
                  🇦🇹 AT
                </span>
              )}
              <select
                value={shop.network ?? "direct"}
                onChange={(e) =>
                  updateShop(i, {
                    network: e.target.value as ShopConfig["network"],
                  })
                }
                className="border border-cream-dark rounded-lg px-2 py-1.5 text-sm bg-white"
              >
                <option value="direct">Direkt</option>
                <option value="awin">AWIN</option>
              </select>
              {shop.network === "awin" && (
                <input
                  placeholder="AWIN Advertiser-ID"
                  value={shop.awinMid ?? ""}
                  onChange={(e) => updateShop(i, { awinMid: e.target.value })}
                  className="border border-cream-dark rounded-lg px-3 py-1.5 text-sm w-40"
                />
              )}
              <button
                onClick={() =>
                  setSettings({
                    ...settings,
                    shops: settings.shops.filter((_, j) => j !== i),
                  })
                }
                className="ml-auto text-sm text-ink-soft hover:text-accent"
              >
                Entfernen
              </button>
            </div>
            {(
              [
                ["searchUrl", "Such-URL ({q}, {tag})"],
                ["productUrl", "Produkt-URL ({id}, {tag})"],
                ["imageUrl", "Bild-URL ({id}) – optional"],
                ["description", "Sortiment-Beschreibung fürs LLM – optional"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex flex-col gap-1 text-xs text-ink-soft">
                {label}
                <input
                  value={shop[key] || ""}
                  onChange={(e) => updateShop(i, { [key]: e.target.value })}
                  className="border border-cream-dark rounded-lg px-3 py-1.5 text-sm font-mono text-ink"
                />
              </label>
            ))}
          </div>
        ))}
      </section>
    </main>
  );
}
