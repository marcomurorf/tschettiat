"use client";

// Admin: LLM-Provider/Modell und Nutzungs-Limits.
import { useAdminSettings } from "../useSettings";

const MODELS: Record<string, string[]> = {
  azure: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini"],
  google: [
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
  ],
};

export default function LlmPage() {
  const { settings, setSettings, save, msg } = useAdminSettings();

  if (!settings) return <p className="text-sm text-ink-soft">Lade …</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-3">
        <span className="text-sm text-ink-soft">{msg}</span>
        <button
          onClick={() => save()}
          className="bg-accent hover:bg-accent-dark text-white rounded-lg px-5 py-2 font-medium transition-colors"
        >
          Speichern
        </button>
      </div>

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
          <label className="flex flex-col gap-1 text-sm w-52">
            Input € / 1 Mio. Token
            <input
              type="number"
              min={0}
              step={0.1}
              value={settings.llm.costInPerMTokens ?? 2.5}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  llm: {
                    ...settings.llm,
                    costInPerMTokens: Number(e.target.value) || 0,
                  },
                })
              }
              className="border border-cream-dark rounded-lg px-3 py-2 bg-white"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm w-52">
            Output € / 1 Mio. Token
            <input
              type="number"
              min={0}
              step={0.1}
              value={settings.llm.costOutPerMTokens ?? 10}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  llm: {
                    ...settings.llm,
                    costOutPerMTokens: Number(e.target.value) || 0,
                  },
                })
              }
              className="border border-cream-dark rounded-lg px-3 py-2 bg-white"
            />
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
        <label className="flex flex-col gap-1 text-sm">
          Vom Tageslimit ausgenommen (E-Mails, kommagetrennt)
          <input
            type="text"
            placeholder="z. B. mursteiner@gmail.com, chef@example.com"
            value={(settings.limits?.unlimitedUsers ?? []).join(", ")}
            onChange={(e) =>
              setSettings({
                ...settings,
                limits: {
                  ...settings.limits,
                  unlimitedUsers: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                },
              })
            }
            className="border border-cream-dark rounded-lg px-3 py-2 bg-white"
          />
        </label>
        <p className="text-xs text-ink-soft">
          Klicks auf Partnerlinks erhöhen das Tagesbudget still im Hintergrund.
          60.000 Token/Tag ≈ 40-60 Anfragen.
        </p>
      </section>

      {/* Features */}
      <section className="bg-card border border-cream-dark rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold text-lg">Features</h2>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={settings.features?.travel ?? false}
            onChange={(e) =>
              setSettings({
                ...settings,
                features: { ...settings.features, travel: e.target.checked },
              })
            }
            className="w-4 h-4 accent-[#d95d39]"
          />
          Reiseplanung (Flüge &amp; Hotels) im Chat aktivieren
        </label>
        <p className="text-xs text-ink-soft">
          Ausgeschaltet: Tschetti bleibt reiner Produkt-Assistent, die
          Reise-Tools werden dem LLM gar nicht erst angeboten.
        </p>
      </section>

      {/* Credits & Empfehlungen */}
      <section className="bg-card border border-cream-dark rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold text-lg">Credits &amp; Empfehlungen</h2>
        <label className="flex flex-col gap-1 text-sm w-64">
          Bonus-Token je geworbenem Nutzer
          <input
            type="number"
            min={0}
            step={10000}
            value={settings.limits?.referralBonusTokens ?? 100000}
            onChange={(e) =>
              setSettings({
                ...settings,
                limits: {
                  ...settings.limits,
                  referralBonusTokens: Number(e.target.value) || 0,
                },
              })
            }
            className="border border-cream-dark rounded-lg px-3 py-2 bg-white"
          />
        </label>
        <div className="space-y-2">
          <p className="text-sm font-medium">Kaufbare Token-Pakete (Stripe)</p>
          {(settings.creditPackages ?? []).map((pkg, i) => (
            <div key={pkg.id} className="flex gap-3 flex-wrap items-end">
              <label className="flex flex-col gap-1 text-xs w-32">
                Name
                <input
                  value={pkg.name}
                  onChange={(e) => {
                    const pkgs = [...(settings.creditPackages ?? [])];
                    pkgs[i] = { ...pkg, name: e.target.value };
                    setSettings({ ...settings, creditPackages: pkgs });
                  }}
                  className="border border-cream-dark rounded-lg px-2 py-1.5 bg-white text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs w-36">
                Tokens
                <input
                  type="number"
                  min={1000}
                  step={50000}
                  value={pkg.tokens}
                  onChange={(e) => {
                    const pkgs = [...(settings.creditPackages ?? [])];
                    pkgs[i] = { ...pkg, tokens: Number(e.target.value) || 0 };
                    setSettings({ ...settings, creditPackages: pkgs });
                  }}
                  className="border border-cream-dark rounded-lg px-2 py-1.5 bg-white text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs w-28">
                Preis (Cent)
                <input
                  type="number"
                  min={50}
                  step={50}
                  value={pkg.priceCents}
                  onChange={(e) => {
                    const pkgs = [...(settings.creditPackages ?? [])];
                    pkgs[i] = {
                      ...pkg,
                      priceCents: Number(e.target.value) || 0,
                    };
                    setSettings({ ...settings, creditPackages: pkgs });
                  }}
                  className="border border-cream-dark rounded-lg px-2 py-1.5 bg-white text-sm"
                />
              </label>
              <span className="text-xs text-ink-soft pb-2">
                = {(pkg.priceCents / 100).toFixed(2).replace(".", ",")} €
              </span>
            </div>
          ))}
        </div>
        <p className="text-xs text-ink-soft">
          Credits verfallen nicht und greifen erst, wenn das Tagesbudget
          aufgebraucht ist. Stripe-Keys liegen in der .env (STRIPE_SECRET_KEY,
          STRIPE_WEBHOOK_SECRET).
        </p>
      </section>
    </div>
  );
}
