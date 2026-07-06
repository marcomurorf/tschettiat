// Chatverläufe in SQLite (Tabelle chats).
import type { UIMessage } from "ai";
import { db } from "./db";

export interface ChatMeta {
  id: string;
  title: string;
  updatedAt: number;
}

export interface StoredChat extends ChatMeta {
  messages: UIMessage[];
}

export function isValidChatId(id: unknown): id is string {
  return typeof id === "string" && /^[a-zA-Z0-9_-]{8,64}$/.test(id);
}

export async function listChats(userId: string): Promise<ChatMeta[]> {
  const rows = db
    .prepare(
      "SELECT id, title, updated_at FROM chats WHERE user_id = ? ORDER BY updated_at DESC"
    )
    .all(userId) as unknown as { id: string; title: string; updated_at: number }[];
  return rows.map((r) => ({ id: r.id, title: r.title, updatedAt: r.updated_at }));
}

export async function loadChat(
  userId: string,
  chatId: string
): Promise<StoredChat | null> {
  if (!isValidChatId(chatId)) return null;
  const row = db
    .prepare(
      "SELECT id, title, updated_at, messages FROM chats WHERE user_id = ? AND id = ?"
    )
    .get(userId, chatId) as unknown as
    | { id: string; title: string; updated_at: number; messages: string }
    | undefined;
  if (!row) return null;
  try {
    return {
      id: row.id,
      title: row.title,
      updatedAt: row.updated_at,
      messages: JSON.parse(row.messages) as UIMessage[],
    };
  } catch {
    return null;
  }
}

export async function saveChat(
  userId: string,
  chat: StoredChat
): Promise<void> {
  if (!isValidChatId(chat.id)) return;
  db.prepare(
    `INSERT INTO chats (user_id, id, title, updated_at, messages)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (user_id, id) DO UPDATE SET
       title = excluded.title,
       updated_at = excluded.updated_at,
       messages = excluded.messages`
  ).run(userId, chat.id, chat.title, chat.updatedAt, JSON.stringify(chat.messages));
}

export async function deleteChat(
  userId: string,
  chatId: string
): Promise<void> {
  if (!isValidChatId(chatId)) return;
  db.prepare("DELETE FROM chats WHERE user_id = ? AND id = ?").run(
    userId,
    chatId
  );
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
