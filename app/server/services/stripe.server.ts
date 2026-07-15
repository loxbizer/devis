import Stripe from "stripe";
import { eq } from "drizzle-orm";
import type { BillingInterval, PlanId } from "~/lib/plans";
import { getDb, schema } from "../db.server";
import { getAppUrl, getEnv, isStripeConfigured } from "../env.server";

/**
 * Intégration Stripe Checkout pour l'abonnement DevisRoom.
 * L'activation d'un abonnement ne fait JAMAIS confiance au retour
 * navigateur : seul le webhook vérifié côté serveur met à jour la base.
 */

let cachedStripe: Stripe | undefined;

export function getStripe(): Stripe | null {
  const key = getEnv().STRIPE_SECRET_KEY;
  if (!key) return null;
  cachedStripe ??= new Stripe(key, {
    httpClient: Stripe.createFetchHttpClient(),
  });
  return cachedStripe;
}

export function getPriceId(
  plan: PlanId,
  interval: BillingInterval,
): string | null {
  const env = getEnv();
  const map: Record<string, string | undefined> = {
    "solo:monthly": env.STRIPE_PRICE_SOLO_MONTHLY,
    "solo:yearly": env.STRIPE_PRICE_SOLO_YEARLY,
    "pro:monthly": env.STRIPE_PRICE_PRO_MONTHLY,
    "pro:yearly": env.STRIPE_PRICE_PRO_YEARLY,
    "team:monthly": env.STRIPE_PRICE_TEAM_MONTHLY,
    "team:yearly": env.STRIPE_PRICE_TEAM_YEARLY,
  };
  return map[`${plan}:${interval}`] ?? null;
}

export type CheckoutResult =
  { ok: true; url: string } | { ok: false; error: string };

export async function createSubscriptionCheckout(params: {
  organizationId: string;
  userEmail: string;
  plan: PlanId;
  interval: BillingInterval;
}): Promise<CheckoutResult> {
  const stripe = getStripe();
  if (!stripe) {
    return {
      ok: false,
      error:
        "Stripe n'est pas configuré sur cette instance. En développement, définissez STRIPE_SECRET_KEY dans .dev.vars.",
    };
  }
  const priceId = getPriceId(params.plan, params.interval);
  if (!priceId) {
    return {
      ok: false,
      error: `Prix Stripe non configuré pour ${params.plan} (${params.interval}).`,
    };
  }

  const db = getDb();
  const [subscription] = await db
    .select()
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.organizationId, params.organizationId))
    .limit(1);

  const appUrl = getAppUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    customer: subscription?.stripeCustomerId ?? undefined,
    customer_email: subscription?.stripeCustomerId
      ? undefined
      : params.userEmail,
    client_reference_id: params.organizationId,
    metadata: { organizationId: params.organizationId, plan: params.plan },
    subscription_data: {
      metadata: { organizationId: params.organizationId, plan: params.plan },
    },
    success_url: `${appUrl}/app/abonnement?checkout=succes`,
    cancel_url: `${appUrl}/app/abonnement?checkout=annule`,
    locale: "fr",
  });
  if (!session.url) return { ok: false, error: "Session Stripe sans URL." };
  return { ok: true, url: session.url };
}

export async function createBillingPortal(
  organizationId: string,
): Promise<CheckoutResult> {
  const stripe = getStripe();
  if (!stripe) return { ok: false, error: "Stripe n'est pas configuré." };
  const db = getDb();
  const [subscription] = await db
    .select()
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.organizationId, organizationId))
    .limit(1);
  if (!subscription?.stripeCustomerId) {
    return { ok: false, error: "Aucun client Stripe associé à ce compte." };
  }
  const portal = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${getAppUrl()}/app/abonnement`,
  });
  return { ok: true, url: portal.url };
}

// ---------------------------------------------------------------------------
// Webhooks
// ---------------------------------------------------------------------------

function planFromMetadata(metadata: Record<string, string> | null): PlanId {
  const plan = metadata?.plan;
  if (plan === "solo" || plan === "pro" || plan === "team") return plan;
  return "free";
}

/**
 * Traite un événement Stripe déjà vérifié (signature contrôlée en amont).
 * Idempotent : l'événement est journalisé dans stripe_webhook_events.
 */
export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  const db = getDb();
  const already = await db
    .select({ id: schema.stripeWebhookEvents.id })
    .from(schema.stripeWebhookEvents)
    .where(eq(schema.stripeWebhookEvents.id, event.id))
    .limit(1);
  if (already[0]) return;

  let error: string | null = null;
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const organizationId =
          session.metadata?.organizationId ?? session.client_reference_id;
        if (organizationId && session.customer) {
          await db
            .update(schema.subscriptions)
            .set({
              stripeCustomerId: String(session.customer),
              updatedAt: new Date(),
            })
            .where(eq(schema.subscriptions.organizationId, organizationId));
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const organizationId = sub.metadata?.organizationId;
        if (!organizationId) break;
        const item = sub.items.data[0];
        const interval =
          item?.price?.recurring?.interval === "year" ? "yearly" : "monthly";
        const status =
          sub.status === "active" || sub.status === "trialing"
            ? sub.status === "trialing"
              ? "trialing"
              : "active"
            : sub.status === "past_due"
              ? "past_due"
              : "canceled";
        const plan =
          status === "canceled" ? "free" : planFromMetadata(sub.metadata);
        await db
          .update(schema.subscriptions)
          .set({
            plan,
            interval,
            status,
            stripeCustomerId: String(sub.customer),
            stripeSubscriptionId: sub.id,
            currentPeriodEnd: item?.current_period_end
              ? new Date(item.current_period_end * 1000)
              : null,
            cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
            updatedAt: new Date(),
          })
          .where(eq(schema.subscriptions.organizationId, organizationId));
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const organizationId = sub.metadata?.organizationId;
        if (!organizationId) break;
        await db
          .update(schema.subscriptions)
          .set({
            plan: "free",
            status: "canceled",
            stripeSubscriptionId: null,
            cancelAtPeriodEnd: false,
            updatedAt: new Date(),
          })
          .where(eq(schema.subscriptions.organizationId, organizationId));
        break;
      }
      default:
        // Événement non géré : simplement journalisé.
        break;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  await db.insert(schema.stripeWebhookEvents).values({
    id: event.id,
    type: event.type,
    payload: JSON.stringify({
      type: event.type,
      created: event.created,
    }),
    processedAt: error ? null : new Date(),
    error,
  });

  if (error) throw new Error(error);
}

export async function verifyStripeWebhook(
  request: Request,
): Promise<Stripe.Event | null> {
  const stripe = getStripe();
  const secret = getEnv().STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return null;
  const signature = request.headers.get("stripe-signature");
  if (!signature) return null;
  const payload = await request.text();
  try {
    return await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      secret,
    );
  } catch {
    return null;
  }
}

export { isStripeConfigured };
