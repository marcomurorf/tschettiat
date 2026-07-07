"use client";

import { useEffect, useState } from "react";
import { trackClick } from "@/lib/click";

export interface TravelOption {
  name: string;
  price: number;
  priceNote?: string;
  detail?: string;
  link: string;
  image?: string;
  recommended?: boolean;
  // Für direkt buchbare Hotels (LiteAPI):
  hotelId?: string;
  checkin?: string;
  checkout?: string;
  adults?: number;
}

export interface TravelItem {
  type: "flight" | "hotel";
  label: string;
  date: string;
  options: TravelOption[];
}

export interface TravelPlan {
  title: string;
  items: TravelItem[];
  budgetNote?: string;
}

function formatPrice(v: number): string {
  return `${v.toLocaleString("de-AT")} €`;
}

// ---------- Buchungs-Modal (Hotels, LiteAPI) ----------

interface PrebookInfo {
  prebookId: string;
  price: number;
  currency: string;
  checkin?: string;
  checkout?: string;
  hotelName?: string;
  roomName?: string;
  boardName?: string;
  refundableTag?: string;
  cancelPolicyText?: string;
}

interface BookInfo {
  bookingId: string;
  status: string;
  hotelName?: string;
  price?: number;
}

function BookingModal({
  option,
  onClose,
}: {
  option: TravelOption;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<"prebooking" | "form" | "booking" | "done">(
    "prebooking"
  );
  const [prebook, setPrebook] = useState<PrebookInfo | null>(null);
  const [booking, setBooking] = useState<BookInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  // Prebook direkt beim Öffnen starten
  useEffect(() => {
    let cancelled = false;
    fetch("/api/travel/prebook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hotelId: option.hotelId,
        checkin: option.checkin,
        checkout: option.checkout,
        adults: option.adults ?? 2,
      }),
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Fehler beim Laden des Angebots");
        if (cancelled) return;
        setPrebook(data);
        setPhase("form");
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prebook) return;
    setPhase("booking");
    setError(null);
    try {
      const r = await fetch("/api/travel/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prebookId: prebook.prebookId,
          firstName,
          lastName,
          email,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Buchung fehlgeschlagen");
      setBooking(data);
      setPhase("done");
      trackClick();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Buchung fehlgeschlagen");
      setPhase("form");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onClick={phase === "booking" ? undefined : onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-cream-dark bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Kopf */}
        <div className="mb-3 flex items-start justify-between gap-2">
          <p className="text-sm font-bold text-ink">
            🏨 {prebook?.hotelName ?? option.name}
          </p>
          {phase !== "booking" && (
            <button
              onClick={onClose}
              className="shrink-0 rounded-lg px-2 text-lg leading-none text-ink-soft hover:bg-cream"
              aria-label="Schließen"
            >
              ×
            </button>
          )}
        </div>

        {error && (
          <p className="mb-3 rounded-xl bg-accent-soft/60 px-3 py-2 text-xs font-medium text-accent-dark">
            {error}
          </p>
        )}

        {phase === "prebooking" && !error && (
          <p className="py-6 text-center text-sm text-ink-soft">
            Aktuelles Angebot wird geladen …
          </p>
        )}

        {(phase === "form" || phase === "booking") && prebook && (
          <>
            <div className="mb-4 rounded-xl bg-cream px-3 py-2.5 text-xs text-ink">
              {prebook.roomName && (
                <p className="font-semibold">{prebook.roomName}</p>
              )}
              {prebook.boardName && <p>{prebook.boardName}</p>}
              {prebook.checkin && prebook.checkout && (
                <p>
                  {prebook.checkin} – {prebook.checkout}
                </p>
              )}
              <p className="mt-1 text-sm font-bold">
                {formatPrice(prebook.price)}{" "}
                <span className="font-normal text-ink-soft">gesamt</span>
              </p>
              {prebook.cancelPolicyText && (
                <p
                  className={`mt-1 font-medium ${
                    prebook.refundableTag === "RFN"
                      ? "text-green-700"
                      : "text-accent-dark"
                  }`}
                >
                  {prebook.cancelPolicyText}
                </p>
              )}
            </div>
            <form onSubmit={submit} className="space-y-2.5">
              <div className="flex gap-2.5">
                <input
                  required
                  placeholder="Vorname"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={phase === "booking"}
                  className="w-1/2 rounded-xl border border-cream-dark bg-card px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                />
                <input
                  required
                  placeholder="Nachname"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={phase === "booking"}
                  className="w-1/2 rounded-xl border border-cream-dark bg-card px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                />
              </div>
              <input
                required
                type="email"
                placeholder="E-Mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={phase === "booking"}
                className="w-full rounded-xl border border-cream-dark bg-card px-3 py-2 text-sm text-ink outline-none focus:border-accent"
              />
              <button
                type="submit"
                disabled={phase === "booking"}
                className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
              >
                {phase === "booking"
                  ? "Buchung läuft …"
                  : `Verbindlich buchen · ${formatPrice(prebook.price)}`}
              </button>
              <p className="text-center text-[10px] text-ink-soft">
                Testmodus (Sandbox): Es wird keine echte Buchung ausgelöst und
                nichts bezahlt.
              </p>
            </form>
          </>
        )}

        {phase === "done" && booking && (
          <div className="py-2 text-center">
            <p className="mb-2 text-3xl">🎉</p>
            <p className="text-sm font-bold text-ink">
              Buchung {booking.status === "CONFIRMED" ? "bestätigt" : booking.status}!
            </p>
            <p className="mt-1 text-xs text-ink-soft">
              {booking.hotelName ?? option.name}
            </p>
            <p className="mt-2 rounded-xl bg-cream px-3 py-2 text-xs font-medium text-ink">
              Buchungsnummer: {booking.bookingId}
            </p>
            <button
              onClick={onClose}
              className="mt-3 w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-dark"
            >
              Fertig
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function OptionRow({ option, type }: { option: TravelOption; type: "flight" | "hotel" }) {
  const [imgFailed, setImgFailed] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  // In-App-Buchung (LiteAPI) vorerst deaktiviert – wir vermitteln zu Booking.com.
  // Zum Reaktivieren: Bedingung wieder einschalten.
  const bookable =
    false &&
    type === "hotel" && !!option.hotelId && !!option.checkin && !!option.checkout;

  const inner = (
    <>
      {type === "hotel" && option.image && !imgFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={option.image}
          alt=""
          onError={() => setImgFailed(true)}
          className="h-12 w-16 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cream text-lg">
          {type === "flight" ? "✈️" : "🏨"}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-ink">
            {option.name}
          </span>
          {option.recommended && (
            <span className="shrink-0 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-white">
              Tschettis Tipp
            </span>
          )}
        </span>
        {option.detail && (
          <span className="block truncate text-xs text-ink-soft">
            {option.detail}
          </span>
        )}
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-sm font-bold text-ink">
          {formatPrice(option.price)}
        </span>
        {option.priceNote && (
          <span className="block text-[10px] text-ink-soft">
            {option.priceNote}
          </span>
        )}
        {bookable && (
          <span className="mt-0.5 inline-block rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-white">
            Buchen
          </span>
        )}
      </span>
    </>
  );

  const rowClass = `flex items-center gap-3 rounded-xl border p-2.5 transition-colors hover:bg-cream ${
    option.recommended
      ? "border-accent/60 bg-accent-soft/40"
      : "border-cream-dark bg-card"
  }`;

  if (bookable) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowBooking(true)}
          className={`${rowClass} w-full text-left`}
        >
          {inner}
        </button>
        {showBooking && (
          <BookingModal option={option} onClose={() => setShowBooking(false)} />
        )}
      </>
    );
  }

  return (
    <a
      href={option.link}
      target="_blank"
      rel="nofollow sponsored noopener"
      onClick={() => trackClick()}
      className={rowClass}
    >
      {inner}
    </a>
  );
}

export function TravelTimeline({ plan }: { plan: TravelPlan }) {
  return (
    <div className="rounded-2xl border border-cream-dark bg-card p-4 shadow-sm">
      <p className="mb-3 text-sm font-bold text-ink">🧳 {plan.title}</p>
      <ol className="relative ml-3 space-y-4 border-l-2 border-cream-dark pl-5">
        {plan.items.map((item, i) => (
          <li key={i} className="relative">
            <span className="absolute -left-[27px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] text-white">
              {item.type === "flight" ? "✈" : "🛏"}
            </span>
            <p className="text-sm font-semibold text-ink">{item.label}</p>
            <p className="mb-1.5 text-xs text-ink-soft">{item.date}</p>
            <div className="space-y-1.5">
              {item.options.map((o, j) => (
                <OptionRow key={j} option={o} type={item.type} />
              ))}
            </div>
          </li>
        ))}
      </ol>
      {plan.budgetNote && (
        <p className="mt-3 rounded-xl bg-cream px-3 py-2 text-xs font-medium text-ink">
          💰 {plan.budgetNote}
        </p>
      )}
      <p className="mt-2 text-[10px] text-ink-soft">
        Preise ohne Gewähr – Buchung beim Anbieter. Links können Partner-Links sein.
      </p>
    </div>
  );
}
