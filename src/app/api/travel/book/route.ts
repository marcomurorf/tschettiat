// Schritt 2 des Hotel-Checkouts: verbindliche Buchung eines Prebooks.
// In der Sandbox wird die Zahlung simuliert (ACC_CREDIT_CARD).
import { auth } from "@/auth";
import { bookHotel } from "@/lib/travel";

export async function POST(req: Request) {
  const session = await auth();
  const devBypass =
    process.env.NODE_ENV !== "production" && process.env.DEV_SKIP_AUTH === "1";
  if (!session?.user && !devBypass) {
    return Response.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  let body: {
    prebookId?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const { prebookId, firstName, lastName, email } = body;
  if (
    !prebookId ||
    typeof prebookId !== "string" ||
    !firstName?.trim() ||
    !lastName?.trim() ||
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return Response.json(
      { error: "Bitte Vorname, Nachname und gültige E-Mail angeben." },
      { status: 400 }
    );
  }

  const result = await bookHotel({
    prebookId,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: email.trim(),
  });
  if (!result) {
    return Response.json(
      { error: "Die Buchung ist fehlgeschlagen. Bitte erneut versuchen." },
      { status: 502 }
    );
  }

  return Response.json(result);
}
