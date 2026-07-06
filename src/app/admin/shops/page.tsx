"use client";

// Admin: Affiliate-Shops konfigurieren.
import type { ShopConfig } from "@/lib/settings";
import { useAdminSettings } from "../useSettings";

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

export default function ShopsPage() {
  const { settings, setSettings, save, msg } = useAdminSettings();

  if (!settings) return <p className="text-sm text-ink-soft">Lade …</p>;

  const updateShop = (i: number, patch: Partial<ShopConfig>) => {
    const shops = [...settings.shops];
    shops[i] = { ...shops[i], ...patch };
    setSettings({ ...settings, shops });
  };

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
        <p className="text-xs text-ink-soft">
          Direkt angebundene Shops (z.B. Amazon PartnerNet). AWIN-Partnershops
          mit Produkt-Feed werden automatisch eingebunden – Konfiguration unter
          dem Tab „AWIN“.
        </p>

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
              <label
                key={key}
                className="flex flex-col gap-1 text-xs text-ink-soft"
              >
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
    </div>
  );
}
