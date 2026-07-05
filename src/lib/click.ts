// Meldet Klicks auf Partnerlinks (fire-and-forget, für den stillen Token-Bonus).
"use client";

export function trackClick(): void {
  try {
    navigator.sendBeacon?.("/api/click") ||
      void fetch("/api/click", { method: "POST", keepalive: true });
  } catch {
    // Bonus ist nice-to-have, Fehler ignorieren
  }
}
