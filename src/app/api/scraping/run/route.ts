import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Run all scraping sources in sequence
export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    sources = ["google_places"],
    query,
    keywords = [],
    location = { lat: 44.7218, lng: 5.3838 },
    city = "Marches",
    radius = 10000,
    type,
    mode = "nearby",
    codePostal,
    departement,
    codeNaf,
  } = body;

  const results: Record<string, { success: boolean; newProspects?: number; error?: string }> = {};

  for (const source of sources) {
    try {
      let endpoint = "";
      let payload = {};

      switch (source) {
        case "google_places":
          endpoint = "/api/scraping/google-places";
          payload = { query, keywords, location, radius, type, city, mode };
          break;
        case "pappers":
          endpoint = "/api/scraping/pappers";
          payload = { query, codePostal, departement, codeNaf };
          break;
        case "google_search":
          endpoint = "/api/scraping/google-search";
          payload = { query, location: `${city}, France` };
          break;
        default:
          results[source] = { success: false, error: "Unknown source" };
          continue;
      }

      const baseUrl = request.nextUrl.origin;
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: request.headers.get("cookie") || "",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      results[source] = { success: res.ok, newProspects: data.newProspects, error: data.error };
    } catch (error) {
      results[source] = { success: false, error: error instanceof Error ? error.message : "Unknown" };
    }
  }

  const totalNew = Object.values(results).reduce((sum, r) => sum + (r.newProspects || 0), 0);

  return NextResponse.json({ success: true, results, totalNewProspects: totalNew });
}

// GET - list scraping jobs
export async function GET() {
  const jobs = await prisma.scrapingJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json(jobs);
}
