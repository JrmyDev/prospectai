import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logProspectEvent } from "@/lib/prospect-events";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const prospect = await prisma.prospect.findUnique({
    where: { id },
    include: {
      analysis: true,
      generatedSite: true,
      emails: { orderBy: { createdAt: "desc" } },
      events: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!prospect) {
    return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
  }

  return NextResponse.json(prospect);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  const before = await prisma.prospect.findUnique({ where: { id } });
  if (!before) {
    return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
  }

  const data = { ...body } as Record<string, unknown>;
  if ("emailStatus" in body) {
    const emailStatus = body.emailStatus;
    if (emailStatus === "replied") data.status = "replied";
    if (emailStatus === "sent") data.status = "email_sent";
    if (emailStatus === "bounced") data.status = "contacted";
  }

  const prospect = await prisma.prospect.update({
    where: { id },
    data,
  });

  const contactFields: (keyof typeof body)[] = [
    "phone",
    "email",
    "address",
    "city",
    "postalCode",
    "siteUrl",
    "googleMapsUrl",
    "linkedinUrl",
  ];

  const changes = contactFields
    .filter((field) => field in body)
    .map((field) => ({
      field,
      from: (before as any)[field] ?? null,
      to: (body as any)[field] ?? null,
    }))
    .filter((c) => c.from !== c.to);

  if (changes.length > 0) {
    await logProspectEvent(id, "contact_updated", "Mise à jour des coordonnées", { changes });
  }

  if ("status" in body && before.status !== body.status) {
    await logProspectEvent(id, "status_changed", "Changement de statut", {
      from: before.status,
      to: body.status,
    });
  }

  if ("emailStatus" in body && before.emailStatus !== body.emailStatus) {
    await logProspectEvent(id, "email_status_changed", "Statut email modifié", {
      from: before.emailStatus,
      to: body.emailStatus,
    });
  }

  return NextResponse.json(prospect);
}
