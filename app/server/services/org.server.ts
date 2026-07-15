import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "react-router";
import { getPlan, type Plan } from "~/lib/plans";
import { requireSession, type SessionInfo } from "../auth/session.server";
import { getDb, schema } from "../db.server";
import { newId } from "../auth/password.server";

export interface OrgContext {
  session: SessionInfo;
  organization: typeof schema.organizations.$inferSelect;
  membership: typeof schema.organizationMembers.$inferSelect;
  subscription: typeof schema.subscriptions.$inferSelect;
  plan: Plan;
}

/** Retourne l'organisation active de l'utilisateur, ou null. */
export async function getOrgForUser(userId: string) {
  const db = getDb();
  const rows = await db
    .select({
      organization: schema.organizations,
      membership: schema.organizationMembers,
    })
    .from(schema.organizationMembers)
    .innerJoin(
      schema.organizations,
      eq(schema.organizationMembers.organizationId, schema.organizations.id),
    )
    .where(
      and(
        eq(schema.organizationMembers.userId, userId),
        isNull(schema.organizations.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Garde d'accès des routes /app : session valide + organisation existante.
 * Redirige vers l'onboarding si l'entreprise n'est pas encore créée.
 */
export async function requireOrg(request: Request): Promise<OrgContext> {
  const session = await requireSession(request);
  const found = await getOrgForUser(session.user.id);
  if (!found) {
    const url = new URL(request.url);
    if (url.pathname !== "/app/onboarding") {
      throw redirect("/app/onboarding");
    }
    throw redirect("/app/onboarding");
  }
  if (found.organization.suspendedAt) {
    throw new Response(
      "Ce compte est suspendu. Contactez le support DevisRoom.",
      { status: 403 },
    );
  }
  const subscription = await getOrCreateSubscription(found.organization.id);
  return {
    session,
    organization: found.organization,
    membership: found.membership,
    subscription,
    plan: getPlan(subscription.plan),
  };
}

/** Variante sans redirection (pour l'onboarding). */
export async function requireSessionWithOptionalOrg(request: Request) {
  const session = await requireSession(request);
  const found = await getOrgForUser(session.user.id);
  return { session, org: found?.organization ?? null };
}

export async function getOrCreateSubscription(organizationId: string) {
  const db = getDb();
  const existing = await db
    .select()
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.organizationId, organizationId))
    .limit(1);
  if (existing[0]) return existing[0];
  const inserted = await db
    .insert(schema.subscriptions)
    .values({ id: newId(), organizationId, plan: "free", status: "active" })
    .returning();
  return inserted[0];
}

export async function createOrganization(
  userId: string,
  values: {
    name: string;
    profession?: string;
    phone?: string;
    email?: string;
    address?: string;
    postalCode?: string;
    city?: string;
    siret?: string;
    website?: string;
  },
) {
  const db = getDb();
  const orgId = newId();
  await db.insert(schema.organizations).values({
    id: orgId,
    name: values.name,
    profession: values.profession ?? null,
    phone: values.phone ?? null,
    email: values.email ?? null,
    address: values.address ?? null,
    postalCode: values.postalCode ?? null,
    city: values.city ?? null,
    siret: values.siret ?? null,
    website: values.website ?? null,
    onboardingStep: 1,
  });
  await db.insert(schema.organizationMembers).values({
    id: newId(),
    organizationId: orgId,
    userId,
    role: "owner",
  });
  await getOrCreateSubscription(orgId);
  return orgId;
}
