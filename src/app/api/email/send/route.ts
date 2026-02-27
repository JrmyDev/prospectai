import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/mailer";
import { logProspectEvent } from "@/lib/prospect-events";

// Send an approved email
export async function POST(request: NextRequest) {
  const { emailId } = await request.json();

  const email = await prisma.email.findUnique({
    where: { id: emailId },
    include: { prospect: true },
  });

  if (!email) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 });
  }

  if (!email.prospect.email) {
    return NextResponse.json({ error: "Prospect has no email address" }, { status: 400 });
  }

  if (email.status === "sent") {
    return NextResponse.json({ error: "Email already sent" }, { status: 400 });
  }

  try {
    await sendEmail(email.prospect.email, email.subject, email.body);

    await prisma.email.update({
      where: { id: emailId },
      data: { status: "sent", sentAt: new Date() },
    });

    // Update prospect status
    await prisma.prospect.update({
      where: { id: email.prospectId },
      data: { status: "email_sent", emailStatus: "sent" },
    });

    await logProspectEvent(email.prospectId, "email_sent", "Email envoyé", {
      emailId,
      to: email.prospect.email,
      subject: email.subject,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Send failed" },
      { status: 500 }
    );
  }
}

// GET — list emails with filters
export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status");
  const prospectId = request.nextUrl.searchParams.get("prospectId");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (prospectId) where.prospectId = prospectId;

  const emails = await prisma.email.findMany({
    where,
    include: { prospect: { select: { id: true, company: true, email: true, firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(emails);
}

// PATCH — approve or update an email
export async function PATCH(request: NextRequest) {
  const { emailId, subject, body, status } = await request.json();

  const email = await prisma.email.findUnique({ where: { id: emailId } });
  if (!email) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  if (subject) updateData.subject = subject;
  if (body) updateData.body = body;
  if (status) updateData.status = status;

  const updated = await prisma.email.update({
    where: { id: emailId },
    data: updateData,
  });

  return NextResponse.json(updated);
}
