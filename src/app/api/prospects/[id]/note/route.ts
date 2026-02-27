import { NextRequest, NextResponse } from "next/server";
import { logProspectEvent } from "@/lib/prospect-events";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  const note = typeof body?.note === "string" ? body.note.trim() : "";
  if (!note) {
    return NextResponse.json({ error: "Note is required" }, { status: 400 });
  }

  await logProspectEvent(id, "note_added", "Note ajoutée", { note });

  return NextResponse.json({ success: true });
}
