"use client";

// Gemeinsamer Hook für alle Admin-Unterseiten: Settings laden + speichern.
import { useEffect, useState } from "react";
import type { Settings } from "@/lib/settings";

export function useAdminSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => setMsg("✗ Einstellungen konnten nicht geladen werden"));
  }, []);

  const save = async (override?: Settings) => {
    const body = override ?? settings;
    if (!body) return;
    setMsg("Speichere …");
    const r = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setMsg(r.ok ? "✓ Gespeichert" : "✗ Fehler beim Speichern");
    setTimeout(() => setMsg(""), 3000);
  };

  return { settings, setSettings, save, msg };
}
