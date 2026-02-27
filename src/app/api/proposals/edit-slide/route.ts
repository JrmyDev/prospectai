import { NextRequest, NextResponse } from "next/server";
import { generateJson } from "@/lib/gemini";
import { populateSlideFromAI } from "@/lib/presentations/layouts";
import type { AISlidePayload, PresentationTheme, PresentationSlide, SlideFormat } from "@/lib/presentations/types";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { prompt, action, currentSlide, format: rawFormat, theme: themeJson } = body;

  if (!prompt) {
    return NextResponse.json({ error: "prompt required" }, { status: 400 });
  }

  const format: SlideFormat = rawFormat === "A4" ? "A4" : "16:9";
  let theme: PresentationTheme;
  try {
    theme = JSON.parse(themeJson);
  } catch {
    return NextResponse.json({ error: "Invalid theme JSON" }, { status: 400 });
  }

  const systemInstruction =
    "Tu es un directeur artistique spécialisé dans les présentations commerciales. Tu produis du JSON structuré impeccable.";

  if (action === "add") {
    const addPrompt = `Génère UNE SEULE nouvelle slide de présentation commerciale en JSON.

INSTRUCTION DE L'UTILISATEUR: ${prompt}

Retourne un objet JSON avec cette structure:
{
  "layout": "titleContent"|"twoColumns"|"stats"|"quote"|"imageLeft"|"imageRight"|"fullImage"|"section",
  "background": { "type": "solid", "color": "#hex" },
  "elements": [
    { "type": "heading"|"subheading"|"body"|"bulletList"|"stat"|"quote"|"image", "content": "texte développé", "statValue": "95%", "statLabel": "description du chiffre" }
  ],
  "notes": "notes du présentateur"
}

IMPÉRATIF SUR LA QUALITÉ DU CONTENU:
- Chaque texte body DOIT contenir 3 à 5 phrases développées minimum
- Chaque bulletList DOIT avoir 4 à 6 points détaillés séparés par des \\n
- Les headings doivent être percutants et spécifiques
- Les stats doivent avoir à la fois un statValue chiffré et un statLabel descriptif
- Le contenu doit être concret, professionnel et en français
- PAS de texte placeholder ou générique

Choisis le layout le plus adapté à l'instruction.
Retourne UNIQUEMENT l'objet JSON.`;

    try {
      const aiPayload = await generateJson<AISlidePayload>(addPrompt, systemInstruction);
      const slide = populateSlideFromAI(aiPayload, theme, format);
      return NextResponse.json({ success: true, slide });
    } catch {
      return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
    }
  }

  // action === "edit"
  let currentSlideData: PresentationSlide;
  try {
    currentSlideData = JSON.parse(currentSlide);
  } catch {
    return NextResponse.json({ error: "Invalid slide JSON" }, { status: 400 });
  }

  const editPrompt = `Modifie cette slide de présentation selon l'instruction utilisateur.

SLIDE ACTUELLE (JSON):
${JSON.stringify(currentSlideData, null, 2)}

INSTRUCTION DE L'UTILISATEUR: ${prompt}

Retourne la slide MODIFIÉE au format JSON complet:
{
  "id": "${currentSlideData.id}",
  "layout": "${currentSlideData.layout}",
  "elements": [...],
  "background": {...},
  "notes": "..."
}

IMPÉRATIF:
- Conserve l'ID de la slide et des éléments quand possible
- Modifie UNIQUEMENT ce qui correspond à l'instruction
- Chaque texte body modifié doit rester riche (3-5 phrases minimum)
- Les headings doivent être percutants et spécifiques
- Si tu améliores du texte, développe-le davantage, ne le raccourcis pas
- Tu peux changer le layout si ça rend la slide plus percutante
- Contenu en français, professionnel et concret
- Retourne UNIQUEMENT le JSON complet de la slide`;

  try {
    const editedSlide = await generateJson<PresentationSlide>(editPrompt, systemInstruction);
    // Preserve the original ID
    editedSlide.id = currentSlideData.id;
    return NextResponse.json({ success: true, slide: editedSlide });
  } catch {
    return NextResponse.json({ error: "AI edit failed" }, { status: 500 });
  }
}
