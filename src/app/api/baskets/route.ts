// Sammelkorb-API: GET = alle Körbe, POST = Item hinzufügen,
// DELETE = Item oder ganzen Korb entfernen.
import { auth } from "@/auth";
import {
  loadBaskets,
  addItem,
  removeItem,
  removeBasket,
} from "@/lib/baskets";

async function getUserId(): Promise<string | null> {
  const session = await auth();
  const devBypass =
    process.env.NODE_ENV !== "production" && process.env.DEV_SKIP_AUTH === "1";
  if (!session?.user && !devBypass) return null;
  return session?.user?.email ?? "dev";
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return new Response("Bitte zuerst anmelden.", { status: 401 });
  return Response.json(await loadBaskets(userId));
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return new Response("Bitte zuerst anmelden.", { status: 401 });
  const { basket, item } = await req.json();
  if (typeof basket !== "string" || !item?.name || !item?.url) {
    return new Response("Ungültige Daten.", { status: 400 });
  }
  return Response.json(await addItem(userId, basket, item));
}

export async function DELETE(req: Request) {
  const userId = await getUserId();
  if (!userId) return new Response("Bitte zuerst anmelden.", { status: 401 });
  const { basket, key } = await req.json();
  if (typeof basket !== "string") {
    return new Response("Ungültige Daten.", { status: 400 });
  }
  const baskets = key
    ? await removeItem(userId, basket, key)
    : await removeBasket(userId, basket);
  return Response.json(baskets);
}
