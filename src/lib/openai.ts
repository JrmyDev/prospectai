import { getApiKeys } from "./settings";

export interface OpenAITextOptions {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export async function generateTextOpenAI(
  prompt: string,
  systemInstruction?: string,
  options?: OpenAITextOptions
): Promise<string> {
  const keys = await getApiKeys();
  const apiKey = keys.openai;
  if (!apiKey) {
    throw new Error("OpenAI API key not configured");
  }

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options?.model || "gpt-5.2-codex",
      input: prompt,
      instructions: systemInstruction,
      temperature: options?.temperature ?? 0.7,
      max_output_tokens: options?.maxOutputTokens ?? 4096,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`OpenAI Responses API error: ${res.status} ${detail}`);
  }

  const data = await res.json();

  if (typeof data?.output_text === "string" && data.output_text.length) {
    return data.output_text;
  }

  const output = Array.isArray(data?.output) ? data.output : [];
  const texts = output.flatMap((item: any) => {
    const content = Array.isArray(item?.content) ? item.content : [];
    return content
      .filter((c: any) => c?.type === "output_text" || c?.type === "text")
      .map((c: any) => c?.text)
      .filter(Boolean);
  });

  return texts.join("") || "";
}
