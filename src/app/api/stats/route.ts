import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET stats for dashboard
export async function GET() {
  const [
    totalProspects,
    byStatus,
    bySource,
    bySector,
    byCity,
    recentJobs,
    emailStats,
    callsCount,
  ] = await Promise.all([
    prisma.prospect.count(),
    prisma.prospect.groupBy({ by: ["status"], _count: true }),
    prisma.prospect.groupBy({ by: ["source"], _count: true }),
    prisma.prospect.groupBy({ by: ["sector"], _count: true, orderBy: { _count: { sector: "desc" } }, take: 10 }),
    prisma.prospect.groupBy({ by: ["city"], _count: true, orderBy: { _count: { city: "desc" } }, take: 10 }),
    prisma.scrapingJob.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.email.groupBy({ by: ["status"], _count: true }),
    prisma.prospectEvent.count({ where: { type: "call_logged" } }),
  ]);

  // Funnel
  const statusMap = Object.fromEntries(byStatus.map((s) => [s.status, s._count]));
  const funnel = {
    scraped: totalProspects,
    analyzed: (statusMap["analyzed"] || 0) + (statusMap["site_generated"] || 0) + (statusMap["email_sent"] || 0) + (statusMap["replied"] || 0) + (statusMap["converted"] || 0),
    siteGenerated: (statusMap["site_generated"] || 0) + (statusMap["email_sent"] || 0) + (statusMap["replied"] || 0) + (statusMap["converted"] || 0),
    emailSent: (statusMap["email_sent"] || 0) + (statusMap["replied"] || 0) + (statusMap["converted"] || 0),
    replied: (statusMap["replied"] || 0) + (statusMap["converted"] || 0),
    converted: statusMap["converted"] || 0,
  };

  const emailStatusMap = Object.fromEntries(emailStats.map((s) => [s.status, s._count]));

  return NextResponse.json({
    totalProspects,
    funnel,
    status: {
      nonInteresse: statusMap["non_interesse"] || 0,
    },
    calls: {
      total: callsCount,
    },
    bySource: bySource.map((s) => ({ source: s.source, count: s._count })),
    bySector: bySector.map((s) => ({ sector: s.sector || "N/A", count: s._count })),
    byCity: byCity.map((s) => ({ city: s.city || "N/A", count: s._count })),
    emails: {
      draft: emailStatusMap["draft"] || 0,
      approved: emailStatusMap["approved"] || 0,
      sent: emailStatusMap["sent"] || 0,
      replied: emailStatusMap["replied"] || 0,
    },
    recentJobs,
  });
}
