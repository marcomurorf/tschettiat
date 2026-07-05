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
    })
  );
}
if (process.env.EMAIL_SERVER && process.env.EMAIL_FROM) {
  providers.push(
    Nodemailer({
      server: process.env.EMAIL_SERVER, // smtp://user:pass@host:587
      from: process.env.EMAIL_FROM,     // z.B. "Tschetti <login@tschetti.at>"
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: UnstorageAdapter(storage),
  session: { strategy: "jwt" },
  providers,
  pages: { signIn: "/login" },
});
