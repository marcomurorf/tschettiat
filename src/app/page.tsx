import { auth } from "@/auth";
import { ChatShell } from "@/components/ChatShell";
import Link from "next/link";
import Image from "next/image";

export default async function Home() {
  const session = await auth();
  const devBypass =
    process.env.NODE_ENV !== "production" && process.env.DEV_SKIP_AUTH === "1";
  const loggedIn = Boolean(session?.user) || devBypass;
  const name = session?.user?.name ?? null;
  const firstName = name?.split(" ")[0] ?? null;
  const image = session?.user?.image ?? null;

  return (
    <div className="flex flex-col h-dvh">
      <header className="flex items-center justify-between px-5 py-3 border-b border-cream-dark bg-cream/80 backdrop-blur sticky top-0 z-10">
        <Image
          src="/logo.png"
          alt="tschetti.at"
          width={178}
          height={64}
          priority
          className="h-11 sm:h-13 w-auto"
        />
        {loggedIn ? (
          <Link
            href="/konto"
            className="flex items-center gap-2 text-sm text-ink-soft hover:text-ink transition-colors"
            title="Mein Konto"
          >
            <span className="hidden sm:inline">
              {name ?? session?.user?.email ?? "Konto"}
            </span>
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image}
                alt=""
                width={32}
                height={32}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full border border-cream-dark object-cover"
              />
            ) : (
              <span className="w-8 h-8 rounded-full bg-accent-soft grid place-items-center text-sm font-medium">
                {(name ?? session?.user?.email ?? "K").charAt(0).toUpperCase()}
              </span>
            )}
          </Link>
        ) : (
          <Link
            href="/login"
            className="text-sm bg-ink text-cream rounded-lg px-4 py-1.5 hover:bg-ink/85 transition-colors"
          >
            Anmelden
          </Link>
        )}
      </header>

      {loggedIn ? (
        <ChatShell firstName={firstName} />
      ) : (
        <main className="flex flex-col flex-1 items-center justify-center text-center px-4">
          <Image
            src="/logo.png"
            alt="tschetti.at"
            width={447}
            height={160}
            priority
            className="h-28 sm:h-36 w-auto mb-8"
          />
          <h1 className="text-4xl font-bold mb-3 tracking-tight">
            Dein persönlicher Einkaufs-Assistent
          </h1>
          <p className="text-ink-soft max-w-md mb-8 text-lg">
            Sag Tschetti, was du brauchst – und bekomm ehrliche
            Produktempfehlungen im Chat. Kein Katalog-Wühlen mehr.
          </p>
          <Link
            href="/login"
            className="bg-accent hover:bg-accent-dark text-white font-medium rounded-xl px-8 py-3 text-lg transition-colors"
          >
            Kostenlos loslegen
          </Link>
        </main>
      )}

      <footer className="text-center text-xs text-ink-soft py-2 border-t border-cream-dark">
        Empfehlungen enthalten Affiliate-Links ·{" "}
        <Link href="/impressum" className="underline">Impressum</Link> ·{" "}
        <Link href="/datenschutz" className="underline">Datenschutz</Link>
      </footer>
    </div>
  );
}
