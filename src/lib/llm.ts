// LLM-Auswahl anhand der Admin-Einstellungen (Vercel AI SDK).
import { createAzure } from "@ai-sdk/azure";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";
import type { Settings } from "./settings";

export function getModel(settings: Settings): LanguageModel {
  const { provider, model } = settings.llm;
  if (provider === "google") {
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    });
    return google(model);
  }
  // Entweder kompletter Endpoint (z.B. https://xyz.cognitiveservices.azure.com)
  // oder nur der Ressourcen-Name.
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const azure = createAzure({
    ...(endpoint
      ? { baseURL: `${endpoint.replace(/\/$/, "")}/openai/v1` }
      : { resourceName: process.env.AZURE_OPENAI_RESOURCE }),
    apiKey: process.env.AZURE_OPENAI_API_KEY,
  });
  return azure(model);
}
