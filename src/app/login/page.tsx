import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; verify?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/");
  const params = await searchParams;

  return (
    <main className="flex flex-col flex-1 items-center justify-center min-h-dvh px-4">
      <Link href="/" className="mb-8">
        <Image
          src="/logo.png"
          alt="tschetti.at"
          width={279}
          height={100}
          priority
          className="h-20 sm:h-24 w-auto"
        />
      </Link>

      <div className="bg-card border border-cream-dark rounded-2xl shadow-sm p-8 w-full max-w-sm space-y-5">
        <h1 className="text-xl font-semibold text-center">Anmelden</h1>

        {params.verify && (
          <p className="text-sm bg-accent-soft text-accent-dark rounded-lg p-3">
            Magic Link verschickt – schau in dein Postfach!
          </p>
        )}
        {params.error && (
          <p className="text-sm bg-accent-soft text-accent-dark rounded-lg p-3">
            Anmeldung fehlgeschlagen – bitte nochmal versuchen.
          </p>
        )}

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button className="w-full flex items-center justify-center gap-2 border border-cream-dark rounded-xl py-2.5 hover:bg-cream transition-colors font-medium">
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/>
            </svg>
            Mit Google anmelden
          </button>
        </form>

        <div className="flex items-center gap-3 text-xs text-ink-soft">
          <span className="flex-1 border-t border-cream-dark" />
          oder
          <span className="flex-1 border-t border-cream-dark" />
        </div>

        <form
          action={async (formData) => {
            "use server";
            await signIn("nodemailer", {
              email: formData.get("email"),
              redirectTo: "/",
              redirect: false,
            });
            redirect("/login?verify=1");
          }}
          className="space-y-3"
        >
          <input
            type="email"
            name="email"
            required
            placeholder="deine@email.at"
            className="w-full border border-cream-dark rounded-xl px-4 py-2.5 outline-none focus:border-accent transition-colors bg-cream/50"
          />
          <button className="w-full bg-accent hover:bg-accent-dark text-white font-medium rounded-xl py-2.5 transition-colors">
            Magic Link schicken
          </button>
        </form>
      </div>

      <p className="text-xs text-ink-soft mt-6 max-w-sm text-center">
        Mit der Anmeldung akzeptierst du unsere{" "}
        <Link href="/datenschutz" className="underline">
          Datenschutzerklärung
        </Link>
        .
      </p>
    </main>
  );
}
