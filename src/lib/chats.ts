// Chatverlauf-Speicher: eine JSON-Datei pro Chat unter data/chats/<user>/<id>.json.
import { readFile, writeFile, mkdir, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import type { UIMessage } from "ai";

const ROOT = join(process.cwd(), "data", "chats");

export interface ChatMeta {
  id: string;
  title: string;
  updatedAt: number;
}

export interface StoredChat extends ChatMeta {
  messages: UIMessage[];
}

// Nur harmlose Zeichen im Dateinamen zulassen (kein Path-Traversal).
function safe(s: string): string {
  return s.replace(/[^a-zA-Z0-9@._-]/g, "_");
}

export function isValidChatId(id: unknown): id is string {
  return typeof id === "string" && /^[a-zA-Z0-9_-]{8,64}$/.test(id);
}

function userDir(userId: string) {
  return join(ROOT, safe(userId));
}

export async function listChats(userId: string): Promise<ChatMeta[]> {
  let files: string[];
  try {
    files = await readdir(userDir(userId));
  } catch {
    return [];
  }
  const chats: ChatMeta[] = [];
  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    try {
      const raw = await readFile(join(userDir(userId), f), "utf8");
      const { id, title, updatedAt } = JSON.parse(raw) as StoredChat;
      chats.push({ id, title, updatedAt });
    } catch {
      // defekte Datei überspringen
    }
  }
  return chats.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function loadChat(
  userId: string,
  chatId: string
): Promise<StoredChat | null> {
  if (!isValidChatId(chatId)) return null;
  try {
    const raw = await readFile(join(userDir(userId), `${chatId}.json`), "utf8");
    return JSON.parse(raw) as StoredChat;
  } catch {
    return null;
  }
}

export async function saveChat(
  userId: string,
  chat: StoredChat
): Promise<void> {
  if (!isValidChatId(chat.id)) return;
  await mkdir(userDir(userId), { recursive: true });
  await writeFile(
    join(userDir(userId), `${chat.id}.json`),
    JSON.stringify(chat),
    "utf8"
  );
}

export async function deleteChat(
  userId: string,
  chatId: string
): Promise<void> {
  if (!isValidChatId(chatId)) return;
  await rm(join(userDir(userId), `${chatId}.json`), { force: true });
}

// Titel aus der ersten User-Nachricht ableiten.
export function titleFromMessages(messages: UIMessage[]): string {
  const first = messages.find((m) => m.role === "user");
  const text =
    first?.parts
      .filter((p) => p.type === "text")
      .map((p) => (p.type === "text" ? p.text : ""))
      .join(" ")
      .trim() ?? "";
  return text.length > 60 ? text.slice(0, 57) + "…" : text || "Neuer Chat";
}
