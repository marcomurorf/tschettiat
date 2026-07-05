"use client";

import { useEffect, useState } from "react";
import type { Settings, ShopConfig } from "@/lib/settings";

const MODELS: Record<string, string[]> = {
  azure: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini"],
  google: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"],
};

const EMPTY_SHOP: ShopConfig = {
  id: "",
  name: "",
  enabled: true,
  domain: "",
  tag: "",
  searchUrl: "",
  productUrl: "",
  imageUrl: "",
};

export default function AdminPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then(setSettings);
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
