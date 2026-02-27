import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiKeys } from "@/lib/settings";

// Google Search via SerpAPI — find businesses without websites
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { query, location = "Besançon, France", num = 20 } = body;

  const keys = await getApiKeys();
  if (!keys.serpapi) {
    return NextResponse.json({ error: "SerpAPI key not configured" }, { status: 400 });
  }

  const job = await prisma.scrapingJob.create({
    data: {
      type: "google_search",
      params: JSON.stringify({ query, location, num }),
      status: "running",
      startedAt: new Date(),
    },
  });

  try {
    const params = new URLSearchParams({
      engine: "google",
      q: query,
      location,
      hl: "fr",
      gl: "fr",
      num: num.toString(),
      api_key: keys.serpapi,
    });

    const res = await fetch(`https://serpapi.com/search.json?${params}`);
    const data = await res.json();

    let created = 0;

    // Process local results (Google Maps pack)
    const localResults = data.local_results?.places || [];
    for (const place of localResults) {
      const existing = place.place_id
        ? await prisma.prospect.findUnique({ where: { placeId: place.place_id } })
        : await prisma.prospect.findFirst({
            where: { company: place.title, city: { contains: location.split(",")[0] } },
          });

      if (!existing) {
        await prisma.prospect.create({
          data: {
            company: place.title || "Inconnu",
            phone: place.phone || null,
            address: place.address || null,
            city: location.split(",")[0].trim(),
            siteUrl: place.website || null,
            googleMapsUrl: place.link || null,
            placeId: place.place_id || null,
            source: "google_search",
            status: "new",
          },
        });
        created++;
      }
    }

    // Process organic results — extract business info
    const organicResults = data.organic_results || [];
    for (const result of organicResults) {
      // Skip large aggregator sites
      const skipDomains = ["pagesjaunes.fr", "tripadvisor", "yelp", "facebook.com", "linkedin.com", "google.com"];
      if (skipDomains.some((d) => result.link?.includes(d))) continue;

      // This might be a business website
      const domain = new URL(result.link).hostname;
      const existing = await prisma.prospect.findFirst({
        where: { siteUrl: { contains: domain } },
      });

      if (!existing) {
        await prisma.prospect.create({
          data: {
            company: result.title?.replace(/ - .*$/, "").trim() || domain,
            siteUrl: result.link,
            city: location.split(",")[0].trim(),
            source: "google_search",
            status: "new",
          },
        });
        created++;
      }
    }

    await prisma.scrapingJob.update({
      where: { id: job.id },
      data: { status: "completed", resultsCount: created, completedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      jobId: job.id,
      totalFound: localResults.length + organicResults.length,
      newProspects: created,
    });
  } catch (error) {
    await prisma.scrapingJob.update({
      where: { id: job.id },
      data: {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        completedAt: new Date(),
      },
    });
    return NextResponse.json({ error: "Google Search scraping failed" }, { status: 500 });
  }
}
