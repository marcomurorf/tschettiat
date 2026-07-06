import Link from "next/link";

export const metadata = {
  title: "Datenschutz – Tschetti",
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
      <div className="mt-2 text-ink-soft leading-relaxed space-y-2">
        {children}
      </div>
    </div>
  );
}

export default function DatenschutzPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Link
        href="/"
        className="text-sm text-ink-soft hover:text-accent transition-colors"
      >
        ← Zurück zu Tschetti
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-ink">
        Datenschutzerklärung
      </h1>

      <section className="mt-8 space-y-4">
        <Section title="Verantwortlicher">
          <p>
            Marco Mursteiner, Palmengasse 21, 9020 Klagenfurt, Österreich
            <br />
            E-Mail:{" "}
            <a
              href="mailto:hi@tschetti.de"
              className="text-accent underline hover:text-accent-dark"
            >
              hi@tschetti.de
            </a>
          </p>
        </Section>

        <Section title="Kein Verkauf – reine Vermittlung">
          <p>
            Tschetti verkauft selbst keine Produkte. Wir empfehlen Produkte
            und vermitteln dich per Link an Partner-Shops. Der Kauf selbst
            (inkl. aller damit verbundenen Datenverarbeitungen) findet
            ausschließlich beim jeweiligen Shop statt.
          </p>
        </Section>

        <Section title="Benutzerkonto und Login">
          <p>
            Für die Nutzung des Chats ist ein Login erforderlich. Du kannst
            dich per Google-Konto oder per E-Mail-Link (Magic Link) anmelden.
            Dabei verarbeiten wir deine E-Mail-Adresse sowie – bei Anmeldung
            über Google – Name und Profilbild aus deinem Google-Konto. Beim
            E-Mail-Login versenden wir eine Anmelde-E-Mail über unseren
            Mail-Server. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO
            (Vertragserfüllung). Die Kontodaten werden gelöscht, wenn du dein
            Konto löschst.
          </p>
        </Section>

        <Section title="Chat-Anfragen und KI">
          <p>
            Deine Chat-Eingaben (Text und ggf. hochgeladene Bilder) werden zur
            Beantwortung an einen KI-Sprachmodell-Dienst übermittelt. Wir
            setzen dafür Microsoft Azure OpenAI Service (Rechenzentren in der
            EU) oder Google Gemini ein. Die Eingaben werden von diesen
            Anbietern nicht zum Training ihrer Modelle verwendet. Bitte gib im
            Chat keine sensiblen personenbezogenen Daten ein.
          </p>
        </Section>

        <Section title="Gespeicherte Daten deines Kontos">
          <p>
            Zu deinem Konto speichern wir auf unserem Server: deine
            Chat-Verläufe, deine Sammelkörbe (gemerkte Produkte) sowie
            Nutzungsdaten (verbrauchte Token pro Tag zur Durchsetzung des
            fairen Tagesbudgets, Klicks auf Partner-Links). Rechtsgrundlage
            ist Art. 6 Abs. 1 lit. b DSGVO. Chats und Körbe kannst du
            jederzeit selbst löschen.
          </p>
        </Section>

        <Section title="Affiliate-Links und Klick-Erfassung">
          <p>
            Produktempfehlungen enthalten Partner-Links (u.&nbsp;a.
            Amazon-Partnerprogramm, AWIN). Wenn du einen solchen Link
            anklickst, erfassen wir den Klick (Zeitpunkt, dein Konto) – unter
            anderem, um dir dafür zusätzliches Chat-Kontingent gutzuschreiben.
            Nach dem Klick wirst du zum jeweiligen Shop weitergeleitet; dort
            gelten die Datenschutzbestimmungen des Shop-Betreibers.
          </p>
        </Section>

        <Section title="Cookies">
          <p>
            Wir verwenden ausschließlich technisch notwendige Cookies zur
            Sitzungsverwaltung (Login). Es findet kein Tracking durch
            Drittanbieter statt, und es werden keine Werbe- oder
            Analyse-Cookies gesetzt.
          </p>
        </Section>

        <Section title="Reichweitenmessung (ohne Cookies)">
          <p>
            Zur Verbesserung des Angebots erfassen wir anonyme
            Seitenaufruf-Statistiken auf unserem eigenen Server: aufgerufene
            Seite, Zeitpunkt, Herkunftsseite (Referrer) und Browser-Typ. Dabei
            werden keine Cookies gesetzt, keine IP-Adressen gespeichert und
            keine Nutzerprofile gebildet; eine Zuordnung zu deiner Person ist
            nicht möglich. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO
            (berechtigtes Interesse an der Reichweitenmessung).
          </p>
        </Section>

        <Section title="Hosting">
          <p>
            Diese Website wird auf einem Server in der EU betrieben. Beim
            Aufruf werden technisch notwendige Daten (IP-Adresse, Zeitpunkt,
            aufgerufene Seite) in Server-Logs verarbeitet (Art. 6 Abs. 1
            lit. f DSGVO) und nach kurzer Zeit gelöscht.
          </p>
        </Section>

        <Section title="Deine Rechte">
          <p>
            Du hast das Recht auf Auskunft, Berichtigung, Löschung,
            Einschränkung der Verarbeitung, Datenübertragbarkeit und
            Widerspruch. Wende dich dazu an die oben genannte E-Mail-Adresse.
            Beschwerden kannst du an die österreichische Datenschutzbehörde
            (dsb.gv.at) richten.
          </p>
        </Section>
      </section>
    </main>
  );
}
