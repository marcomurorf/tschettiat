import Link from "next/link";

export const metadata = {
  title: "Datenschutz – Tschetti",
  robots: { index: false },
};

export default function DatenschutzPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Link href="/" className="text-sm text-neutral-500 hover:underline">
        ← Zurück zu Tschetti
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Datenschutzerklärung</h1>

      <section className="mt-8 space-y-6 text-neutral-700 dark:text-neutral-300">
        <div>
          <h2 className="text-lg font-semibold">Verantwortlicher</h2>
          <p className="mt-2">
            Marco Mursteiner, Palmengasse 21, 9020 Klagenfurt, Österreich
            <br />
            E-Mail: <a href="mailto:info@tschetti.at" className="underline">info@tschetti.at</a>
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Benutzerkonto und Login</h2>
          <p className="mt-2">
            Für die Nutzung von Tschetti ist ein Login erforderlich. Dabei
            verarbeiten wir deine E-Mail-Adresse sowie – bei Anmeldung über
            Google – Name und Profilbild aus deinem Google-Konto.
            Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO
            (Vertragserfüllung). Die Daten werden gelöscht, wenn du dein Konto
            löschst.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Chat-Anfragen und KI</h2>
          <p className="mt-2">
            Deine Chat-Eingaben werden zur Beantwortung an einen
            KI-Sprachmodell-Dienst übermittelt (derzeit Microsoft Azure OpenAI
            Service, Rechenzentren in der EU). Die Eingaben werden dort nicht
            zum Training von Modellen verwendet. Bitte gib im Chat keine
            sensiblen personenbezogenen Daten ein.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Cookies</h2>
          <p className="mt-2">
            Wir verwenden ausschließlich technisch notwendige Cookies zur
            Sitzungsverwaltung (Login). Es findet kein Tracking durch
            Drittanbieter statt.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Affiliate-Links</h2>
          <p className="mt-2">
            Produktempfehlungen enthalten Partner-Links (u.&nbsp;a.
            Amazon-Partnerprogramm). Beim Klick auf einen solchen Link wirst du
            zum jeweiligen Shop weitergeleitet; dort gelten die
            Datenschutzbestimmungen des Shop-Betreibers.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Hosting</h2>
          <p className="mt-2">
            Diese Website wird auf einem Server in der EU betrieben. Beim
            Aufruf werden technisch notwendige Daten (IP-Adresse, Zeitpunkt,
            aufgerufene Seite) in Server-Logs verarbeitet (Art. 6 Abs. 1 lit. f
            DSGVO) und nach kurzer Zeit gelöscht.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Deine Rechte</h2>
          <p className="mt-2">
            Du hast das Recht auf Auskunft, Berichtigung, Löschung,
            Einschränkung der Verarbeitung, Datenübertragbarkeit und
            Widerspruch. Wende dich dazu an die oben genannte E-Mail-Adresse.
            Beschwerden kannst du an die österreichische Datenschutzbehörde
            (dsb.gv.at) richten.
          </p>
        </div>
      </section>
    </main>
  );
}
