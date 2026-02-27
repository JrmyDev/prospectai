import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { presentationToHtml } from "@/lib/presentations/render-html";
import { proposalToHtml } from "@/lib/presentations/render-proposal";
import { buildTheme } from "@/lib/presentations/theme";
import type { PresentationSlide, SlideFormat } from "@/lib/presentations/types";
import fs from "node:fs/promises";
import path from "node:path";

// Support both POST (legacy) and GET (new editor export button)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handlePdfExport(await params);
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handlePdfExport(await params);
}

async function handlePdfExport({ id }: { id: string }) {
  const proposal = await prisma.proposal.findUnique({
    where: { id },
    include: { brandProfile: true, prospect: true },
  });
  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  // Build HTML: prefer slidesJson (new system), fallback to htmlContent (legacy)
  let htmlContent: string;

  if (proposal.slidesJson) {
    let slides: PresentationSlide[];
    try {
      slides = JSON.parse(proposal.slidesJson);
    } catch {
      return NextResponse.json({ error: "Invalid slides JSON" }, { status: 500 });
    }

    // Determine format from slides structure
    const format: SlideFormat = "16:9"; // default; could store in DB later

    const theme = buildTheme(
      proposal.brandProfile
        ? {
            primaryColor: proposal.brandProfile.primaryColor,
            secondaryColor: proposal.brandProfile.secondaryColor,
            accentColor: proposal.brandProfile.accentColor,
            logoUrl: proposal.brandProfile.logoUrl,
            companyName: proposal.brandProfile.name,
          }
        : null,
      "techvisor",
    );

    const proposalMeta = {
      date: new Date().toLocaleDateString('fr-FR'),
      website: 'techvisor.fr',
      email: 'contact@techvisor.fr',
      clientName: proposal.prospect?.company || undefined,
    };
    htmlContent = proposalToHtml(slides, theme, format, proposal.title, proposalMeta);
  } else {
    htmlContent = proposal.htmlContent;
  }

  let playwright: typeof import("playwright");
  try {
    playwright = await import("playwright");
  } catch {
    return NextResponse.json(
      { error: "Playwright not installed. Install it to enable PDF export." },
      { status: 500 },
    );
  }

  const browser = await playwright.chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle" });

    const outputDir = path.join(process.cwd(), "public", "proposals");
    await fs.mkdir(outputDir, { recursive: true });
    const pdfPath = path.join(outputDir, `${proposal.id}.pdf`);

    await page.pdf({
      path: pdfPath,
      preferCSSPageSize: true,
      printBackground: true,
      margin: { top: "0", bottom: "0", left: "0", right: "0" },
    });

    await prisma.proposal.update({
      where: { id },
      data: { pdfPath: `/proposals/${proposal.id}.pdf`, status: "pdf_generated" },
    });

    // Return the PDF file directly for GET
    const pdfBuffer = await fs.readFile(pdfPath);
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="presentation-${id}.pdf"`,
      },
    });
  } finally {
    await browser.close();
  }
}
