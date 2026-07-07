// Auth.js v5: Google-Login + Magic Link (E-Mail).
// Speicher: dateibasiert via unstorage (data/auth/) – keine Datenbank nötig.
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Nodemailer from "next-auth/providers/nodemailer";
import { UnstorageAdapter } from "@auth/unstorage-adapter";
import { createStorage } from "unstorage";
import fsDriver from "unstorage/drivers/fs";
import { join } from "node:path";

const storage = createStorage({
  driver: fsDriver({ base: join(process.cwd(), "data", "auth") }),
});

// Provider nur aktivieren, wenn die nötigen Env-Variablen gesetzt sind
// (sonst schlägt schon der Build ohne .env fehl).
const providers = [];
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Google verifiziert E-Mail-Adressen → sicher, ein bestehendes
      // Magic-Link-Konto mit demselben Google-Konto zu verknüpfen.
      // Ohne das: OAuthAccountNotLinked, wenn man sich zuerst per
      // E-Mail und später per Google anmeldet.
      allowDangerousEmailAccountLinking: true,
    })
  );
}
if (process.env.EMAIL_SERVER && process.env.EMAIL_FROM) {
  providers.push(
    Nodemailer({
      server: process.env.EMAIL_SERVER, // smtp://user:pass@host:587
      from: process.env.EMAIL_FROM,     // z.B. "Tschetti <login@tschetti.at>"
      // Eigene Mail statt der kargen Auth.js-Standard-Mail:
      // ordentliches HTML + Text-Alternative senkt den Spam-Score deutlich.
      async sendVerificationRequest({ identifier, url, provider }) {
        const { createTransport } = await import("nodemailer");
        const transport = createTransport(provider.server);
        const host = new URL(url).host;
        await transport.sendMail({
          to: identifier,
          from: provider.from,
          subject: `Dein Anmelde-Link für ${host}`,
          text: [
            `Servus!`,
            ``,
            `Mit diesem Link meldest du dich bei ${host} an:`,
            url,
            ``,
            `Der Link ist 24 Stunden gültig und funktioniert nur einmal.`,
            `Falls du diese Anmeldung nicht angefordert hast, kannst du diese E-Mail einfach ignorieren.`,
            ``,
            `Liebe Grüße`,
            `Tschetti – dein Einkaufs-Assistent`,
          ].join("\n"),
          html: `
<div style="background:#faf6ef;padding:32px 16px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <div style="max-width:440px;margin:0 auto;background:#ffffff;border:1px solid #e8dfd0;border-radius:16px;padding:32px;text-align:center">
    <p style="font-size:28px;margin:0 0 4px">🛒</p>
    <p style="font-size:20px;font-weight:600;color:#2b2620;margin:0 0 24px">tschetti<span style="color:#d95d39">.at</span></p>
    <p style="font-size:15px;color:#2b2620;margin:0 0 8px">Servus!</p>
    <p style="font-size:15px;color:#6b6154;margin:0 0 24px">Mit einem Klick bist du angemeldet:</p>
    <a href="${url}" style="display:inline-block;background:#d95d39;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 28px;border-radius:12px">Jetzt anmelden</a>
    <p style="font-size:12px;color:#6b6154;margin:24px 0 0">Der Link ist 24 Stunden gültig und funktioniert nur einmal.<br>Nicht angefordert? Dann ignorier diese E-Mail einfach.</p>
  </div>
  <p style="text-align:center;font-size:11px;color:#a89e8f;margin:16px 0 0">Tschetti – dein Einkaufs-Assistent · tschetti.at</p>
</div>`,
        });
      },
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: UnstorageAdapter(storage),
  session: { strategy: "jwt" },
  providers,
  pages: { signIn: "/login" },
  events: {
    // Erste Registrierung: wurde der Nutzer über einen Ref-Link geworben,
    // bekommt der Werber eine Token-Gutschrift (Cookie aus /r/CODE).
    async createUser({ user }) {
      if (!user.email) return;
      try {
        const { cookies } = await import("next/headers");
        const refCode = (await cookies()).get("tschetti_ref")?.value;
        if (!refCode) return;
        const [{ recordReferral }, { loadSettings }] = await Promise.all([
          import("@/lib/credits"),
          import("@/lib/settings"),
        ]);
        const settings = await loadSettings();
        recordReferral(
          user.email,
          refCode,
          settings.limits?.referralBonusTokens ?? 100000
        );
      } catch {
        // Referral darf die Registrierung nie blockieren
      }
    },
  },
});
