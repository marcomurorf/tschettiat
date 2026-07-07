// Schritt 1 des Hotel-Checkouts: frische Offer holen und vormerken (Prebook).
// Liefert finalen Preis + Stornobedingungen für die Bestätigungsansicht.
import { auth } from "@/auth";
import { getFreshOffer, prebookHotel } from "@/lib/travel";

export async function POST(req: Request) {
  const session = await auth();
  const devBypass =
    process.env.NODE_ENV !== "production" && process.env.DEV_SKIP_AUTH === "1";
  if (!session?.user && !devBypass) {
    return Response.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  let body: { hotelId?: string; checkin?: string; checkout?: string; adults?: number };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const { hotelId, checkin, checkout, adults } = body;
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  if (
    !hotelId ||
    typeof hotelId !== "string" ||
    !checkin ||
    !dateRe.test(checkin) ||
    !checkout ||
    !dateRe.test(checkout)
  ) {
    return Response.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const offer = await getFreshOffer({
    hotelId,
    checkin,
    checkout,
    adults: typeof adults === "number" ? Math.min(Math.max(1, adults), 6) : 2,
  });
  if (!offer) {
    return Response.json(
      { error: "Für dieses Hotel ist gerade kein buchbares Angebot verfügbar." },
      { status: 404 }
    );
  }

  const prebook = await prebookHotel(offer.offerId);
  if (!prebook) {
    return Response.json(
      { error: "Das Angebot konnte nicht fixiert werden. Bitte erneut versuchen." },
      { status: 502 }
    );
  }

  return Response.json({
    prebookId: prebook.prebookId,
    price: prebook.price,
    currency: prebook.currency,
    checkin: prebook.checkin ?? checkin,
    checkout: prebook.checkout ?? checkout,
    hotelName: offer.hotelName,
    roomName: offer.roomName,
    boardName: offer.boardName,
    refundableTag: offer.refundableTag,
    cancelPolicyText: offer.cancelPolicyText,
  });
}
