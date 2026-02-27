import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateJson } from "@/lib/gemini";
import { logProspectEvent } from "@/lib/prospect-events";

// Run full analysis on a prospect and compute global score + service recommendations
export async function POST(request: NextRequest) {
  const { prospectId } = await request.json();

  const prospect = await prisma.prospect.findUnique({
    where: { id: prospectId },
    include: { analysis: true },
  });

  if (!prospect) {
    return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
  }

  const baseUrl = request.nextUrl.origin;
  const cookie = request.headers.get("cookie") || "";
  const headers = { "Content-Type": "application/json", Cookie: cookie };

  try {
    // Run all analyses in parallel
    const promises: Promise<Response>[] = [];

    if (prospect.siteUrl) {
      promises.push(
        fetch(`${baseUrl}/api/analysis/website`, {
          method: "POST",
          headers,
          body: JSON.stringify({ prospectId }),
        })
      );
    }

    if (prospect.placeId) {
      promises.push(
        fetch(`${baseUrl}/api/analysis/google-business`, {
          method: "POST",
          headers,
          body: JSON.stringify({ prospectId }),
        })
      );
    }

    promises.push(
      fetch(`${baseUrl}/api/analysis/social`, {
        method: "POST",
        headers,
        body: JSON.stringify({ prospectId }),
      })
    );

    await Promise.allSettled(promises);

    // Reload analysis
    const analysis = await prisma.prospectAnalysis.findUnique({
      where: { prospectId },
    });

    // Compute global score
    const weights = { website: 0.3, googleBusiness: 0.25, seo: 0.25, social: 0.2 };

    const websiteScore = analysis?.websiteScore || 0;
    const googleScore = analysis?.googleBusinessOptimized ? 80 : (analysis?.googleRating || 0) * 20;
    const seoScore = analysis?.websiteScoreSeo || 0;
    const socialPresence = analysis?.socialPresence ? JSON.parse(analysis.socialPresence) : {};
    const socialScore = Math.round(
      (Object.values(socialPresence).filter(Boolean).length / 4) * 100
    );

    const scoreGlobal = Math.round(
      websiteScore * weights.website +
        googleScore * weights.googleBusiness +
        seoScore * weights.seo +
        socialScore * weights.social
    );

    // AI-powered service recommendations
    const recommendations = await generateServiceRecommendations(prospect, analysis, scoreGlobal);

    // Update analysis with global score and recommendations
    await prisma.prospectAnalysis.update({
      where: { prospectId },
      data: {
        scoreGlobal,
        hasWebsite: !!prospect.siteUrl,
        servicesRecommended: JSON.stringify(recommendations),
      },
    });

    // Update prospect status
    await prisma.prospect.update({
      where: { id: prospectId },
      data: { status: "analyzed" },
    });

    await logProspectEvent(prospectId, "analysis_run", "Analyse complète exécutée", {
      scoreGlobal,
    });

    return NextResponse.json({
      success: true,
      scoreGlobal,
      recommendations,
      scores: {
        website: websiteScore,
        google: googleScore,
        seo: seoScore,
        social: socialScore,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Scoring failed" },
      { status: 500 }
    );
  }
}

interface ProspectForReco {
  company: string;
  sector: string | null;
  siteUrl: string | null;
  city: string | null;
}

async function generateServiceRecommendations(
  prospect: ProspectForReco,
  analysis: { websiteScore?: number | null; googleBusinessOptimized?: boolean; socialPresence?: string | null; websiteScoreSeo?: number | null } | null,
  scoreGlobal: number
) {
  try {
    const context = {
      company: prospect.company,
      sector: prospect.sector,
      hasWebsite: !!prospect.siteUrl,
      websiteScore: analysis?.websiteScore || 0,
      seoScore: analysis?.websiteScoreSeo || 0,
      googleOptimized: analysis?.googleBusinessOptimized || false,
      socialPresence: analysis?.socialPresence ? JSON.parse(analysis.socialPresence) : {},
      globalScore: scoreGlobal,
      city: prospect.city,
    };

    const result = await generateJson<{ services: { name: string; priority: string; reason: string }[] }>(
      `Analyse ce profil d'entreprise et recommande les services Techvisor les plus pertinents.

Profil prospect:
${JSON.stringify(context, null, 2)}

Services Techvisor disponibles:
1. "Création site web" (Le Launchpad Tech - à partir de 2000€) — pour entreprises sans site ou avec site obsolète
2. "Refonte & optimisation site" (Le Partenaire Tech - 2500€/mois) — pour sites existants mais lents/mal conçus
3. "Optimisation SEO" — pour améliorer le référencement
4. "Optimisation fiche Google Business" — pour améliorer la visibilité locale
5. "Stratégie réseaux sociaux" — pour entreprises absentes des réseaux
6. "Automatisation IA" (L'Optimiseur IA - 2000€) — pour automatiser les process
7. "CTO externalisé" — pour startups/PME avec besoin tech

Renvoie un JSON: { "services": [{ "name": string, "priority": "high" | "medium" | "low", "reason": string }] }
Maximum 3 services, triés par priorité.`
    );
    return result.services || [];
  } catch {
    // Fallback: rule-based recommendations
    const services: { name: string; priority: string; reason: string }[] = [];

    if (!prospect.siteUrl) {
      services.push({ name: "Création site web", priority: "high", reason: "Aucun site web détecté" });
    } else if ((analysis?.websiteScore || 0) < 50) {
      services.push({ name: "Refonte & optimisation site", priority: "high", reason: "Score site web faible" });
    }

    if (!analysis?.googleBusinessOptimized) {
      services.push({ name: "Optimisation fiche Google", priority: "medium", reason: "Fiche Google non optimisée" });
    }

    if ((analysis?.websiteScoreSeo || 0) < 50) {
      services.push({ name: "Optimisation SEO", priority: "medium", reason: "Score SEO faible" });
    }

    return services.slice(0, 3);
  }
}
