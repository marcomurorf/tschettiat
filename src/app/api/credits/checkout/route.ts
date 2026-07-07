// Stripe-Checkout: erstellt eine Checkout-Session für ein Token-Paket.
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/auth";
import { loadSettings } from "@/lib/settings";
import { SITE_URL } from "@/lib/site";

export async function POST(req: NextRequest) {
  const session = await auth();
  const devBypass =
    process.env.NODE_ENV !== "production" && process.env.DEV_SKIP_AUTH === "1";
  if (!session?.user && !devBypass) {
    return new Response(null, { status: 401 });
  }
  const userId = session?.user?.email ?? "dev";

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "Zahlungen sind derzeit nicht verfügbar." },
      { status: 503 }
    );
  }

  const { packageId } = (await req.json()) as { packageId?: string };
  const settings = await loadSettings();
  const pkg = (settings.creditPackages ?? []).find((p) => p.id === packageId);
  if (!pkg) {
    return NextResponse.json({ error: "Unbekanntes Paket." }, { status: 400 });
  }

  const stripe = new Stripe(key);
  const checkout = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: userId.includes("@") ? userId : undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: pkg.priceCents,
          product_data: {
            name: `Tschetti Credits – ${pkg.name}`,
            description: `${pkg.tokens.toLocaleString("de-AT")} Tokens für tschetti.at`,
          },
        },
      },
    ],
    // Gutschrift erfolgt im Webhook anhand dieser Metadaten.
    metadata: {
      userId,
      packageId: pkg.id,
      tokens: String(pkg.tokens),
    },
    success_url: `${SITE_URL}/?credits=success`,
    cancel_url: `${SITE_URL}/?credits=cancel`,
  });

  return NextResponse.json({ url: checkout.url });
}
