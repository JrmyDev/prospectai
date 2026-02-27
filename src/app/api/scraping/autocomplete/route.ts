import { NextRequest, NextResponse } from "next/server";
import { getApiKeys } from "@/lib/settings";

// Google Places Autocomplete for cities
export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams.get("q");
  if (!input || input.length < 2) {
    return NextResponse.json([]);
  }

  const keys = await getApiKeys();
  if (!keys.googlePlaces) {
    return NextResponse.json([]);
  }

  const params = new URLSearchParams({
    input,
    types: "(cities)",
    components: "country:fr",
    language: "fr",
    key: keys.googlePlaces,
  });

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`
  );
  const data = await res.json();

  if (data.status !== "OK") {
    console.log(`[Autocomplete] status=${data.status} error=${data.error_message}`);
    return NextResponse.json([]);
  }

  const suggestions = await Promise.all(
    data.predictions.slice(0, 6).map(async (p: { place_id: string; description: string; structured_formatting: { main_text: string } }) => {
      // Get lat/lng for each suggestion
      const detailRes = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${p.place_id}&fields=geometry,address_components&key=${keys.googlePlaces}`
      );
      const detail = await detailRes.json();
      const loc = detail.result?.geometry?.location;
      const postalCode = detail.result?.address_components?.find(
        (c: { types: string[] }) => c.types.includes("postal_code")
      )?.long_name;

      return {
        label: p.description,
        city: p.structured_formatting.main_text,
        postalCode: postalCode || "",
        lat: loc?.lat,
        lng: loc?.lng,
        placeId: p.place_id,
      };
    })
  );

  return NextResponse.json(suggestions);
}
