// Basic-Auth für den Admin-Bereich (ADMIN_USER / ADMIN_PASSWORD aus .env).
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

// Konstantzeit-Vergleich gegen Timing-Angriffe
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export default function proxy(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const [user = "", pass = ""] = Buffer.from(
    auth.replace("Basic ", ""),
    "base64"
  )
    .toString()
    .split(":");

  if (
    process.env.ADMIN_PASSWORD &&
    safeEqual(user, process.env.ADMIN_USER || "") &&
    safeEqual(pass, process.env.ADMIN_PASSWORD)
  ) {
    return NextResponse.next();
  }

  return new NextResponse("Auth erforderlich", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Tschetti Admin"' },
  });
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
