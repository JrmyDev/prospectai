import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await prisma.brandProfile.findUnique({ where: { id } });
  if (!profile) {
    return NextResponse.json({ error: "Brand profile not found" }, { status: 404 });
  }
  return NextResponse.json(profile);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const profile = await prisma.brandProfile.update({
    where: { id },
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

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.brandProfile.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
