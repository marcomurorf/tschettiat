// Registriert einen Klick auf einen Partnerlink und schreibt dem User
// still einen Token-Bonus gut (gedeckelt pro Tag).
import { auth } from "@/auth";
import { loadSettings } from "@/lib/settings";
import { recordClickBonus } from "@/lib/tokenlimit";

export async function POST() {
  const session = await auth();
  const devBypass =
    process.env.NODE_ENV !== "production" && process.env.DEV_SKIP_AUTH === "1";
  if (!session?.user && !devBypass) {
    return new Response(null, { status: 401 });
  }
  const userId = session?.user?.email ?? "dev";
  const { limits } = await loadSettings();
  await recordClickBonus(
    userId,
    limits.clickBonusTokens ?? 5000,
    limits.clickBonusMaxPerDay ?? 6
  );
  return new Response(null, { status: 204 });
}
