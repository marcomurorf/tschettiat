// Kanonische Site-URL für Links, die die App verlassen (Ref-Links, E-Mails).
// Nicht aus dem Request-Origin ableiten: hinter dem Reverse-Proxy (und im
// Dev-Modus) wäre das localhost.
export const SITE_URL =
  process.env.SITE_URL ??
  (process.env.NODE_ENV === "production"
    ? "https://tschetti.at"
    : "http://localhost:3000");
