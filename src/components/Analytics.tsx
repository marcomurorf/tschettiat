"use client";

// Cookieloses Seitenaufruf-Tracking: sendet bei jedem Routenwechsel einen
// Beacon an /api/track (fire-and-forget, keine Cookies, keine IDs im Client).
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    const payload = JSON.stringify({
      path: pathname,
      referrer: document.referrer || "",
    });
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          "/api/track",
          new Blob([payload], { type: "application/json" })
        );
      } else {
        fetch("/api/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // Tracking darf die Seite nie stören
    }
  }, [pathname]);

  return null;
}
