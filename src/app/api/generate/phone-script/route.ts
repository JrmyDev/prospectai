import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateText } from "@/lib/gemini";
import { generateTextOpenAI } from "@/lib/openai";
import { logProspectEvent } from "@/lib/prospect-events";

export async function POST(request: NextRequest) {
  const { prospectId } = await request.json();

  const prospect = await prisma.prospect.findUnique({
    where: { id: prospectId },
    include: { analysis: true, generatedSite: true },
  });

  if (!prospect) {
    return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
  }

  const services = prospect.analysis?.servicesRecommended
    ? JSON.parse(prospect.analysis.servicesRecommended)
    : [];

  const hasGeneratedSite = !!prospect.generatedSite?.vercelUrl;

  const prompt = `Rédige un script d'appel téléphonique B2B ULTRA personnalisé pour vendre les services Techvisor.

OBJECTIF:
- Obtenir un rendez-vous de 15 minutes pour un mini-audit gratuit

DONNÉES PROSPECT:
- Entreprise: ${prospect.company}
- Secteur: ${prospect.sector || "non identifié"}
- Ville: ${prospect.city || ""}
- Téléphone: ${prospect.phone || ""}
- Site web: ${prospect.siteUrl || "Aucun"}
- Fiche Google: ${prospect.analysis?.googleRating ? `${prospect.analysis.googleRating}/5 (${prospect.analysis.googleReviewsCount} avis)` : "Non analysée"}
- Score site web: ${prospect.analysis?.websiteScore || "N/A"}
- Site démo généré: ${hasGeneratedSite ? prospect.generatedSite!.vercelUrl : "Non"}

SERVICES RECOMMANDÉS:
${services.map((s: { name: string; reason: string }) => `- ${s.name}: ${s.reason}`).join("\n") || "- Aucun"}

STRUCTURE DU SCRIPT:
1. Ouverture courte et polie (10-15s)
2. Pitch ultra bref (20-30s) avec 1 bénéfice concret
3. 2 questions de découverte intelligentes
4. Proposition de valeur Techvisor en 1 phrase
5. Preuve sociale légère (ex: "On aide des PME comme vous")
6. CTA clair pour caler 15 min
7. Gestion de 3 objections courantes ("pas le temps", "déjà un prestataire", "pas prioritaire")
8. Clôture positive

STYLE:
- Français, naturel, pas agressif
- Ton direct, pro et confiant
- Pas de promesses irréalistes
- Évite les superlatifs excessifs
- Longueur minimale: 1800 caractères (sinon complète)

FORMAT STRICT (SANS MARKDOWN, SANS INTRO, SANS TITRES STYLÉS):
TITRE: <une ligne>
OUVERTURE: <1-2 phrases>
PITCH: <2-3 phrases>
QUESTIONS:
- <question 1>
- <question 2>
PROPOSITION: <1 phrase>
PREUVE: <1 phrase>
CTA: <1 phrase>
OBJECTIONS:
- Pas le temps: <réponse courte>
- Déjà un prestataire: <réponse courte>
- Pas prioritaire: <réponse courte>
CLOTURE: <1 phrase>

INTERDICTIONS:
- Pas de Markdown
- Pas de préambule type "Voici un script..."`;

  const systemInstruction =
    "Tu es un expert en vente B2B par téléphone. Tu écris des scripts efficaces, crédibles et adaptés au prospect.";

  let script = "";
  let model = "gemini-2.5-flash";

  try {
    script = await generateTextOpenAI(prompt, systemInstruction, {
      model: "gpt-5.2-codex",
      maxOutputTokens: 2400,
      temperature: 0.6,
    });
    model = "gpt-5.2-codex";
  } catch {
    script = await generateText(prompt, systemInstruction, {
      model: "gemini-2.5-flash",
      maxOutputTokens: 2400,
      temperature: 0.6,
    });
    model = "gemini-2.5-flash";
  }

  const clean = stripPhoneScript(script);

  await logProspectEvent(prospectId, "phone_script_generated", "Script téléphonique généré", {
    model,
    script: clean,
  });

  return NextResponse.json({ success: true, model, script: clean });
}

function stripPhoneScript(input: string): string {
  let out = input.trim();

  if (out.startsWith("```")) {
    const firstNewline = out.indexOf("\n");
    if (firstNewline !== -1) {
      out = out.slice(firstNewline + 1);
    }
  }

  if (out.endsWith("```")) {
    out = out.slice(0, -3);
  }

  if (out.toLowerCase().startsWith("voici")) {
    const firstNewline = out.indexOf("\n");
    if (firstNewline !== -1) {
      out = out.slice(firstNewline + 1);
    }
  }

  return out.trim();
}
