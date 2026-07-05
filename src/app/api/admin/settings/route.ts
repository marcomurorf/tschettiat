// Admin-API: Einstellungen lesen/schreiben (geschützt durch middleware.ts).
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { loadSettings, saveSettings } from "@/lib/settings";

const settingsSchema = z.object({
  llm: z.object({
    provider: z.enum(["azure", "google"]),
    model: z.string().min(1).max(100),
  }),
  limits: z
    .object({
      tokensPerHour: z.number().int().min(1000).max(10_000_000),
    })
    .default({ tokensPerHour: 20000 }),
  shops: z.array(
    z.object({
      id: z.string().regex(/^[a-z0-9-]+$/),
      name: z.string().min(1).max(50),
      enabled: z.boolean(),
      domain: z.string().max(100),
      tag: z.string().max(100),
      searchUrl: z.string().url().max(300),
      productUrl: z.string().url().max(300),
      imageUrl: z.string().url().max(300).optional().or(z.literal("")),
    })
  ),
});

export async function GET() {
  return NextResponse.json(await loadSettings());
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungültige Einstellungen", details: parsed.error.issues },
      { status: 400 }
    );
  }
  const s = parsed.data;
  await saveSettings({
    ...s,
    shops: s.shops.map((shop) => ({
      ...shop,
      imageUrl: shop.imageUrl || undefined,
    })),
  });
  return NextResponse.json({ ok: true });
}
