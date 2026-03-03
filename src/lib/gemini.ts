import { GoogleGenAI } from "@google/genai";
import { getApiKeys } from "./settings";

let aiClient: GoogleGenAI | null = null;

export async function getGemini(): Promise<GoogleGenAI> {
  if (!aiClient) {
    const keys = await getApiKeys();
    aiClient = new GoogleGenAI({ apiKey: keys.gemini });
  }
  return aiClient;
}

export interface GenerateTextOptions {
  maxOutputTokens?: number;
  temperature?: number;
  model?: string;
}

export async function generateText(
  prompt: string,
  systemInstruction?: string,
  options?: GenerateTextOptions
): Promise<string> {
  const ai = await getGemini();
  const response = await ai.models.generateContent({
    model: options?.model ?? "gemini-3-pro-preview",
    contents: prompt,
    config: {
      systemInstruction: systemInstruction || "Tu es un expert en marketing digital et prospection commerciale B2B en France.",
      temperature: options?.temperature ?? 0.7,
      maxOutputTokens: options?.maxOutputTokens ?? 4096,
    },
  });
  return response.text || "";
}

export async function generateJson<T>(
  prompt: string,
  systemInstruction?: string,
  options?: GenerateTextOptions
): Promise<T> {
  const ai = await getGemini();
  const response = await ai.models.generateContent({
    model: options?.model ?? "gemini-3-pro-preview",
    contents: prompt,
    config: {
      systemInstruction: systemInstruction || "Tu es un expert en marketing digital et prospection commerciale B2B en France. Réponds UNIQUEMENT en JSON valide, sans markdown.",
      temperature: options?.temperature ?? 0.3,
      maxOutputTokens: options?.maxOutputTokens ?? 4096,
      responseMimeType: "application/json",
    },
  });
  const text = response.text || "{}";
  return JSON.parse(text) as T;
}
