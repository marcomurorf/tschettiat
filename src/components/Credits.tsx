"use client";

// Guthaben-Menü in der Toolbar: heutiges Restbudget, Credits,
// Weiterempfehlungs-Link und Stripe-Kauf von Token-Paketen.
import { useEffect, useRef, useState } from "react";

interface CreditInfo {
  credits: number;
  remainingToday: number | null;
  unlimited: boolean;
  refLink: string;
  referralBonusTokens: number;
  packages: { id: string; name: string; tokens: number; priceCents: number }[];
  stripeEnabled: boolean;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",").replace(",0", "")} Mio.`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(n);
}

export function Credits() {
  const [info, setInfo] = useState<CreditInfo | null>(null);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/credits");
      if (res.ok) setInfo(await res.json());
    } catch {
      // nicht kritisch
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Klick außerhalb schließt das Menü
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const copyRefLink = async () => {
    if (!info) return;
    try {
      await navigator.clipboard.writeText(info.refLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: Link markierbar anzeigen (unten sichtbar)
    }
  };

  const buy = async (packageId: string) => {
    setBuying(packageId);
    try {
      const res = await fetch("/api/credits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId }),
      });
      const data = await res.json();
      if (res.ok && data.url) window.location.href = data.url;
    } finally {
      setBuying(null);
    }
  };

  if (!info) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          setOpen((o) => !o);
          if (!open) load();
        }}
        className="flex items-center gap-1.5 text-sm text-ink-soft bg-card border border-cream-dark rounded-full px-3 py-1.5 hover:border-accent hover:text-accent transition-colors"
        aria-label="Guthaben anzeigen"
      >
        <span aria-hidden>⚡</span>
        <span className="hidden sm:inline">
          {info.unlimited
            ? "Unbegrenzt"
            : fmt((info.remainingToday ?? 0))}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-cream-dark rounded-2xl shadow-xl p-4 z-40 space-y-4">
          <div>
            <p className="text-sm font-semibold mb-1">Dein Guthaben</p>
            {info.unlimited ? (
              <p className="text-sm text-ink-soft">
                Dein Konto ist unbegrenzt – viel Spaß!
              </p>
            ) : (
              <div className="text-sm text-ink-soft space-y-0.5">
                <p>
                  Heute verfügbar:{" "}
                  <span className="font-medium text-ink">
                    {fmt(info.remainingToday ?? 0)} Tokens
                  </span>
                </p>
                <p>
                  Davon Credits:{" "}
                  <span className="font-medium text-ink">
                    {fmt(info.credits)} Tokens
                  </span>{" "}
                  <span className="text-xs">(verfallen nicht)</span>
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-cream-dark pt-3">
            <p className="text-sm font-semibold mb-1">
              Freunde einladen · +{fmt(info.referralBonusTokens)} Tokens
            </p>
            <p className="text-xs text-ink-soft mb-2">
              Für jede Anmeldung über deinen Link bekommst du Credits
              gutgeschrieben.
            </p>
            <div className="flex gap-2">
              <input
                readOnly
                value={info.refLink}
                onFocus={(e) => e.target.select()}
                className="flex-1 min-w-0 text-xs border border-cream-dark rounded-lg px-2 py-1.5 bg-cream/50 text-ink-soft"
              />
              <button
                onClick={copyRefLink}
                className="text-xs bg-ink text-cream rounded-lg px-3 py-1.5 hover:bg-ink/85 transition-colors shrink-0"
              >
                {copied ? "✓ Kopiert" : "Kopieren"}
              </button>
            </div>
          </div>

          <div className="border-t border-cream-dark pt-3">
            <a
              href="/konto"
              className="block text-sm text-center text-ink-soft hover:text-accent transition-colors"
            >
              Mein Konto: Guthaben, Einladungen &amp; Kauf →
            </a>
          </div>

          {info.stripeEnabled && info.packages.length > 0 && (
            <div className="border-t border-cream-dark pt-3">
              <p className="text-sm font-semibold mb-2">Credits kaufen</p>
              <div className="space-y-1.5">
                {info.packages.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => buy(p.id)}
                    disabled={buying !== null}
                    className="w-full flex items-center justify-between text-sm border border-cream-dark rounded-lg px-3 py-2 hover:border-accent transition-colors disabled:opacity-50"
                  >
                    <span>
                      <span className="font-medium">{p.name}</span>{" "}
                      <span className="text-ink-soft text-xs">
                        {fmt(p.tokens)} Tokens
                      </span>
                    </span>
                    <span className="font-medium text-accent">
                      {buying === p.id
                        ? "…"
                        : `${(p.priceCents / 100).toFixed(2).replace(".", ",")} €`}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
