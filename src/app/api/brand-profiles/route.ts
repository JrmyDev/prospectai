import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const profiles = await prisma.brandProfile.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(profiles);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const profile = await prisma.brandProfile.create({
    data: {
      name: body.name,
      logoUrl: body.logoUrl || null,
      primaryColor: body.primaryColor || null,
      secondaryColor: body.secondaryColor || null,
      accentColor: body.accentColor || null,
      fontGoogle: body.fontGoogle || null,
    },
  });
  return NextResponse.json(profile);
}
