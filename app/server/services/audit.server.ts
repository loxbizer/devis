import { newId } from "../auth/password.server";
import { getDb, schema } from "../db.server";

/** Journal d'audit — trace les actions sensibles. */
export async function audit(params: {
  userId?: string | null;
  organizationId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  data?: unknown;
  ipAddress?: string | null;
}) {
  const db = getDb();
  await db.insert(schema.auditLogs).values({
    id: newId(),
    userId: params.userId ?? null,
    organizationId: params.organizationId ?? null,
    action: params.action,
    targetType: params.targetType ?? null,
    targetId: params.targetId ?? null,
    data: params.data ? JSON.stringify(params.data) : null,
    ipAddress: params.ipAddress ?? null,
  });
}
