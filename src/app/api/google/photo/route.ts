import { NextRequest, NextResponse } from "next/server";
import { getApiKeys } from "@/lib/settings";

export async function GET(request: NextRequest) {
  const ref = request.nextUrl.searchParams.get("ref");
  const maxwidth = request.nextUrl.searchParams.get("maxwidth") || "1600";

  if (!ref) {
    return NextResponse.json({ error: "Missing ref" }, { status: 400 });
  }

  const keys = await getApiKeys();
  if (!keys.googlePlaces) {
    return NextResponse.json({ error: "Google Places API key not configured" }, { status: 400 });
  }

  const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${encodeURIComponent(
    maxwidth
  )}&photo_reference=${encodeURIComponent(ref)}&key=${keys.googlePlaces}`;

  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch photo" }, { status: 502 });
  }

  const arrayBuffer = await res.arrayBuffer();
  const contentType = res.headers.get("content-type") || "image/jpeg";

  return new NextResponse(arrayBuffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
