import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiKeys } from "@/lib/settings";

// Analyze a prospect's Google Business profile
export async function POST(request: NextRequest) {
  const { prospectId } = await request.json();

  const prospect = await prisma.prospect.findUnique({ where: { id: prospectId } });
  if (!prospect) {
    return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
  }
  if (!prospect.placeId) {
    return NextResponse.json({ error: "No Google Place ID for this prospect" }, { status: 400 });
  }

  const keys = await getApiKeys();
  if (!keys.googlePlaces) {
    return NextResponse.json({ error: "Google Places API key not configured" }, { status: 400 });
  }

  try {
    const fields =
      "name,rating,user_ratings_total,reviews,photos,opening_hours,editorial_summary,types,business_status,website,formatted_phone_number";
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prospect.placeId}&fields=${fields}&language=fr&key=${keys.googlePlaces}`;
    const res = await fetch(url);
    const data = await res.json();
    const place = data.result || {};

    const rating = place.rating || 0;
    const reviewsCount = place.user_ratings_total || 0;
    const photos = Array.isArray(place.photos)
      ? place.photos.slice(0, 10).map((p: any) => ({
          ref: p.photo_reference,
          width: p.width,
          height: p.height,
          attributions: p.html_attributions || [],
        }))
      : [];
    const photosCount = photos.length;
    const hasHours = !!place.opening_hours?.weekday_text?.length;
    const hasDescription = !!place.editorial_summary?.overview;

    // Score calculation
    let score = 0;
    if (rating >= 4.5) score += 30;
    else if (rating >= 4.0) score += 20;
    else if (rating >= 3.5) score += 10;

    if (reviewsCount >= 50) score += 20;
    else if (reviewsCount >= 20) score += 15;
    else if (reviewsCount >= 10) score += 10;
    else if (reviewsCount >= 5) score += 5;

    if (photosCount >= 10) score += 20;
    else if (photosCount >= 5) score += 15;
    else if (photosCount >= 1) score += 10;

    if (hasHours) score += 15;
    if (hasDescription) score += 15;

    const optimized = score >= 60;

    // Upsert analysis
    await prisma.prospectAnalysis.upsert({
      where: { prospectId },
      create: {
        prospectId,
        googleRating: rating,
        googleReviewsCount: reviewsCount,
        googleBusinessOptimized: optimized,
        rawAnalysis: JSON.stringify({
          googleBusiness: { rating, reviewsCount, photosCount, hasHours, hasDescription, score, photos },
        }),
      },
      update: {
        googleRating: rating,
        googleReviewsCount: reviewsCount,
        googleBusinessOptimized: optimized,
        rawAnalysis: JSON.stringify({
          googleBusiness: { rating, reviewsCount, photosCount, hasHours, hasDescription, score, photos },
        }),
      },
    });

    return NextResponse.json({
      success: true,
      googleBusiness: { rating, reviewsCount, photosCount, hasHours, hasDescription, score, optimized },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Google Business analysis failed" },
      { status: 500 }
    );
  }
}
