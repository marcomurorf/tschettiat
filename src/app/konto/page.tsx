// Konto-Seite: Profil (Name/Foto von Google), Guthaben, Empfehlungen, Kauf.
import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Account } from "@/components/Account";

export const metadata = { title: "Mein Konto – tschetti.at" };

export default async function KontoPage() {
  const session = await auth();
  const devBypass =
    process.env.NODE_ENV !== "production" && process.env.DEV_SKIP_AUTH === "1";
  if (!session?.user && !devBypass) redirect("/login");

  const name = session?.user?.name ?? null;
  const email = session?.user?.email ?? "dev";
  const image = session?.user?.image ?? null;

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="flex items-center justify-between px-5 py-3 border-b border-cream-dark bg-cream/80 backdrop-blur sticky top-0 z-10">
        <Link href="/">
          <Image
            src="/logo.png"
            alt="tschetti.at"
            width={178}
            height={64}
            priority
            className="h-11 sm:h-13 w-auto"
          />
        </Link>
        <Link
          href="/"
          className="text-sm text-ink-soft hover:text-ink transition-colors"
        >
          ← Zurück zum Chat
        </Link>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-8">
        {/* Profil */}
        <div className="flex items-center gap-4 mb-8">
          {image ? (
            // Externes Google-Foto: normales img-Tag statt next/image
            // (keine remotePatterns-Konfiguration nötig)
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt=""
              width={64}
              height={64}
              referrerPolicy="no-referrer"
              className="w-16 h-16 rounded-full border border-cream-dark object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-accent-soft grid place-items-center text-2xl">
              {(name ?? email).charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-xl font-semibold truncate">
              {name ?? "Mein Konto"}
            </h1>
            <p className="text-sm text-ink-soft truncate">{email}</p>
          </div>
        </div>

        <Account />

        {/* Abmelden */}
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
          className="mt-8"
        >
          <button className="text-sm text-ink-soft hover:text-accent transition-colors underline">
            Abmelden
          </button>
        </form>
      </main>
    </div>
  );
}
