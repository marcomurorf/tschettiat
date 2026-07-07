// Guthaben-Info für den eingeloggten Nutzer: Credits, Ref-Link, Pakete.
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { loadSettings } from "@/lib/settings";
import { getCreditBalance, getOrCreateRefCode } from "@/lib/credits";
import { remainingTokens } from "@/lib/tokenlimit";
import { SITE_URL } from "@/lib/site";

export async function GET() {
  const session = await auth();
  const devBypass =
    process.env.NODE_ENV !== "production" && process.env.DEV_SKIP_AUTH === "1";
  if (!session?.user && !devBypass) {
    return new Response(null, { status: 401 });
  }
  const userId = session?.user?.email ?? "dev";
  const settings = await loadSettings();
  const unlimited = (settings.limits?.unlimitedUsers ?? []).some(
    (u) => u.toLowerCase() === userId.toLowerCase()
  );
  const refCode = getOrCreateRefCode(userId);
  return NextResponse.json({
    credits: getCreditBalance(userId),
    remainingToday: unlimited
      ? null
      : remainingTokens(userId, settings.limits?.tokensPerDay ?? 60000),
    unlimited,
    refLink: `${SITE_URL}/r/${refCode}`,
    referralBonusTokens: settings.limits?.referralBonusTokens ?? 100000,
    packages: (settings.creditPackages ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      tokens: p.tokens,
      priceCents: p.priceCents,
    })),
    stripeEnabled: Boolean(process.env.STRIPE_SECRET_KEY),
  });
}
