// Basic-Auth für den Admin-Bereich (ADMIN_USER / ADMIN_PASSWORD aus .env).
import { NextRequest, NextResponse } from "next/server";

export default function proxy(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const [user, pass] = Buffer.from(auth.replace("Basic ", ""), "base64")
    .toString()
    .split(":");

  if (
    user === process.env.ADMIN_USER &&
    pass === process.env.ADMIN_PASSWORD &&
    process.env.ADMIN_PASSWORD
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
