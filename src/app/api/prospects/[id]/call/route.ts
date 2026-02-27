import { NextRequest, NextResponse } from "next/server";
import { logProspectEvent } from "@/lib/prospect-events";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  const outcome = body?.outcome || "no_answer";
  const durationSec = typeof body?.durationSec === "number" ? body.durationSec : null;
  const notes = typeof body?.notes === "string" ? body.notes.trim() : "";
  const occurredAt = typeof body?.occurredAt === "string" ? body.occurredAt : null;
  const nextCallAt = typeof body?.nextCallAt === "string" ? body.nextCallAt : null;

  let callStatus = "to_call";
  if (outcome === "voicemail") callStatus = "voicemail";
  if (outcome === "reached") callStatus = "reached";
  if (outcome === "meeting_set") callStatus = "meeting_set";
  if (outcome === "not_interested") callStatus = "not_interested";
  if (outcome === "callback") callStatus = "callback";
  if (nextCallAt) callStatus = "callback";

  await logProspectEvent(id, "call_logged", "Appel téléphonique", {
    outcome,
    durationSec,
    notes,
    occurredAt,
    nextCallAt,
  });

  let statusUpdate: string | undefined;
  if (outcome === "not_interested") statusUpdate = "non_interesse";
  else if (outcome === "reached" || outcome === "meeting_set") statusUpdate = "replied";
  else statusUpdate = "contacted";

  await prisma.prospect.update({
    where: { id },
    data: {
      callStatus,
      lastCallAt: occurredAt ? new Date(occurredAt) : new Date(),
      nextCallAt: nextCallAt ? new Date(nextCallAt) : null,
      status: statusUpdate,
    },
  });

  return NextResponse.json({ success: true });
}
