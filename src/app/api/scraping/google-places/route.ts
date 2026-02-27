import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiKeys } from "@/lib/settings";
import { logProspectEvent } from "@/lib/prospect-events";

// Google Places API - Nearby Search (local) or Text Search (wider area / France)
export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    query,
    keywords = [],    // additional keywords to combine with query
    location,
    radius = 10000,
    type,
    city,
    mode = "nearby",  // "nearby" | "text" | "france"
  } = body;

  const keys = await getApiKeys();
  if (!keys.googlePlaces) {
    return NextResponse.json({ error: "Google Places API key not configured" }, { status: 400 });
  }

  // Resolve coordinates for nearby mode
  let lat = location?.lat;
  let lng = location?.lng;
  if (mode === "nearby") {
    if ((!lat || !lng) && city) {
      const geo = await geocodeCity(city, keys.googlePlaces);
      if (geo) { lat = geo.lat; lng = geo.lng; }
    }
    if (!lat || !lng) { lat = 44.7218; lng = 5.3838; } // Marches fallback
  }

  // Build the search query string for text search
  const searchTerms = [query, ...keywords].filter(Boolean).join(" ");
  const textQuery = mode === "france"
    ? `${searchTerms} en France`
    : mode === "text"
    ? `${searchTerms} ${city || ""}`.trim()
    : searchTerms;

  // Create scraping job
  const job = await prisma.scrapingJob.create({
    data: {
      type: "google_places",
      params: JSON.stringify({ query: textQuery, mode, lat, lng, radius, city }),
      status: "running",
      startedAt: new Date(),
    },
  });

  try {
    const allPlaces: GooglePlace[] = [];
    let pageToken: string | undefined;

    // Paginate through results (max 3 pages = 60 results)
    for (let page = 0; page < 3; page++) {
      let url: string;

      if (mode === "nearby" && lat && lng) {
        // Nearby Search — requires location + radius
        const params = new URLSearchParams({
          key: keys.googlePlaces,
          location: `${lat},${lng}`,
          radius: radius.toString(),
          language: "fr",
        });
        if (searchTerms) params.set("keyword", searchTerms);
        if (type) params.set("type", type);
        if (pageToken) params.set("pagetoken", pageToken);
        url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`;
      } else {
        // Text Search — broader, supports "query in city" or "query en France"
        const params = new URLSearchParams({
          key: keys.googlePlaces,
          query: textQuery,
          language: "fr",
        });
        if (lat && lng) {
          params.set("location", `${lat},${lng}`);
          params.set("radius", radius.toString());
        }
        if (type) params.set("type", type);
        if (pageToken) params.set("pagetoken", pageToken);
        url = `https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      console.log(`[Google Places] mode=${mode} page=${page} status=${data.status} results=${data.results?.length ?? 0} query="${textQuery}"`);

      if (data.status === "REQUEST_DENIED") {
        throw new Error(`Google API denied: ${data.error_message || "check API key & enabled APIs"}`);
      }

      if (data.results) {
        allPlaces.push(...data.results);
      }

      pageToken = data.next_page_token;
      if (!pageToken) break;

      // Google requires a short delay before using next_page_token
      await new Promise((r) => setTimeout(r, 2000));
    }

    // Filter out permanently/temporarily closed businesses
    const activePlaces = allPlaces.filter((p) => {
      if (p.business_status === "CLOSED_PERMANENTLY" || p.business_status === "CLOSED_TEMPORARILY") {
        console.log(`[Google Places] Skipping "${p.name}" — ${p.business_status}`);
        return false;
      }
      return true;
    });
    console.log(`[Google Places] ${allPlaces.length} found, ${allPlaces.length - activePlaces.length} closed filtered out, ${activePlaces.length} active`);

    // Enrich each place with details and upsert
    let created = 0;
    for (const place of activePlaces) {
      try {
        const details = await fetchPlaceDetails(place.place_id, keys.googlePlaces);
        const prospect = mapToProspect(place, details);

        // Deduplicate by placeId
        const existing = await prisma.prospect.findUnique({
          where: { placeId: place.place_id },
        });

        if (!existing) {
          const createdProspect = await prisma.prospect.create({ data: prospect });
          await logProspectEvent(createdProspect.id, "prospect_created", "Prospect créé (Google Places)", {
            source: "google_places",
          });
          created++;
        } else {
          const updated = await prisma.prospect.update({
            where: { placeId: place.place_id },
            data: {
              phone: prospect.phone || existing.phone,
              siteUrl: prospect.siteUrl || existing.siteUrl,
              googleMapsUrl: prospect.googleMapsUrl || existing.googleMapsUrl,
            },
          });
          const changes = [
            existing.phone !== updated.phone ? { field: "phone", from: existing.phone, to: updated.phone } : null,
            existing.siteUrl !== updated.siteUrl ? { field: "siteUrl", from: existing.siteUrl, to: updated.siteUrl } : null,
            existing.googleMapsUrl !== updated.googleMapsUrl ? { field: "googleMapsUrl", from: existing.googleMapsUrl, to: updated.googleMapsUrl } : null,
          ].filter(Boolean);
          if (changes.length > 0) {
            await logProspectEvent(updated.id, "contact_updated", "Mise à jour depuis Google Places", {
              changes,
            });
          }
        }
      } catch (err) {
        console.error(`Failed to process place ${place.place_id}:`, err);
      }
    }

    await prisma.scrapingJob.update({
      where: { id: job.id },
      data: {
        status: "completed",
        resultsCount: created,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      jobId: job.id,
      totalFound: activePlaces.length,
      filteredOut: allPlaces.length - activePlaces.length,
      newProspects: created,
    });
  } catch (error) {
    console.error("[Google Places] Error:", error);
    await prisma.scrapingJob.update({
      where: { id: job.id },
      data: {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        completedAt: new Date(),
      },
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Scraping failed" },
      { status: 500 }
    );
  }
}

// --- Helpers ---

async function geocodeCity(city: string, apiKey: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(city + ", France")}&key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.results?.[0]?.geometry?.location) {
    return data.results[0].geometry.location;
  }
  return null;
}

interface GooglePlace {
  place_id: string;
  name: string;
  vicinity?: string;
  formatted_address?: string;
  geometry?: { location: { lat: number; lng: number } };
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
  photos?: { photo_reference: string }[];
  business_status?: string;
}

interface PlaceDetails {
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  url?: string;
  formatted_address?: string;
  address_components?: { long_name: string; types: string[] }[];
  opening_hours?: { weekday_text: string[] };
  reviews?: { rating: number; text: string }[];
}

async function fetchPlaceDetails(placeId: string, apiKey: string): Promise<PlaceDetails> {
  const fields = "formatted_phone_number,international_phone_number,website,url,formatted_address,address_components,opening_hours,reviews";
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&language=fr&key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.result || {};
}

function mapToProspect(place: GooglePlace, details: PlaceDetails) {
  let city = "";
  let postalCode = "";
  if (details.address_components) {
    for (const comp of details.address_components) {
      if (comp.types.includes("locality")) city = comp.long_name;
      if (comp.types.includes("postal_code")) postalCode = comp.long_name;
    }
  }

  const typeMapping: Record<string, string> = {
    restaurant: "Restauration",
    bakery: "Boulangerie",
    cafe: "Café",
    bar: "Bar",
    hair_care: "Coiffure",
    beauty_salon: "Beauté",
    dentist: "Santé",
    doctor: "Santé",
    hospital: "Santé",
    physiotherapist: "Santé",
    lawyer: "Juridique",
    accounting: "Comptabilité",
    real_estate_agency: "Immobilier",
    car_repair: "Automobile",
    car_dealer: "Automobile",
    plumber: "Plomberie",
    electrician: "Électricien",
    store: "Commerce",
    clothing_store: "Mode",
    florist: "Fleuriste",
    gym: "Sport & Fitness",
    lodging: "Hébergement",
    campground: "Hébergement",
    rv_park: "Hébergement",
    travel_agency: "Tourisme",
    spa: "Bien-être",
    pet_store: "Animalerie",
    veterinary_care: "Vétérinaire",
  };

  const sector = place.types?.find((t) => typeMapping[t])
    ? typeMapping[place.types.find((t) => typeMapping[t])!]
    : "Autre";

  return {
    company: place.name,
    phone: details.formatted_phone_number || details.international_phone_number || null,
    siteUrl: details.website || null,
    googleMapsUrl: details.url || null,
    address: details.formatted_address || place.formatted_address || place.vicinity || null,
    city,
    postalCode,
    source: "google_maps",
    placeId: place.place_id,
    sector,
    status: "new",
  };
}
