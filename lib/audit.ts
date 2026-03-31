import { getDb } from "@/src/db";
import { auditLogs } from "@/src/db/schema";
export { diffChanges } from "./audit-utils";

interface AuditEntry {
  tenantId: string;
  userId: string;
  userEmail?: string;
  action: "create" | "update" | "delete";
  entity: string;
  entityId: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export async function logAudit(entry: AuditEntry) {
  try {
    const db = getDb();
    await db.insert(auditLogs).values({
      tenantId: entry.tenantId,
      userId: entry.userId,
      userEmail: entry.userEmail,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      changes: entry.changes ? JSON.stringify(entry.changes) : null,
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
      ipAddress: entry.ipAddress,
    });
  } catch {
    console.error("Failed to write audit log");
  }
}
