import Link from "next/link";

export const metadata = {
  title: "Impressum – Tschetti",
  robots: { index: false },
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-cream-dark rounded-2xl p-5">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <div className="mt-2 text-ink-soft leading-relaxed">{children}</div>
    </div>
  );
}

export default function ImpressumPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Link
        href="/"
        className="text-sm text-ink-soft hover:text-accent transition-colors"
      >
        ← Zurück zu Tschetti
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-ink">Impressum</h1>

      <section className="mt-8 space-y-4">
        <Section title="Angaben gemäß § 5 ECG und § 25 MedienG">
          <p>
            Marco Mursteiner
            <br />
            Palmengasse 21
            <br />
            9020 Klagenfurt
            <br />
            Österreich
          </p>
        </Section>

        <Section title="Kontakt">
          <p>
            E-Mail:{" "}
            <a
              href="mailto:hi@tschetti.de"
              className="text-accent underline hover:text-accent-dark"
            >
              hi@tschetti.de
            </a>
          </p>
        </Section>

        <Section title="Unternehmensgegenstand">
          <p>
            Betrieb eines KI-gestützten Produktberatungs-Dienstes mit
            Affiliate-Empfehlungen.
          </p>
        </Section>

        <Section title="Kein Verkauf – reine Vermittlung">
          <p>
            Tschetti verkauft selbst keine Produkte und betreibt keinen
            Online-Shop. Wir vermitteln lediglich an Partner-Shops weiter.
            Kaufverträge kommen ausschließlich zwischen dir und dem jeweiligen
            Shop zustande – für Bestellung, Bezahlung, Lieferung,
            Gewährleistung und Rückgabe ist allein der jeweilige Shop
            verantwortlich.
          </p>
        </Section>

        <Section title="Affiliate-Hinweis">
          <p>
            Tschetti empfiehlt Produkte über Partnerprogramme (u.&nbsp;a. das
            Amazon-Partnerprogramm und AWIN). Bei Käufen über diese Links
            erhalten wir eine Provision. Für dich ändert sich der Preis nicht.
          </p>
        </Section>

        <Section title="Haftung für Inhalte">
          <p>
            Produktempfehlungen werden mithilfe von KI erstellt und können
            Fehler enthalten. Für die Richtigkeit, Vollständigkeit und
            Aktualität der Inhalte (insbesondere Preise und Verfügbarkeiten)
            übernehmen wir keine Gewähr. Maßgeblich sind stets die Angaben im
            jeweiligen Shop.
          </p>
        </Section>
      </section>
    </main>
  );
}
