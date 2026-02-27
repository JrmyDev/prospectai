import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all settings
export async function GET() {
  const settings = await prisma.settings.findMany();
  const result: Record<string, string> = {};
  for (const s of settings) {
    result[s.key] = s.value;
  }
  return NextResponse.json(result);
}

// POST — update settings
export async function POST(request: NextRequest) {
  const body = await request.json();

  for (const [key, value] of Object.entries(body)) {
    await prisma.settings.upsert({
      where: { key },
      create: { id: key, key, value: value as string },
      update: { value: value as string },
    });
  }

  return NextResponse.json({ success: true });
}
