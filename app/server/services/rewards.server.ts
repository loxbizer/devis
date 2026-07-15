import { desc, eq, sql } from "drizzle-orm";
import {
  EARN_RULES,
  REWARD_CATALOG,
  type EarnReason,
  type RewardItem,
} from "~/lib/rewards";
import { newId } from "../auth/password.server";
import { getDb, schema } from "../db.server";
import { getStripe } from "./stripe.server";

/**
 * Service du programme de récompenses.
 * Les gains sont idempotents : la contrainte d'unicité
 * (organisation, raison, référence) garantit qu'un même événement ne
 * crédite jamais deux fois.
 */

export async function awardPoints(
  organizationId: string,
  reason: EarnReason,
  refId: string,
): Promise<boolean> {
  const rule = EARN_RULES[reason];
  const db = getDb();
  try {
    await db.insert(schema.rewardTransactions).values({
      id: newId(),
      organizationId,
      delta: rule.points,
      reason: rule.reason,
      refId,
      label: rule.label,
    });
    return true;
  } catch {
    // Contrainte d'unicité : événement déjà récompensé — c'est voulu.
    return false;
  }
}

export interface RewardBalance {
  /** Points disponibles (gains − dépenses). */
  balance: number;
  /** Total des points gagnés depuis le début (pour le niveau). */
  lifetime: number;
}

export async function getRewardBalance(
  organizationId: string,
): Promise<RewardBalance> {
  const db = getDb();
  const [row] = await db
    .select({
      balance: sql<number>`coalesce(sum(${schema.rewardTransactions.delta}), 0)`,
      lifetime: sql<number>`coalesce(sum(case when ${schema.rewardTransactions.delta} > 0 then ${schema.rewardTransactions.delta} else 0 end), 0)`,
    })
    .from(schema.rewardTransactions)
    .where(eq(schema.rewardTransactions.organizationId, organizationId));
  return {
    balance: Number(row?.balance ?? 0),
    lifetime: Number(row?.lifetime ?? 0),
  };
}

export async function listRewardTransactions(
  organizationId: string,
  limit = 50,
) {
  const db = getDb();
  return db
    .select()
    .from(schema.rewardTransactions)
    .where(eq(schema.rewardTransactions.organizationId, organizationId))
    .orderBy(desc(schema.rewardTransactions.createdAt))
    .limit(limit);
}

export type RedeemResult =
  { ok: true; message: string } | { ok: false; error: string };

/**
 * Échange des points contre une récompense du catalogue.
 * Le solde est revérifié au moment de l'échange ; les points ne sont
 * débités que si la récompense a réellement été appliquée.
 */
export async function redeemReward(
  organizationId: string,
  itemId: string,
): Promise<RedeemResult> {
  const item = REWARD_CATALOG.find((i) => i.id === itemId);
  if (!item) return { ok: false, error: "Récompense inconnue." };

  const db = getDb();
  const { balance } = await getRewardBalance(organizationId);
  if (balance < item.cost) {
    return {
      ok: false,
      error: `Il vous manque ${item.cost - balance} points pour cette récompense. Ils arriveront tout seuls avec vos prochains devis !`,
    };
  }

  if (item.kind === "badge") {
    const [org] = await db
      .select({ badge: schema.organizations.badge })
      .from(schema.organizations)
      .where(eq(schema.organizations.id, organizationId))
      .limit(1);
    if (org?.badge === "certified") {
      return { ok: false, error: "Votre badge « Certifié » est déjà actif." };
    }
    await db
      .update(schema.organizations)
      .set({ badge: "certified", updatedAt: new Date() })
      .where(eq(schema.organizations.id, organizationId));
    await spendPoints(organizationId, item);
    return {
      ok: true,
      message:
        "Badge « Certifié » activé ! Il apparaît dès maintenant sur toutes vos pages de devis.",
    };
  }

  // Réduction sur la prochaine facture : nécessite un abonnement Stripe actif.
  const applied = await applyStripeDiscount(organizationId, item);
  if (!applied.ok) return applied;
  await spendPoints(organizationId, item);
  return applied;
}

async function spendPoints(organizationId: string, item: RewardItem) {
  const db = getDb();
  await db.insert(schema.rewardTransactions).values({
    id: newId(),
    organizationId,
    delta: -item.cost,
    reason: `redeem_${item.id}`,
    // Référence unique : les récompenses répétables restent possibles.
    refId: item.repeatable ? newId() : null,
    label: `Échange : ${item.label}`,
  });
}

async function applyStripeDiscount(
  organizationId: string,
  item: RewardItem,
): Promise<RedeemResult> {
  const stripe = getStripe();
  if (!stripe) {
    return {
      ok: false,
      error:
        "Les réductions s'appliquent aux abonnements payants — Stripe n'est pas configuré sur cette instance. Vos points restent intacts.",
    };
  }
  const db = getDb();
  const [subscription] = await db
    .select()
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.organizationId, organizationId))
    .limit(1);
  if (
    !subscription?.stripeSubscriptionId ||
    subscription.plan === "free" ||
    subscription.status === "canceled"
  ) {
    return {
      ok: false,
      error:
        "Cette réduction s'applique à la facture d'un abonnement payant (Solo, Pro ou Équipe). Vos points restent intacts en attendant.",
    };
  }
  try {
    const coupon = await stripe.coupons.create({
      percent_off: item.percentOff,
      duration: "once",
      name: `DevisRoom récompense −${item.percentOff}%`,
    });
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      discounts: [{ coupon: coupon.id }],
    });
    return {
      ok: true,
      message: `C'est fait : −${item.percentOff} % sur votre prochaine facture. Merci d'utiliser DevisRoom !`,
    };
  } catch (error) {
    console.error("[rewards] échec application réduction Stripe", error);
    return {
      ok: false,
      error:
        "Impossible d'appliquer la réduction pour le moment. Vos points restent intacts — réessayez plus tard.",
    };
  }
}
