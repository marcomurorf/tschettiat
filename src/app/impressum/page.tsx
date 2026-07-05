import Link from "next/link";

export const metadata = {
  title: "Impressum – Tschetti",
  robots: { index: false },
};

export default function ImpressumPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Link href="/" className="text-sm text-neutral-500 hover:underline">
        ← Zurück zu Tschetti
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Impressum</h1>

      <section className="mt-8 space-y-6 text-neutral-700 dark:text-neutral-300">
        <div>
          <h2 className="text-lg font-semibold">
            Angaben gemäß § 5 ECG und § 25 MedienG
          </h2>
          <p className="mt-2">
            Marco Mursteiner
            <br />
            Palmengasse 21
            <br />
            9020 Klagenfurt
            <br />
            Österreich
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Kontakt</h2>
          <p className="mt-2">
            E-Mail: <a href="mailto:info@tschetti.at" className="underline">info@tschetti.at</a>
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Unternehmensgegenstand</h2>
          <p className="mt-2">
            Betrieb eines KI-gestützten Produktberatungs-Dienstes mit
            Affiliate-Empfehlungen.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Affiliate-Hinweis</h2>
          <p className="mt-2">
            Tschetti empfiehlt Produkte über Partnerprogramme (u.&nbsp;a. das
            Amazon-Partnerprogramm). Bei Käufen über diese Links erhalten wir
            eine Provision. Für dich ändert sich der Preis nicht.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Haftung für Inhalte</h2>
          <p className="mt-2">
            Produktempfehlungen werden mithilfe von KI erstellt und können
            Fehler enthalten. Für die Richtigkeit, Vollständigkeit und
            Aktualität der Inhalte übernehmen wir keine Gewähr. Maßgeblich sind
            stets die Angaben im jeweiligen Shop.
          </p>
        </div>
      </section>
    </main>
  );
}
