// Empfehlungs-Link: tschetti.at/r/CODE
// Merkt den Ref-Code in einem Cookie und leitet auf die Startseite weiter.
// Die Gutschrift passiert bei der ersten Registrierung (src/auth.ts).
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const res = NextResponse.redirect(new URL("/", req.url));
  if (/^[A-Za-z0-9_-]{4,16}$/.test(code)) {
    res.cookies.set("tschetti_ref", code, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 Tage
      path: "/",
    });
  }
  return res;
}
