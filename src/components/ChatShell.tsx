"use client";

// Rahmen um den Chat: Sidebar mit Chatverläufen + aktiver Chat.
import { useCallback, useEffect, useState } from "react";
import type { UIMessage } from "ai";
import { Chat } from "./Chat";
import { Basket } from "./Basket";

interface ChatMeta {
  id: string;
  title: string;
  updatedAt: number;
}

function newChatId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 24);
}

export function ChatShell() {
  const [chats, setChats] = useState<ChatMeta[]>([]);
  const [activeId, setActiveId] = useState<string>(() => newChatId());
  const [initialMessages, setInitialMessages] = useState<
    UIMessage[] | undefined
  >(undefined);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const refreshList = useCallback(async () => {
    try {
      const res = await fetch("/api/chats");
      if (res.ok) setChats(await res.json());
    } catch {
      // Liste ist nicht kritisch
    }
  }, []);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  const openChat = async (id: string) => {
    if (id === activeId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/chats/${id}`);
      if (res.ok) {
        const chat = await res.json();
        setInitialMessages(chat.messages);
        setActiveId(id);
      }
    } finally {
      setLoading(false);
      setSidebarOpen(false);
    }
  };

  const startNew = () => {
    setInitialMessages(undefined);
    setActiveId(newChatId());
    setSidebarOpen(false);
  };

  const removeChat = async (id: string) => {
    await fetch(`/api/chats/${id}`, { method: "DELETE" });
    setChats((c) => c.filter((x) => x.id !== id));
    if (id === activeId) startNew();
  };

  return (
    <div className="flex flex-1 min-h-0">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "flex" : "hidden"
        } md:flex flex-col w-64 shrink-0 border-r border-cream-dark bg-card/50 absolute md:static inset-y-0 left-0 z-20 md:z-auto bg-cream md:bg-transparent`}
      >
        <div className="p-3">
          <button
            onClick={startNew}
            className="w-full text-sm font-medium bg-accent hover:bg-accent-dark text-white rounded-lg py-2 transition-colors"
          >
            + Neuer Chat
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto chat-scroll px-2 pb-3 space-y-0.5">
          {chats.length === 0 && (
            <p className="text-xs text-ink-soft px-2 py-1">
              Noch keine Verläufe.
            </p>
          )}
          {chats.map((c) => (
            <div
              key={c.id}
              className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm cursor-pointer transition-colors ${
                c.id === activeId
                  ? "bg-accent-soft text-ink"
                  : "hover:bg-cream-dark/50 text-ink-soft"
              }`}
              onClick={() => openChat(c.id)}
            >
              <span className="flex-1 truncate">{c.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeChat(c.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-ink-soft hover:text-accent transition-opacity px-1"
                aria-label="Chat löschen"
                title="Chat löschen"
              >
                ✕
              </button>
            </div>
          ))}
        </nav>
      </aside>

      {/* Mobile: Sidebar-Toggle */}
      <button
        onClick={() => setSidebarOpen((o) => !o)}
        className="md:hidden absolute top-16 left-3 z-30 bg-card border border-cream-dark rounded-lg px-2.5 py-1.5 text-sm shadow-sm"
        aria-label="Chatverläufe"
      >
        ☰
      </button>
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-ink/20 z-10"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Aktiver Chat – key erzwingt Remount beim Wechsel */}
      <div className="flex flex-col flex-1 min-w-0">
        {loading ? (
          <div className="flex-1 grid place-items-center text-ink-soft text-sm">
            Lade Verlauf…
          </div>
        ) : (
          <Chat
            key={activeId}
            chatId={activeId}
            initialMessages={initialMessages}
            onChatUpdated={refreshList}
          />
        )}
      </div>

      <Basket />
    </div>
  );
}
