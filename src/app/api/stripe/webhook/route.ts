// Stripe-Webhook: schreibt nach erfolgreicher Zahlung die Credits gut.
// Im Stripe-Dashboard als Endpoint eintragen:
//   https://tschetti.at/api/stripe/webhook  (Event: checkout.session.completed)
import Stripe from "stripe";
import { addCredits } from "@/lib/credits";
import { logEvent } from "@/lib/db";

export async function POST(req: Request) {
  const key = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!key || !webhookSecret) {
    return new Response("Stripe nicht konfiguriert", { status: 503 });
  }

  const stripe = new Stripe(key);
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Signatur fehlt", { status: 400 });

  // Signatur-Prüfung braucht den ROHEN Body.
  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      webhookSecret
    );
  } catch {
    return new Response("Ungültige Signatur", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    const tokens = Number(session.metadata?.tokens ?? 0);
    if (userId && tokens > 0 && session.payment_status === "paid") {
      // session.id als Referenz macht die Gutschrift idempotent
      // (Stripe kann Webhooks mehrfach zustellen).
      const credited = addCredits(userId, tokens, "purchase", session.id);
      if (credited) {
        logEvent(userId, "credits_purchased", {
          tokens,
          packageId: session.metadata?.packageId,
          amountCents: session.amount_total,
        });
      }
    }
  }

  return new Response(null, { status: 200 });
}
