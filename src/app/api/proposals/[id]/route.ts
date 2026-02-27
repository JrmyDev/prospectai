import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proposal = await prisma.proposal.findUnique({
    where: { id },
    include: {
      brandProfile: true,
      prospect: true,
      versions: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }
  return NextResponse.json(proposal);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const proposal = await prisma.proposal.update({
    where: { id },
    data: {
      title: body.title,
      prompt: body.prompt,
      htmlContent: body.htmlContent,
      slidesJson: body.slidesJson,
    },
  });
  return NextResponse.json(proposal);
}
