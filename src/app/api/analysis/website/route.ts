import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiKeys } from "@/lib/settings";
import { generateJson } from "@/lib/gemini";

// Analyze a prospect's website: performance, SEO, design
export async function POST(request: NextRequest) {
  const { prospectId } = await request.json();

  const prospect = await prisma.prospect.findUnique({ where: { id: prospectId } });
  if (!prospect) {
    return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
  }
  if (!prospect.siteUrl) {
    return NextResponse.json({ error: "Prospect has no website URL" }, { status: 400 });
  }

  const keys = await getApiKeys();

  try {
    // 1. Google PageSpeed Insights
    let perfScore = 0,
      seoScore = 0,
      mobileScore = 0;

    if (keys.googlePagespeed) {
      const [mobileData, desktopData] = await Promise.all([
        fetchPageSpeed(prospect.siteUrl, "mobile", keys.googlePagespeed),
        fetchPageSpeed(prospect.siteUrl, "desktop", keys.googlePagespeed),
      ]);

      perfScore = Math.round(
        ((mobileData.performance || 0) + (desktopData.performance || 0)) / 2 * 100
      );
      seoScore = Math.round((mobileData.seo || 0) * 100);
      mobileScore = Math.round((mobileData.performance || 0) * 100);
    }

    // 2. Basic SEO checks via fetch
    const seoChecks = await checkBasicSeo(prospect.siteUrl);

    // 3. AI Design analysis via Gemini
    const designAnalysis = await analyzeDesignWithAI(prospect.siteUrl, prospect.company);
    const designScore = designAnalysis.score || 50;

    // Composite website score
    const websiteScore = Math.round(perfScore * 0.25 + seoScore * 0.3 + designScore * 0.25 + mobileScore * 0.2);

    // Update or create analysis
    await prisma.prospectAnalysis.upsert({
      where: { prospectId },
      create: {
        prospectId,
        hasWebsite: true,
        websiteScorePerf: perfScore,
        websiteScoreSeo: seoScore,
        websiteScoreDesign: designScore,
        websiteScoreMobile: mobileScore,
        websiteScore,
        rawAnalysis: JSON.stringify({ seoChecks, designAnalysis }),
      },
      update: {
        hasWebsite: true,
        websiteScorePerf: perfScore,
        websiteScoreSeo: seoScore,
        websiteScoreDesign: designScore,
        websiteScoreMobile: mobileScore,
        websiteScore,
        rawAnalysis: JSON.stringify({ seoChecks, designAnalysis }),
      },
    });

    return NextResponse.json({
      success: true,
      scores: { perfScore, seoScore, designScore, mobileScore, websiteScore },
      seoChecks,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 500 }
    );
  }
}

// --- Helpers ---

interface PageSpeedScores {
  performance: number;
  seo: number;
  accessibility: number;
  bestPractices: number;
}

async function fetchPageSpeed(url: string, strategy: "mobile" | "desktop", apiKey: string): Promise<PageSpeedScores> {
  try {
    const params = new URLSearchParams({
      url,
      key: apiKey,
      strategy,
      category: "performance",
    });
    // Add multiple categories
    params.append("category", "seo");
    params.append("category", "accessibility");
    params.append("category", "best-practices");

    const res = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`, {
      signal: AbortSignal.timeout(30000),
    });
    const data = await res.json();

    const cats = data.lighthouseResult?.categories;
    return {
      performance: cats?.performance?.score || 0,
      seo: cats?.seo?.score || 0,
      accessibility: cats?.accessibility?.score || 0,
      bestPractices: cats?.["best-practices"]?.score || 0,
    };
  } catch {
    return { performance: 0, seo: 0, accessibility: 0, bestPractices: 0 };
  }
}

interface SeoChecks {
  hasHttps: boolean;
  hasTitle: boolean;
  hasDescription: boolean;
  hasH1: boolean;
  hasOg: boolean;
  isResponsive: boolean;
  loadTimeMs: number;
}

async function checkBasicSeo(url: string): Promise<SeoChecks> {
  const checks: SeoChecks = {
    hasHttps: url.startsWith("https"),
    hasTitle: false,
    hasDescription: false,
    hasH1: false,
    hasOg: false,
    isResponsive: false,
    loadTimeMs: 0,
  };

  try {
    const start = Date.now();
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ProspectAI/1.0)" },
      signal: AbortSignal.timeout(15000),
    });
    checks.loadTimeMs = Date.now() - start;

    const html = await res.text();

    checks.hasTitle = /<title[^>]*>.+<\/title>/i.test(html);
    checks.hasDescription = /meta[^>]*name=["']description["'][^>]*content=["'][^"']+/i.test(html);
    checks.hasH1 = /<h1[^>]*>.+<\/h1>/i.test(html.replace(/\n/g, " "));
    checks.hasOg = /meta[^>]*property=["']og:/i.test(html);
    checks.isResponsive = /viewport/i.test(html);
  } catch {
    // Site unreachable
  }

  return checks;
}

async function analyzeDesignWithAI(url: string, companyName: string) {
  try {
    return await generateJson<{ score: number; summary: string; strengths: string[]; weaknesses: string[] }>(
      `Analyse le site web "${url}" de l'entreprise "${companyName}".
      
Sans visiter le site (tu n'as pas accès), estime un score de design/modernité entre 0 et 100 basé sur le nom de domaine et le type d'entreprise.
Donne aussi un résumé, des points forts probables et des points faibles probables.

Réponds en JSON: { "score": number, "summary": string, "strengths": string[], "weaknesses": string[] }`
    );
  } catch {
    return { score: 50, summary: "Analyse non disponible", strengths: [], weaknesses: [] };
  }
}
