import type { Metadata } from "next";
import { Outfit } from "next/font/google";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={`${outfit.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-cream text-ink font-sans">
        <Analytics />
        {children}
      </body>
    </html>
  );
}
