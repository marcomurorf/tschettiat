"use client";

import { useState } from "react";
import { trackClick } from "@/lib/click";

export interface TravelOption {
  name: string;
  price: number;
  priceNote?: string;
  detail?: string;
  link: string;
  image?: string;
  recommended?: boolean;
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

function OptionRow({ option, type }: { option: TravelOption; type: "flight" | "hotel" }) {
  const [imgFailed, setImgFailed] = useState(false);
  return (
    <a
      href={option.link}
      target="_blank"
      rel="nofollow sponsored noopener"
      onClick={() => trackClick()}
      className={`flex items-center gap-3 rounded-xl border p-2.5 transition-colors hover:bg-cream ${
        option.recommended
          ? "border-accent/60 bg-accent-soft/40"
          : "border-cream-dark bg-card"
      }`}
    >
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
      </span>
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
