// Einzelnen Chatverlauf laden oder löschen.
import { auth } from "@/auth";
import { loadChat, deleteChat, isValidChatId } from "@/lib/chats";

async function getUserId(): Promise<string | null> {
  const session = await auth();
  const devBypass =
    process.env.NODE_ENV !== "production" && process.env.DEV_SKIP_AUTH === "1";
  if (!session?.user && !devBypass) return null;
  return session?.user?.email ?? "dev";
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId();
  if (!userId) return new Response("Bitte zuerst anmelden.", { status: 401 });
  const { id } = await params;
  if (!isValidChatId(id)) return new Response("Ungültige ID.", { status: 400 });
  const chat = await loadChat(userId, id);
  if (!chat) return new Response("Nicht gefunden.", { status: 404 });
  return Response.json(chat);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId();
  if (!userId) return new Response("Bitte zuerst anmelden.", { status: 401 });
  const { id } = await params;
  if (!isValidChatId(id)) return new Response("Ungültige ID.", { status: 400 });
  await deleteChat(userId, id);
  return new Response(null, { status: 204 });
}
