import { and, count, eq, isNull, sum } from "drizzle-orm";
import { getPlan, type PlanLimits } from "~/lib/plans";
import { schema, type Db } from "../db.server";

export interface QuotaUsage {
  activeProposals: number;
  storageBytes: number;
  members: number;
  limits: PlanLimits;
}

/** Usage courant d'une organisation par rapport aux limites de son plan. */
export async function getQuotaUsage(
  db: Db,
  organizationId: string,
  planId: string,
): Promise<QuotaUsage> {
  const limits = getPlan(planId).limits;

  const [active] = await db
    .select({ value: count() })
    .from(schema.proposals)
    .where(
      and(
        eq(schema.proposals.organizationId, organizationId),
        eq(schema.proposals.status, "published"),
        isNull(schema.proposals.archivedAt),
        isNull(schema.proposals.deletedAt),
      ),
    );

  const [storage] = await db
    .select({ value: sum(schema.proposalAssets.sizeBytes) })
    .from(schema.proposalAssets)
    .where(
      and(
        eq(schema.proposalAssets.organizationId, organizationId),
        isNull(schema.proposalAssets.deletedAt),
      ),
    );

  const [members] = await db
    .select({ value: count() })
    .from(schema.organizationMembers)
    .where(eq(schema.organizationMembers.organizationId, organizationId));

  return {
    activeProposals: active?.value ?? 0,
    storageBytes: Number(storage?.value ?? 0),
    members: members?.value ?? 0,
    limits,
  };
}

export type QuotaCheck = { allowed: true } | { allowed: false; reason: string };

/** Peut-on publier une proposition supplémentaire ? */
export function canPublishProposal(usage: QuotaUsage): QuotaCheck {
  if (usage.activeProposals >= usage.limits.maxActiveProposals) {
    return {
      allowed: false,
      reason: `Votre plan autorise ${usage.limits.maxActiveProposals} DevisRooms actives. Archivez une proposition ou passez à un plan supérieur — vos données ne sont jamais supprimées.`,
    };
  }
  return { allowed: true };
}

/** Peut-on stocker `bytes` octets supplémentaires ? */
export function canStoreFile(usage: QuotaUsage, bytes: number): QuotaCheck {
  if (usage.storageBytes + bytes > usage.limits.maxStorageBytes) {
    return {
      allowed: false,
      reason:
        "Espace de stockage insuffisant pour ce fichier. Supprimez des fichiers inutilisés ou passez à un plan supérieur.",
    };
  }
  return { allowed: true };
}

/** Durée d'expiration maximale autorisée par le plan (validation serveur). */
export function clampExpiry(
  limits: PlanLimits,
  requested: Date | null,
): Date | null {
  if (!limits.maxExpiryDays) return requested;
  const max = new Date(Date.now() + limits.maxExpiryDays * 24 * 3600 * 1000);
  if (!requested || requested > max) return max;
  return requested;
}
