// Chat-Endpunkt: streamt LLM-Antworten; Produkt-Empfehlungen kommen als
// Tool-Call "showProducts" und werden im Frontend als Karten gerendert.
import { streamText, tool, convertToModelMessages, type UIMessage } from "ai";
import { z } from "zod";
import { auth } from "@/auth";
import { loadSettings } from "@/lib/settings";
import { getModel } from "@/lib/llm";
import { searchLink, productLink, productImage } from "@/lib/shops";

export const maxDuration = 60;

const SYSTEM_PROMPT = `Du bist Tschetti, ein freundlicher österreichischer Einkaufs- und Lösungsassistent.
Du hilfst Nutzern, das richtige Produkt, die richtige Reise oder die passende Lösung zu finden.

Regeln:
- Stelle bei vagen Anfragen 1-2 gezielte Rückfragen (Budget, Einsatzzweck), bevor du empfiehlst.
- Wenn du konkrete Produkte empfiehlst, rufe IMMER das Tool "showProducts" mit 2-4 Produkten auf.
- Nenne im Fließtext keine Preise oder Links – das übernehmen die Produkt-Karten.
- Empfiehl nur Produkte, die es wirklich gibt. Wenn du eine Amazon-ASIN sicher kennst, gib sie an, sonst lass sie weg.
- Antworte auf Deutsch, locker aber kompetent, ohne Floskeln.`;

export async function POST(req: Request) {
  const session = await auth();
  const devBypass =
    process.env.NODE_ENV !== "production" && process.env.DEV_SKIP_AUTH === "1";
  if (!session?.user && !devBypass) {
    return new Response("Bitte zuerst anmelden.", { status: 401 });
  }

  const { messages }: { messages: UIMessage[] } = await req.json();
  const settings = await loadSettings();
  const shops = settings.shops.filter((s) => s.enabled);

  const result = streamText({
    model: getModel(settings),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: {
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
                asin: z
                  .string()
                  .optional()
                  .describe("Amazon-ASIN, nur wenn sicher bekannt"),
                searchQuery: z
                  .string()
                  .describe("Präziser Suchbegriff für Shop-Suche"),
              })
            )
            .min(1)
            .max(4),
        }),
        execute: async ({ products }) => ({
          products: products.map((p) => ({
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
        }),
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
