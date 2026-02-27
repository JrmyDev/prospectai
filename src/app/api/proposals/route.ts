import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get("search") || "";
  const where = search
    ? {
        OR: [
          { title: { contains: search } },
          { prospect: { company: { contains: search } } },
          { brandProfile: { name: { contains: search } } },
        ],
      }
    : {};

  const proposals = await prisma.proposal.findMany({
    where,
    include: { brandProfile: true, prospect: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(proposals);
}
