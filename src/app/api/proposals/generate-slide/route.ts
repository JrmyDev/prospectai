import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/lib/gemini";
import { generateTextOpenAI } from "@/lib/openai";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { prompt, existingSlide, brand, client } = body as {
    prompt: string;
    existingSlide?: { title?: string; content?: string; highlight?: string };
    brand?: { name?: string; primaryColor?: string; secondaryColor?: string; fontGoogle?: string };
    client?: { name?: string; sector?: string; city?: string };
  };

  if (!prompt) {
    return NextResponse.json({ error: "prompt required" }, { status: 400 });
  }

  const brandBlock = brand
    ? `BRAND:
- Nom: ${brand.name || ""}
- Couleurs: primary=${brand.primaryColor || ""}, secondary=${brand.secondaryColor || ""}
- Google Font: ${brand.fontGoogle || ""}`
    : "BRAND: non fourni";

  const clientBlock = client
    ? `CLIENT:
- Nom: ${client.name || ""}
- Secteur: ${client.sector || ""}
- Ville: ${client.city || ""}`
    : "CLIENT: non fourni";

  const existingBlock = existingSlide
    ? `SLIDE ACTUELLE:
- Titre: ${existingSlide.title || ""}
- Contenu: ${existingSlide.content || ""}
- Highlight: ${existingSlide.highlight || ""}`
    : "SLIDE ACTUELLE: aucune";

  const systemInstruction =
    "Tu es un directeur artistique et rédacteur. Tu produis une slide courte, claire, cohérente avec un design premium.";

  const slidePrompt = `Génère UNE slide de proposition commerciale.

${brandBlock}
${clientBlock}
${existingBlock}

BRIEF:
${prompt}

CONTRAINTES:
- Retourne uniquement du JSON valide
- Format JSON EXACT: {"title":"...", "content":"...", "highlight":"..."}
- content: 2 à 6 phrases, concises
- highlight: optionnel ("" si non pertinent)
- Pas de markdown, pas d'explications
`;

  let raw = "";
  try {
    raw = await generateText(slidePrompt, systemInstruction, {
      model: "gemini-3-pro-preview",
      maxOutputTokens: 1200,
      temperature: 0.4,
    });
  } catch {
    raw = await generateTextOpenAI(slidePrompt, systemInstruction, {
      model: "gpt-5.2-codex",
      maxOutputTokens: 1200,
      temperature: 0.4,
    });
  }

  const json = extractJson(raw);
  if (!json) {
    return NextResponse.json({ error: "Invalid JSON from model" }, { status: 500 });
  }

  return NextResponse.json({ slide: json });
}

function extractJson(raw: string): { title: string; content: string; highlight: string } | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < 0) return null;
  const slice = raw.slice(start, end + 1);
  try {
    const obj = JSON.parse(slice);
    return {
      title: String(obj.title || "").trim(),
      content: String(obj.content || "").trim(),
      highlight: String(obj.highlight || "").trim(),
    };
  } catch {
    return null;
  }
}
