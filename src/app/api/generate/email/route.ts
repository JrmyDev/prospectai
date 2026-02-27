import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateText } from "@/lib/gemini";
import { logProspectEvent } from "@/lib/prospect-events";

// Generate a personalized email for a prospect
export async function POST(request: NextRequest) {
  const { prospectId } = await request.json();

  const prospect = await prisma.prospect.findUnique({
    where: { id: prospectId },
    include: { analysis: true, generatedSite: true },
  });

  if (!prospect) {
    return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
  }

  try {
    const services = prospect.analysis?.servicesRecommended
      ? JSON.parse(prospect.analysis.servicesRecommended)
      : [];

    const hasGeneratedSite = prospect.generatedSite?.vercelUrl;

    // Detect scenario
    let scenario = "general";
    if (!prospect.siteUrl && hasGeneratedSite) scenario = "no_site_with_demo";
    else if (!prospect.siteUrl) scenario = "no_site";
    else if ((prospect.analysis?.websiteScore || 0) < 40) scenario = "bad_site";
    else if (!prospect.analysis?.googleBusinessOptimized) scenario = "google_optim";

    const contactName = prospect.firstName
      ? `${prospect.firstName}${prospect.lastName ? " " + prospect.lastName : ""}`
      : "le dirigeant";

    const prompt = `Rédige un email de prospection B2B professionnel et personnalisé.

CONTEXTE:
- Expéditeur: Jérémy Marquer, expert tech & IA chez Techvisor (techvisor.fr)
- Destinataire: ${contactName} de "${prospect.company}" à ${prospect.city || "proximité"}
- Secteur: ${prospect.sector || "non identifié"}
- Scénario: ${scenario}

DONNÉES D'ANALYSE:
${prospect.siteUrl ? `- Site web: ${prospect.siteUrl} (score: ${prospect.analysis?.websiteScore || "N/A"}/100)` : "- Pas de site web détecté"}
- Fiche Google: ${prospect.analysis?.googleRating ? `${prospect.analysis.googleRating}/5 (${prospect.analysis.googleReviewsCount} avis)` : "Non analysée"}
- Présence réseaux sociaux: ${prospect.analysis?.socialPresence || "Non analysée"}
${hasGeneratedSite ? `- Site démo généré: ${prospect.generatedSite!.vercelUrl}` : ""}

SERVICES RECOMMANDÉS:
${services.map((s: { name: string; reason: string }) => `- ${s.name}: ${s.reason}`).join("\n") || "- Pas de recommandation spécifique"}

INSTRUCTIONS:
1. Objet de l'email: accrocheur, personnalisé au prospect (max 60 caractères)
2. Corps: 
   - Accroche personnalisée mentionnant l'entreprise ou le secteur
   ${hasGeneratedSite ? "- Mention du site vitrine démo créé spécialement avec le lien" : ""}
   - 1-2 quick wins concrets et chiffrés si possible
   - Proposition de valeur Techvisor en 1-2 phrases
   - CTA: proposition de mini-audit gratuit de 15 min en visio
3. Signature: Jérémy Marquer | Techvisor | techvisor.fr
4. Ton: professionnel mais chaleureux, direct, pas commercial agressif
5. Longueur: 150-250 mots max
6. En français

FORMAT DE RÉPONSE (JSON):
{
  "subject": "Objet de l'email",
  "body": "Corps de l'email en HTML simple (paragraphes, liens, gras)"
}`;

    const response = await generateText(
      prompt,
      "Tu es un expert en cold emailing B2B en France. Tu écris des emails qui obtiennent des taux de réponse élevés. Réponds UNIQUEMENT en JSON valide."
    );

    // Parse response
    let parsed: { subject: string; body: string };
    try {
      const cleaned = response.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // Fallback
      parsed = {
        subject: `${prospect.company} — Votre présence digitale mérite mieux`,
        body: response,
      };
    }

    // Save email draft
    const email = await prisma.email.create({
      data: {
        prospectId,
        subject: parsed.subject,
        body: parsed.body,
        status: "draft",
      },
    });

    await prisma.prospect.update({
      where: { id: prospectId },
      data: { emailStatus: "to_send" },
    });

    await logProspectEvent(prospectId, "email_generated", "Email généré", {
      emailId: email.id,
      subject: parsed.subject,
    });

    return NextResponse.json({
      success: true,
      emailId: email.id,
      subject: parsed.subject,
      preview: parsed.body.slice(0, 200),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Email generation failed" },
      { status: 500 }
    );
  }
}
