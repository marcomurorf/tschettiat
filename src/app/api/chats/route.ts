// Liste der Chatverläufe des angemeldeten Users.
import { auth } from "@/auth";
import { listChats } from "@/lib/chats";

export async function GET() {
  const session = await auth();
  const devBypass =
    process.env.NODE_ENV !== "production" && process.env.DEV_SKIP_AUTH === "1";
  if (!session?.user && !devBypass) {
    return new Response("Bitte zuerst anmelden.", { status: 401 });
  }
  const userId = session?.user?.email ?? "dev";
  return Response.json(await listChats(userId));
}
