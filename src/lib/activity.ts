import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * Append to the audit log (SPEC §1: every create/update/delete/status-change
 * is recorded with user + timestamp). Fire-and-forget from server actions.
 */
export async function logActivity(params: {
  actorId: string;
  action:
    | "CREATE"
    | "UPDATE"
    | "DELETE"
    | "RESTORE"
    | "STAGE_CHANGE"
    | "STATUS_CHANGE";
  entityType: "Project" | "Task" | "Client" | "User" | "File" | "Comment";
  entityId: string;
  meta?: Prisma.InputJsonValue;
}) {
  try {
    await prisma.activityLog.create({ data: params });
  } catch (err) {
    // Audit failures must never break the user action itself.
    console.error("activity log failed", err);
  }
}
