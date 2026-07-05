import { auth, signOut } from "@/auth";
import { ChatShell } from "@/components/ChatShell";
import Link from "next/link";

export default async function Home() {
  const session = await auth();
  const devBypass =
    process.env.NODE_ENV !== "production" && process.env.DEV_SKIP_AUTH === "1";
  const loggedIn = Boolean(session?.user) || devBypass;

  return (
    <div className="flex flex-col flex-1 h-dvh">
      <header className="flex items-center justify-between px-5 py-3 border-b border-cream-dark bg-cream/80 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-xl">🛒</span>
          <span className="font-semibold text-lg tracking-tight">
            tschetti<span className="text-accent">.at</span>
          </span>
        </div>
        {session?.user ? (
          <form
            action={async () => {
              "use server";
              await signOut();
            }}
          >
            <button className="text-sm text-ink-soft hover:text-ink transition-colors">
              {session.user.email} · Abmelden
            </button>
          </form>
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
        <ChatShell />
      ) : (
        <main className="flex flex-col flex-1 items-center justify-center text-center px-4">
          <div className="text-6xl mb-6">🛒</div>
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
