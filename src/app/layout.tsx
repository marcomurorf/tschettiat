import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import Script from "next/script";
import Analytics from "@/components/Analytics";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://tschetti.at"),
  title: {
    default: "Tschetti – Dein Einkaufs-Assistent",
    template: "%s",
  },
  description:
    "Tschetti findet für dich das richtige Produkt, die passende Reise oder die beste Lösung – im Chat, einfach fragen.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Tschetti – Dein Einkaufs-Assistent",
    description:
      "Tschetti findet für dich das richtige Produkt – im Chat, einfach fragen. Kostenlos, ohne Werbung.",
    url: "https://tschetti.at",
    siteName: "Tschetti",
    locale: "de_AT",
    type: "website",
    images: [{ url: "/logo.png", width: 1753, height: 628 }],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Mobile Tastatur verkleinert den Viewport, statt das Layout zu überdecken.
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={`${outfit.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-cream text-ink font-sans">
        <Analytics />
        {/* Travelpayouts-Verifizierung / Partner-Script (Marker 547391) */}
        <Script
          id="travelpayouts"
          src="https://tpembars.com/NTQ3Mzkx.js?t=547391"
          strategy="afterInteractive"
        />
        {children}
      </body>
    </html>
  );
}
