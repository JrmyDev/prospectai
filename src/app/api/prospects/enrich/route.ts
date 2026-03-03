import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiKeys } from "@/lib/settings";
import { logProspectEvent } from "@/lib/prospect-events";

type PlaceDetails = {
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
};

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body?.ids) ? body.ids.filter((id: unknown) => typeof id === "string") : [];
  const limitRaw = Number(body?.limit);
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(100, Math.floor(limitRaw))) : 25;
  const useGoogleFallback = body?.useGoogleFallback === true;

  const where: Record<string, unknown> = {
    OR: [{ phone: null }, { phone: "" }, { email: null }, { email: "" }],
  };
  if (ids.length > 0) {
    where.id = { in: ids };
  }

  const prospects = await prisma.prospect.findMany({
    where,
    take: limit,
    select: {
      id: true,
      company: true,
      city: true,
      placeId: true,
      siteUrl: true,
      googleMapsUrl: true,
      phone: true,
      email: true,
    },
  });

  const keys = useGoogleFallback ? await getApiKeys() : null;
  const googleApiKey = useGoogleFallback ? keys?.googlePlaces || "" : "";

  let processed = 0;
  let updated = 0;
  let updatedPhone = 0;
  let updatedEmail = 0;
  const errors: Array<{ id: string; error: string }> = [];

  for (const prospect of prospects) {
    processed++;
    try {
      const currentPhone = normalizePhone(prospect.phone);
      const currentEmail = normalizeEmail(prospect.email);
      let nextPhone = currentPhone;
      let nextEmail = currentEmail;
      let nextSiteUrl = prospect.siteUrl || null;
      let source = "none";

      let placeDetails: PlaceDetails | null = null;
      if (useGoogleFallback && googleApiKey && prospect.placeId) {
        placeDetails = await fetchPlaceDetails(prospect.placeId, googleApiKey);
        if (!nextPhone) {
          nextPhone = normalizePhone(placeDetails.international_phone_number || placeDetails.formatted_phone_number || null);
          if (nextPhone) source = "google_places";
        }
        if (!nextSiteUrl && placeDetails.website) {
          nextSiteUrl = placeDetails.website;
        }
      }

      const websiteToCheck = nextSiteUrl || prospect.siteUrl;
      if (websiteToCheck && (!nextPhone || !nextEmail)) {
        const websiteContact = await extractContactFromWebsite(websiteToCheck);
        if (!nextPhone && websiteContact.phone) {
          nextPhone = websiteContact.phone;
          source = source === "none" ? "website" : `${source}+website`;
        }
        if (!nextEmail && websiteContact.email) {
          nextEmail = websiteContact.email;
          source = source === "none" ? "website" : `${source}+website`;
        }
      }

      // Scraping-first fallback: if no website is known, try discover a likely official website from web search.
      if ((!nextPhone || !nextEmail) && !nextSiteUrl) {
        const discoveredWebsite = await findWebsiteFromSearch(prospect.company, prospect.city);
        if (discoveredWebsite) {
          nextSiteUrl = discoveredWebsite;
          const websiteContact = await extractContactFromWebsite(discoveredWebsite);
          if (!nextPhone && websiteContact.phone) {
            nextPhone = websiteContact.phone;
            source = source === "none" ? "search+website" : `${source}+search+website`;
          }
          if (!nextEmail && websiteContact.email) {
            nextEmail = websiteContact.email;
            source = source === "none" ? "search+website" : `${source}+search+website`;
          }
        }
      }

      // Last scraping attempt: parse visible text from the public Google Maps URL when available.
      if ((!nextPhone || !nextEmail) && prospect.googleMapsUrl) {
        const mapsContact = await extractContactFromGoogleMapsPage(prospect.googleMapsUrl);
        if (!nextPhone && mapsContact.phone) {
          nextPhone = mapsContact.phone;
          source = source === "none" ? "google_maps_page" : `${source}+google_maps_page`;
        }
        if (!nextEmail && mapsContact.email) {
          nextEmail = mapsContact.email;
          source = source === "none" ? "google_maps_page" : `${source}+google_maps_page`;
        }
      }

      const changes: Array<{ field: string; from: string | null; to: string | null }> = [];
      if ((currentPhone || null) !== (nextPhone || null)) {
        changes.push({ field: "phone", from: currentPhone || null, to: nextPhone || null });
      }
      if ((currentEmail || null) !== (nextEmail || null)) {
        changes.push({ field: "email", from: currentEmail || null, to: nextEmail || null });
      }
      if ((prospect.siteUrl || null) !== (nextSiteUrl || null) && nextSiteUrl) {
        changes.push({ field: "siteUrl", from: prospect.siteUrl || null, to: nextSiteUrl || null });
      }

      if (changes.length === 0) continue;

      await prisma.prospect.update({
        where: { id: prospect.id },
        data: {
          phone: nextPhone || null,
          email: nextEmail || null,
          siteUrl: nextSiteUrl || null,
        },
      });

      await logProspectEvent(prospect.id, "contact_updated", "Enrichissement contact (batch)", {
      source,
      strategy: useGoogleFallback ? "scraping+google_fallback" : "scraping_only",
      changes,
    });

      updated++;
      if ((currentPhone || null) !== (nextPhone || null) && nextPhone) updatedPhone++;
      if ((currentEmail || null) !== (nextEmail || null) && nextEmail) updatedEmail++;
    } catch (error) {
      errors.push({
        id: prospect.id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({
    success: true,
    processed,
    updated,
    updatedPhone,
    updatedEmail,
    errorCount: errors.length,
    errors: errors.slice(0, 20),
  });
}

async function fetchPlaceDetails(placeId: string, apiKey: string): Promise<PlaceDetails> {
  const fields = "formatted_phone_number,international_phone_number,website";
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${fields}&language=fr&key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return {};
  const data = await res.json();
  return data?.result || {};
}

async function extractContactFromWebsite(url: string): Promise<{ phone: string | null; email: string | null }> {
  const candidates = buildCandidateUrls(url);
  let foundPhone: string | null = null;
  let foundEmail: string | null = null;

  for (const candidate of candidates) {
    try {
      const res = await fetch(candidate, {
        signal: AbortSignal.timeout(8000),
        headers: { "User-Agent": "Mozilla/5.0 ProspectAI/1.0" },
      });
      if (!res.ok) continue;
      const html = await res.text();
      if (!foundEmail) foundEmail = extractFirstEmail(html);
      if (!foundPhone) foundPhone = extractFirstPhone(html);
      if (foundPhone && foundEmail) break;
    } catch {
      // ignore fetch errors for enrichment
    }
  }

  return { phone: foundPhone, email: foundEmail };
}

async function findWebsiteFromSearch(company: string, city: string | null): Promise<string | null> {
  const query = `${company} ${city || ""}`.trim();
  if (!query) return null;

  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Mozilla/5.0 ProspectAI/1.0" },
    });
    if (!res.ok) return null;
    const html = await res.text();

    const regex = /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"/gi;
    let match: RegExpExecArray | null = null;
    while ((match = regex.exec(html)) !== null) {
      const candidate = decodeHtmlEntities(match[1]);
      const normalized = normalizeHttpUrl(candidate);
      if (!normalized) continue;
      if (isIgnoredDomain(normalized)) continue;
      return normalized;
    }
  } catch {
    // ignore
  }
  return null;
}

async function extractContactFromGoogleMapsPage(url: string): Promise<{ phone: string | null; email: string | null }> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Mozilla/5.0 ProspectAI/1.0" },
    });
    if (!res.ok) return { phone: null, email: null };
    const html = await res.text();
    return {
      phone: extractFirstPhone(html),
      email: extractFirstEmail(html),
    };
  } catch {
    return { phone: null, email: null };
  }
}

function buildCandidateUrls(siteUrl: string): string[] {
  const normalized = siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`;
  try {
    const u = new URL(normalized);
    const base = `${u.protocol}//${u.host}`;
    return [
      base,
      `${base}/contact`,
      `${base}/contactez-nous`,
      `${base}/nous-contacter`,
      `${base}/mentions-legales`,
    ];
  } catch {
    return [normalized];
  }
}

function extractFirstEmail(html: string): string | null {
  const mailto = html.match(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
  if (mailto?.[1]) return normalizeEmail(mailto[1]);
  const regex = /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g;
  const match = regex.exec(html);
  return match?.[1] ? normalizeEmail(match[1]) : null;
}

function extractFirstPhone(html: string): string | null {
  const telHref = html.match(/tel:([+0-9][0-9 .()-]{7,})/i);
  if (telHref?.[1]) return normalizePhone(telHref[1]);
  const regex = /(?:\+33|0)[0-9](?:[ .()-]?[0-9]{2}){4}/g;
  const match = regex.exec(html);
  return match?.[0] ? normalizePhone(match[0]) : null;
}

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\s+/g, " ");
}

function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return null;
  return trimmed;
}

function normalizeHttpUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

function isIgnoredDomain(url: string): boolean {
  return [
    "google.",
    "facebook.com",
    "instagram.com",
    "linkedin.com",
    "tripadvisor.",
    "booking.com",
    "airbnb.",
    "yelp.",
    "pagesjaunes.fr",
    "annuaire.",
  ].some((d) => url.includes(d));
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
