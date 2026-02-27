import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiKeys } from "@/lib/settings";
import { logProspectEvent } from "@/lib/prospect-events";

// Deploy generated site to Vercel (HITL — must be approved first)
export async function POST(request: NextRequest) {
  const { prospectId } = await request.json();

  const site = await prisma.generatedSite.findUnique({
    where: { prospectId },
    include: { prospect: true },
  });

  if (!site) {
    return NextResponse.json({ error: "No generated site found" }, { status: 404 });
  }

  const keys = await getApiKeys();
  if (!keys.vercelToken) {
    return NextResponse.json({ error: "Vercel token not configured" }, { status: 400 });
  }

  try {
    // Slugify company name for subdomain
    const slug = site.prospect.company
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50);

    const projectName = `prospect-${slug}`;

    // Deploy using Vercel API (v13 file upload)
    const deployRes = await fetch("https://api.vercel.com/v13/deployments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${keys.vercelToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: projectName,
        files: [
          {
            file: "index.html",
            data: Buffer.from(site.htmlContent).toString("base64"),
            encoding: "base64",
          },
        ],
        projectSettings: {
          framework: null,
        },
        target: "production",
        ...(keys.vercelTeamId ? { teamId: keys.vercelTeamId } : {}),
      }),
    });

    const deployData = await deployRes.json();

    if (!deployRes.ok) {
      return NextResponse.json(
        { error: deployData.error?.message || "Vercel deployment failed" },
        { status: 500 }
      );
    }

    const vercelUrl = `https://${deployData.url}`;

    // Update site record
    await prisma.generatedSite.update({
      where: { id: site.id },
      data: {
        vercelUrl,
        status: "deployed",
        deployedAt: new Date(),
      },
    });

    await logProspectEvent(site.prospectId, "website_deployed", "Site déployé", {
      vercelUrl,
      projectName,
    });

    return NextResponse.json({
      success: true,
      vercelUrl,
      projectName,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Deployment failed" },
      { status: 500 }
    );
  }
}
