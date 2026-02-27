import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// CRUD for prospects
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "50");
  const status = url.searchParams.get("status");
  const city = url.searchParams.get("city");
  const sector = url.searchParams.get("sector");
  const source = url.searchParams.get("source");
  const search = url.searchParams.get("search");
  const sortBy = url.searchParams.get("sortBy") || "createdAt";
  const sortOrder = url.searchParams.get("sortOrder") || "desc";
  const hasWebsite = url.searchParams.get("hasWebsite");
  const maxScore = url.searchParams.get("maxScore");
  const excludeStatus = url.searchParams.get("excludeStatus");
  const callStatus = url.searchParams.get("callStatus");
  const callbackDue = url.searchParams.get("callbackDue"); // overdue | today | tomorrow
  const emailStatus = url.searchParams.get("emailStatus");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (city) where.city = { contains: city };
  if (sector) where.sector = { contains: sector };
  if (source) where.source = source;
  if (search) {
    where.OR = [
      { company: { contains: search } },
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { email: { contains: search } },
      { phone: { contains: search } },
    ];
  }
  if (hasWebsite === "true") where.siteUrl = { not: null };
  if (hasWebsite === "false") where.siteUrl = null;
  if (maxScore) {
    where.analysis = { scoreGlobal: { lte: parseInt(maxScore) } };
  }
  if (excludeStatus && !status) {
    const list = excludeStatus.split(",").map((s) => s.trim()).filter(Boolean);
    if (list.length > 0) {
      where.status = { notIn: list };
    }
  }
  if (callStatus) {
    where.callStatus = callStatus;
  }
  if (emailStatus) {
    where.emailStatus = emailStatus;
  }
  if (callbackDue) {
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = null;
    if (callbackDue === "overdue") {
      end = now;
    } else if (callbackDue === "today") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    } else if (callbackDue === "tomorrow") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
    }
    if (start && end) {
      where.nextCallAt = { gte: start, lt: end };
      where.callStatus = "callback";
    } else if (end) {
      where.nextCallAt = { lt: end };
      where.callStatus = "callback";
    }
  }

  const [prospects, total] = await Promise.all([
    prisma.prospect.findMany({
      where,
      include: {
        analysis: {
          select: {
            scoreGlobal: true,
            websiteScore: true,
            googleRating: true,
            googleReviewsCount: true,
            googleBusinessOptimized: true,
            servicesRecommended: true,
            hasWebsite: true,
          },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.prospect.count({ where }),
  ]);

  return NextResponse.json({
    prospects,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

// DELETE — delete a prospect
export async function DELETE(request: NextRequest) {
  const { id } = await request.json();
  await prisma.prospect.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
