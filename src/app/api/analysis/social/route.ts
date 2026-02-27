import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Check social media presence for a prospect
export async function POST(request: NextRequest) {
  const { prospectId } = await request.json();

  const prospect = await prisma.prospect.findUnique({ where: { id: prospectId } });
  if (!prospect) {
    return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
  }

  try {
    const companyName = encodeURIComponent(prospect.company);
    const city = prospect.city ? encodeURIComponent(prospect.city) : "";

    // Check each platform with a simple search
    const [facebook, instagram, linkedin] = await Promise.all([
      checkSocialPresence(`https://www.facebook.com/search/pages?q=${companyName}+${city}`, "facebook.com"),
      checkSocialPresence(`https://www.instagram.com/${companyName.toLowerCase().replace(/\s+/g, "")}`, "instagram.com"),
      checkSocialPresence(
        `https://www.linkedin.com/search/results/companies/?keywords=${companyName}`,
        "linkedin.com"
      ),
    ]);

    const social = { facebook, instagram, linkedin, tiktok: false };
    const presentCount = Object.values(social).filter(Boolean).length;
    const socialScore = Math.round((presentCount / 4) * 100);

    // Upsert
    await prisma.prospectAnalysis.upsert({
      where: { prospectId },
      create: {
        prospectId,
        socialPresence: JSON.stringify(social),
      },
      update: {
        socialPresence: JSON.stringify(social),
      },
    });

    return NextResponse.json({ success: true, social, socialScore });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Social analysis failed" },
      { status: 500 }
    );
  }
}

async function checkSocialPresence(url: string, _platform: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}
