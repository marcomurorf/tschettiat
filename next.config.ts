import type { NextConfig } from "next";

const securityHeaders = [
  // HTTPS erzwingen (Browser merkt sich das für 1 Jahr)
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  // MIME-Sniffing verhindern
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Einbetten in fremde Seiten verhindern (Clickjacking)
  { key: "X-Frame-Options", value: "DENY" },
  // Referrer nur als Origin an fremde Seiten weitergeben
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Unnötige Browser-Features abschalten
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
