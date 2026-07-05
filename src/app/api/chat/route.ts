// Chat-Endpunkt: streamt LLM-Antworten; Produkt-Empfehlungen kommen als
// Tool-Call "showProducts" und werden im Frontend als Karten gerendert.
import {
  streamText,
  generateText,
  tool,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { auth } from "@/auth";
import { loadSettings } from "@/lib/settings";
import { getModel } from "@/lib/llm";
import { searchLink, productLink, productImage } from "@/lib/shops";
import {
  saveChat,
  loadChat,
  titleFromMessages,
  isValidChatId,
} from "@/lib/chats";
import { loadBaskets } from "@/lib/baskets";
import {
  isOverLimit,
  recordUsage,
  minutesUntilReset,
} from "@/lib/tokenlimit";

export const maxDuration = 60;

const SYSTEM_PROMPT = `Du bist Tschetti, ein freundlicher österreichischer Einkaufs- und Lösungsassistent.
Du hilfst Nutzern, das richtige Produkt, die richtige Reise oder die passende Lösung zu finden.

Regeln:
- Stelle bei vagen Anfragen 1-2 gezielte Rückfragen (Budget, Einsatzzweck), bevor du empfiehlst.
- Wenn du konkrete Produkte empfiehlst, rufe IMMER das Tool "showProducts" mit 2-4 Produkten auf.
- Begründe für jedes Produkt kurz und ehrlich, warum genau du es empfiehlst (Feld "reason") – bezogen auf die Anfrage des Nutzers.
- Fasse im Feld "reviewSummary" zusammen, was Nutzer an dem Produkt erfahrungsgemäß loben oder kritisieren. Nur wenn du das Produkt gut genug kennst, sonst weglassen. Keine erfundenen Bewertungszahlen.
- Nenne im Fließtext keine Preise oder Links – das übernehmen die Produkt-Karten.
- Empfiehl nur Produkte, die es wirklich gibt. Gib eine Amazon-ASIN NUR an, wenn du dir zu 100 % sicher bist – erfinde niemals eine ASIN, ungültige werden verworfen. Im Zweifel weglassen.
- Sucht der Nutzer eine komplette Ausrüstung oder ein Set (z. B. "alles für ein Campingwochenende"), stelle ein vollständiges Set aus bis zu 8 Produkten zusammen und gib jedem Produkt eine passende "category" (z. B. "Zelt", "Schlafen", "Kochen", "Licht").
- Der Nutzer hat Sammelkörbe mit gemerkten Produkten. Bezieht er sich darauf (z. B. "Passt der Schlafsack zu meiner Decke?", "Was fehlt mir noch?"), rufe zuerst das Tool "getBaskets" auf und beziehe dich auf die konkreten Produkte darin.
- Antworte auf Deutsch, locker aber kompetent, ohne Floskeln.`;

// Prüft eine Amazon-ASIN über den Bild-Endpunkt: ungültige ASINs liefern
// ein winziges Platzhalter-GIF (< 1 KB), echte Produktbilder sind größer.
async function asinExists(imageUrl: string): Promise<boolean> {
  try {
    const res = await fetch(imageUrl, {
      method: "HEAD",
      signal: AbortSignal.timeout(3000),
    });
    const len = Number(res.headers.get("content-length") ?? 0);
    return res.ok && len > 1000;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const session = await auth();
  const devBypass =
    process.env.NODE_ENV !== "production" && process.env.DEV_SKIP_AUTH === "1";
  if (!session?.user && !devBypass) {
    return new Response("Bitte zuerst anmelden.", { status: 401 });
  }
  const userId = session?.user?.email ?? "dev";

  const { messages, id: chatId }: { messages: UIMessage[]; id?: string } =
    await req.json();
  const settings = await loadSettings();
  const shops = settings.shops.filter((s) => s.enabled);

  // Tokenbudget pro Stunde prüfen, bevor das LLM angeworfen wird.
  const tokenLimit = settings.limits?.tokensPerHour ?? 20000;
  if (isOverLimit(userId, tokenLimit)) {
    return new Response(
      `Stundenlimit erreicht – bitte versuch es in ${minutesUntilReset(userId)} Minuten nochmal.`,
      { status: 429 }
    );
  }

  const result = streamText({
    model: getModel(settings),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    onFinish: ({ totalUsage }) => {
      recordUsage(userId, totalUsage?.totalTokens ?? 0);
    },
    tools: {
      getBaskets: tool({
        description:
          "Liest alle Sammelkörbe des Nutzers mit den gemerkten Produkten.",
        inputSchema: z.object({}),
        execute: async () => ({ baskets: await loadBaskets(userId) }),
      }),
      showProducts: tool({
        description:
          "Zeigt dem Nutzer Produkt-Karten an. Für jede konkrete Produktempfehlung aufrufen.",
        inputSchema: z.object({
          products: z
            .array(
              z.object({
                name: z.string().describe("Voller Produktname"),
                brand: z.string().optional(),
                priceHint: z
                  .string()
                  .optional()
                  .describe("Grobe Preisspanne, z.B. 'ca. 80-120 €'"),
                pros: z.array(z.string()).max(3).describe("2-3 Stärken"),
                bestFor: z.string().describe("Für wen/was ideal"),
                reason: z
                  .string()
                  .describe(
                    "1-2 Sätze: Warum empfiehlst du genau dieses Produkt für diese Anfrage?"
                  ),
                reviewSummary: z
                  .string()
                  .optional()
                  .describe(
                    "Was Nutzer erfahrungsgemäß loben/kritisieren, 1-2 Sätze. Weglassen wenn unsicher."
                  ),
                category: z
                  .string()
                  .optional()
                  .describe(
                    "Kategorie bei Set-Empfehlungen, z.B. 'Zelt' oder 'Kochen'"
                  ),
                asin: z
                  .string()
                  .optional()
                  .describe(
                    "Amazon-ASIN, NUR wenn 100% sicher bekannt, niemals raten"
                  ),
                searchQuery: z
                  .string()
                  .describe("Präziser Suchbegriff für Shop-Suche"),
              })
            )
            .min(1)
            .max(8),
        }),
        execute: async ({ products }) => {
          const amazon = shops.find((s) => s.id === "amazon");
          // Erfundene ASINs aussortieren: Bild-Check gegen Amazon.
          const checked = await Promise.all(
            products.map(async (p) => {
              if (!p.asin || !amazon?.imageUrl) return p;
              const img = productImage(amazon, p.asin);
              const ok = img ? await asinExists(img) : false;
              return ok ? p : { ...p, asin: undefined };
            })
          );
          return {
            products: checked.map((p) => ({
              ...p,
              offers: shops.map((shop) => ({
                shop: shop.name,
                url:
                  p.asin && shop.id === "amazon"
                    ? productLink(shop, p.asin)
                    : searchLink(shop, p.searchQuery),
                image:
                  p.asin && shop.id === "amazon"
                    ? productImage(shop, p.asin)
                    : undefined,
              })),
            })),
          };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    onFinish: async ({ messages: allMessages }) => {
      if (!isValidChatId(chatId)) return;
      // Beim ersten Speichern eine knappe Headline vom LLM erzeugen lassen.
      const existing = await loadChat(userId, chatId!);
      let title = existing?.title;
      if (!title) {
        try {
          const { text } = await generateText({
            model: getModel(settings),
            prompt: `Fasse dieses Einkaufs-Anliegen als knappe Überschrift zusammen (max. 5 Wörter, Deutsch, keine Anführungszeichen): "${titleFromMessages(allMessages)}"`,
          });
          title = text.trim().replace(/^["']|["']$/g, "").slice(0, 60);
        } catch {
          // Fallback unten
        }
      }
      await saveChat(userId, {
        id: chatId!,
        title: title || titleFromMessages(allMessages),
        updatedAt: Date.now(),
        messages: allMessages,
      });
    },
  });
}
