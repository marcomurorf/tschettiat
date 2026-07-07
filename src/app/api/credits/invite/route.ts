// Einladungs-Mail: verschickt auf Wunsch des Users eine einmalige
// Empfehlung an eine E-Mail-Adresse ("X hat da was für dich").
// Konformität: einmalig pro Adresse, Absender klar benannt, Hinweis
// auf den Anlass – keine wiederholten Mails, Tageslimit pro User.
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, logEvent } from "@/lib/db";
import { getOrCreateRefCode } from "@/lib/credits";
import { loadSettings } from "@/lib/settings";
import { SITE_URL } from "@/lib/site";

const MAX_INVITES_PER_DAY = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function POST(req: Request) {
  const session = await auth();
  const devBypass =
    process.env.NODE_ENV !== "production" && process.env.DEV_SKIP_AUTH === "1";
  if (!session?.user && !devBypass) {
    return new Response(null, { status: 401 });
  }
  const userId = session?.user?.email ?? "dev";
  const senderName = session?.user?.name?.trim() || userId;

  if (!process.env.EMAIL_SERVER || !process.env.EMAIL_FROM) {
    return NextResponse.json(
      { error: "E-Mail-Versand ist derzeit nicht verfügbar." },
      { status: 503 }
    );
  }

  const { email } = (await req.json()) as { email?: string };
  const to = email?.trim().toLowerCase() ?? "";
  if (!EMAIL_RE.test(to) || to.length > 254) {
    return NextResponse.json(
      { error: "Bitte gib eine gültige E-Mail-Adresse ein." },
      { status: 400 }
    );
  }
  if (to === userId.toLowerCase()) {
    return NextResponse.json(
      { error: "Du kannst dich nicht selbst einladen." },
      { status: 400 }
    );
  }

  // Tageslimit pro User (Spam-Schutz)
  const dayStart = new Date().setHours(0, 0, 0, 0);
  const sentToday = (
    db
      .prepare(
        "SELECT COUNT(*) AS n FROM events WHERE user_id = ? AND type = 'invite_sent' AND ts >= ?"
      )
      .get(userId, dayStart) as unknown as { n: number }
  ).n;
  if (sentToday >= MAX_INVITES_PER_DAY) {
    return NextResponse.json(
      { error: `Maximal ${MAX_INVITES_PER_DAY} Einladungen pro Tag.` },
      { status: 429 }
    );
  }

  // Jede Adresse bekommt insgesamt nur EINE Einladung (egal von wem) –
  // das hält den Versand rechtlich sauber (keine wiederholte Werbung).
  const already = db
    .prepare(
      "SELECT 1 FROM events WHERE type = 'invite_sent' AND meta LIKE ? LIMIT 1"
    )
    .get(`%"to":"${to}"%`);
  if (already) {
    return NextResponse.json(
      { error: "Diese Adresse wurde bereits eingeladen." },
      { status: 409 }
    );
  }

  const settings = await loadSettings();
  const bonus = settings.limits?.referralBonusTokens ?? 100000;
  const refLink = `${SITE_URL}/r/${getOrCreateRefCode(userId)}`;

  const { createTransport } = await import("nodemailer");
  const transport = createTransport(process.env.EMAIL_SERVER);
  await transport.sendMail({
    to,
    from: process.env.EMAIL_FROM,
    replyTo: userId.includes("@") ? userId : undefined,
    subject: `${senderName} hat da was für dich 🛒`,
    text: [
      `Servus!`,
      ``,
      `${senderName} (${userId}) nutzt tschetti.at – einen KI-Einkaufs-Assistenten,`,
      `der im Chat ehrliche Produktempfehlungen gibt – und möchte ihn dir empfehlen.`,
      ``,
      `Hier kannst du kostenlos loslegen:`,
      refLink,
      ``,
      `Diese Einladung wurde einmalig auf Wunsch von ${senderName} verschickt.`,
      `Du erhältst keine weiteren E-Mails von uns, wenn du dich nicht anmeldest.`,
      ``,
      `Liebe Grüße`,
      `Tschetti – dein Einkaufs-Assistent · tschetti.at`,
    ].join("\n"),
    html: `
<div style="background:#faf6ef;padding:32px 16px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <div style="max-width:440px;margin:0 auto;background:#ffffff;border:1px solid #e8dfd0;border-radius:16px;padding:32px;text-align:center">
    <p style="font-size:28px;margin:0 0 4px">🛒</p>
    <p style="font-size:20px;font-weight:600;color:#2b2620;margin:0 0 24px">tschetti<span style="color:#d95d39">.at</span></p>
    <p style="font-size:15px;color:#2b2620;margin:0 0 8px"><strong>${esc(senderName)}</strong> hat da was für dich!</p>
    <p style="font-size:15px;color:#6b6154;margin:0 0 24px">Tschetti ist ein KI-Einkaufs-Assistent, der dir im Chat ehrliche Produktempfehlungen gibt – kein Katalog-Wühlen mehr.</p>
    <a href="${refLink}" style="display:inline-block;background:#d95d39;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 28px;border-radius:12px">Kostenlos ausprobieren</a>
    <p style="font-size:12px;color:#6b6154;margin:24px 0 0">Diese Einladung wurde einmalig auf Wunsch von ${esc(senderName)} (${esc(userId)}) verschickt.<br>Du erhältst keine weiteren E-Mails, wenn du dich nicht anmeldest.</p>
  </div>
  <p style="text-align:center;font-size:11px;color:#a89e8f;margin:16px 0 0">Tschetti – dein Einkaufs-Assistent · tschetti.at</p>
</div>`,
  });

  logEvent(userId, "invite_sent", { to });
  return NextResponse.json({ ok: true, bonus });
}
