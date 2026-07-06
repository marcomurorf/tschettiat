"use client";

// Admin: LLM-Provider/Modell und Nutzungs-Limits.
import { useAdminSettings } from "../useSettings";

const MODELS: Record<string, string[]> = {
  azure: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini"],
  google: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"],
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
            Kosten € / 1 Mio. Token
            <input
              type="number"
              min={0}
              step={0.1}
              value={settings.llm.costPerMTokens ?? 4}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  llm: {
                    ...settings.llm,
                    costPerMTokens: Number(e.target.value) || 0,
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
        <p className="text-xs text-ink-soft">
          Klicks auf Partnerlinks erhöhen das Tagesbudget still im Hintergrund.
          60.000 Token/Tag ≈ 40-60 Anfragen.
        </p>
      </section>
    </div>
  );
}
