"use client";

// Konto-Panel: Guthaben, Empfehlungs-Link, Einladungs-Mail, Credits kaufen.
import { useEffect, useState } from "react";

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
  return n.toLocaleString("de-AT");
}

export function Account() {
  const [info, setInfo] = useState<CreditInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const [invite, setInvite] = useState("");
  const [inviteMsg, setInviteMsg] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [sending, setSending] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/credits")
      .then((r) => (r.ok ? r.json() : null))
      .then(setInfo)
      .catch(() => {});
  }, []);

  const copyRefLink = async () => {
    if (!info) return;
    await navigator.clipboard.writeText(info.refLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setInviteMsg(null);
    try {
      const res = await fetch("/api/credits/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: invite }),
      });
      const data = await res.json();
      if (res.ok) {
        setInviteMsg({ ok: true, text: `Einladung an ${invite} verschickt!` });
        setInvite("");
      } else {
        setInviteMsg({
          ok: false,
          text: data.error ?? "Versand fehlgeschlagen.",
        });
      }
    } catch {
      setInviteMsg({ ok: false, text: "Versand fehlgeschlagen." });
    } finally {
      setSending(false);
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

  if (!info) {
    return (
      <p className="text-sm text-ink-soft animate-pulse">Lade Guthaben…</p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Guthaben */}
      <section className="bg-card border border-cream-dark rounded-2xl p-5">
        <h2 className="font-semibold mb-3">Dein Guthaben</h2>
        {info.unlimited ? (
          <p className="text-sm text-ink-soft">
            Dein Konto ist unbegrenzt – viel Spaß!
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-semibold text-accent">
                {fmt(info.remainingToday ?? 0)}
              </p>
              <p className="text-xs text-ink-soft">Tokens heute verfügbar</p>
            </div>
            <div>
              <p className="text-2xl font-semibold">{fmt(info.credits)}</p>
              <p className="text-xs text-ink-soft">
                Credits (verfallen nicht)
              </p>
            </div>
          </div>
        )}
        <p className="text-xs text-ink-soft mt-3">
          Tipp: Klicks auf Amazon-Produkte im Chat bringen dir zusätzliches
          Tagesbudget.
        </p>
      </section>

      {/* Weiterempfehlen */}
      <section className="bg-card border border-cream-dark rounded-2xl p-5">
        <h2 className="font-semibold mb-1">
          Freunde einladen{" "}
          <span className="text-accent">
            · +{fmt(info.referralBonusTokens)} Tokens
          </span>
        </h2>
        <p className="text-sm text-ink-soft mb-3">
          Für jede Anmeldung über deinen Link bekommst du Credits
          gutgeschrieben.
        </p>
        <div className="flex gap-2 mb-4">
          <input
            readOnly
            value={info.refLink}
            onFocus={(e) => e.target.select()}
            className="flex-1 min-w-0 text-sm border border-cream-dark rounded-lg px-3 py-2 bg-cream/50 text-ink-soft"
          />
          <button
            onClick={copyRefLink}
            className="text-sm bg-ink text-cream rounded-lg px-4 py-2 hover:bg-ink/85 transition-colors shrink-0"
          >
            {copied ? "✓ Kopiert" : "Kopieren"}
          </button>
        </div>
        <form onSubmit={sendInvite} className="flex gap-2">
          <input
            type="email"
            required
            value={invite}
            onChange={(e) => setInvite(e.target.value)}
            placeholder="E-Mail einer Freundin / eines Freundes"
            className="flex-1 min-w-0 text-sm border border-cream-dark rounded-lg px-3 py-2 bg-white"
          />
          <button
            type="submit"
            disabled={sending}
            className="text-sm bg-accent hover:bg-accent-dark text-white rounded-lg px-4 py-2 transition-colors disabled:opacity-50 shrink-0"
          >
            {sending ? "Sende…" : "Einladen"}
          </button>
        </form>
        {inviteMsg && (
          <p
            className={`text-xs mt-2 ${
              inviteMsg.ok ? "text-green-700" : "text-accent"
            }`}
          >
            {inviteMsg.text}
          </p>
        )}
        <p className="text-xs text-ink-soft mt-2">
          Die Einladung wird einmalig in deinem Namen verschickt – die Person
          erhält keine weiteren E-Mails.
        </p>
      </section>

      {/* Einstellungen */}
      <section className="bg-card border border-cream-dark rounded-2xl p-5">
        <h2 className="font-semibold mb-3">Einstellungen</h2>
        <div className="flex items-center justify-between gap-3 opacity-60">
          <div>
            <p className="text-sm font-medium">
              🇦🇹 Nur österreichische Shops{" "}
              <span className="text-[10px] font-semibold uppercase tracking-wide bg-cream-dark text-ink-soft rounded-full px-2 py-0.5 align-middle">
                Coming soon
              </span>
            </p>
            <p className="text-xs text-ink-soft mt-0.5">
              Empfehlungen ausschließlich von Anbietern aus Österreich.
            </p>
          </div>
          <span
            aria-disabled
            className="relative inline-block w-10 h-6 rounded-full bg-cream-dark shrink-0 cursor-not-allowed"
          >
            <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow" />
          </span>
        </div>
      </section>

      {/* Kaufen */}
      {info.stripeEnabled && info.packages.length > 0 && (
        <section className="bg-card border border-cream-dark rounded-2xl p-5">
          <h2 className="font-semibold mb-3">Credits kaufen</h2>
          <div className="space-y-2">
            {info.packages.map((p) => (
              <button
                key={p.id}
                onClick={() => buy(p.id)}
                disabled={buying !== null}
                className="w-full flex items-center justify-between text-sm border border-cream-dark rounded-xl px-4 py-3 hover:border-accent transition-colors disabled:opacity-50"
              >
                <span>
                  <span className="font-medium">{p.name}</span>{" "}
                  <span className="text-ink-soft">
                    · {fmt(p.tokens)} Tokens
                  </span>
                </span>
                <span className="font-semibold text-accent">
                  {buying === p.id
                    ? "…"
                    : `${(p.priceCents / 100).toFixed(2).replace(".", ",")} €`}
                </span>
              </button>
            ))}
          </div>
          <p className="text-xs text-ink-soft mt-3">
            Bezahlung sicher über Stripe. Credits werden sofort nach der
            Zahlung gutgeschrieben und verfallen nicht.
          </p>
        </section>
      )}
    </div>
  );
}
