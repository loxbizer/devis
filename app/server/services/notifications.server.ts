import { and, count, desc, eq, isNull } from "drizzle-orm";
import { newId } from "../auth/password.server";
import { getDb, schema } from "../db.server";
import { sendEmail } from "./email.server";

/**
 * Centre de notifications interne — aucun service d'e-mail payant requis.
 * Chaque événement important crée une notification en base ; l'adaptateur
 * e-mail (facultatif) est appelé en plus lorsqu'il est configuré.
 */
export async function notifyOrganization(params: {
  organizationId: string;
  type: string;
  title: string;
  body?: string;
  linkTo?: string;
  emailTo?: string | null;
}) {
  const db = getDb();
  await db.insert(schema.notifications).values({
    id: newId(),
    organizationId: params.organizationId,
    userId: null,
    type: params.type,
    title: params.title,
    body: params.body ?? null,
    linkTo: params.linkTo ?? null,
  });
  if (params.emailTo) {
    await sendEmail({
      to: params.emailTo,
      subject: `[DevisRoom] ${params.title}`,
      text: params.body ?? params.title,
    });
  }
}

export async function getUnreadCount(organizationId: string): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ value: count() })
    .from(schema.notifications)
    .where(
      and(
        eq(schema.notifications.organizationId, organizationId),
        isNull(schema.notifications.readAt),
      ),
    );
  return row?.value ?? 0;
}

export async function listNotifications(organizationId: string, limit = 50) {
  const db = getDb();
  return db
    .select()
    .from(schema.notifications)
    .where(eq(schema.notifications.organizationId, organizationId))
    .orderBy(desc(schema.notifications.createdAt))
    .limit(limit);
}

export async function markAllRead(organizationId: string) {
  const db = getDb();
  await db
    .update(schema.notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(schema.notifications.organizationId, organizationId),
        isNull(schema.notifications.readAt),
      ),
    );
}
