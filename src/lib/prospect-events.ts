import { prisma } from "@/lib/prisma";

export type ProspectEventType =
  | "prospect_created"
  | "contact_updated"
  | "status_changed"
  | "analysis_run"
  | "website_generated"
  | "website_deployed"
  | "email_generated"
  | "email_sent"
  | "phone_script_generated"
  | "call_logged"
  | "note_added"
  | "email_status_changed";

export async function logProspectEvent(
  prospectId: string,
  type: ProspectEventType,
  message?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await prisma.prospectEvent.create({
    data: {
      prospectId,
      type,
      message: message || null,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });
}
