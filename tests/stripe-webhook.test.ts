import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { createTestDb, seedOrg, type TestDb } from "./helpers/db";
import * as schema from "~/server/db/schema";
import { handleStripeEvent } from "~/server/services/stripe.server";

let db: TestDb;

beforeEach(() => {
  ({ db } = createTestDb());
});

function subscriptionEvent(
  type: string,
  organizationId: string,
  overrides: Record<string, unknown> = {},
): Stripe.Event {
  return {
    id: `evt_${Math.random().toString(36).slice(2)}`,
    type,
    created: 1720000000,
    data: {
      object: {
        id: "sub_test_1",
        customer: "cus_test_1",
        status: "active",
        cancel_at_period_end: false,
        metadata: { organizationId, plan: "pro" },
        items: {
          data: [
            {
              price: { recurring: { interval: "month" } },
              current_period_end: 1725000000,
            },
          ],
        },
        ...overrides,
      },
    },
  } as unknown as Stripe.Event;
}

async function getSubscription(orgId: string) {
  const [row] = await db
    .select()
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.organizationId, orgId));
  return row;
}

describe("handleStripeEvent", () => {
  it("active un abonnement Pro à réception du webhook", async () => {
    const { orgId } = await seedOrg(db);
    await handleStripeEvent(
      subscriptionEvent("customer.subscription.created", orgId),
    );
    const subscription = await getSubscription(orgId);
    expect(subscription.plan).toBe("pro");
    expect(subscription.status).toBe("active");
    expect(subscription.interval).toBe("monthly");
    expect(subscription.stripeCustomerId).toBe("cus_test_1");
    expect(subscription.stripeSubscriptionId).toBe("sub_test_1");
  });

  it("gère l'intervalle annuel", async () => {
    const { orgId } = await seedOrg(db);
    await handleStripeEvent(
      subscriptionEvent("customer.subscription.updated", orgId, {
        items: {
          data: [
            {
              price: { recurring: { interval: "year" } },
              current_period_end: 1750000000,
            },
          ],
        },
      }),
    );
    const subscription = await getSubscription(orgId);
    expect(subscription.interval).toBe("yearly");
  });

  it("rétrograde vers le plan gratuit à la suppression", async () => {
    const { orgId } = await seedOrg(db, { plan: "pro" });
    await handleStripeEvent(
      subscriptionEvent("customer.subscription.deleted", orgId),
    );
    const subscription = await getSubscription(orgId);
    expect(subscription.plan).toBe("free");
    expect(subscription.status).toBe("canceled");
  });

  it("est idempotent : le même événement n'est traité qu'une fois", async () => {
    const { orgId } = await seedOrg(db);
    const event = subscriptionEvent("customer.subscription.created", orgId);
    await handleStripeEvent(event);
    // Modifier manuellement puis rejouer le même événement : rien ne change.
    await db
      .update(schema.subscriptions)
      .set({ plan: "team" })
      .where(eq(schema.subscriptions.organizationId, orgId));
    await handleStripeEvent(event);
    const subscription = await getSubscription(orgId);
    expect(subscription.plan).toBe("team");
  });

  it("journalise l'événement pour l'administration", async () => {
    const { orgId } = await seedOrg(db);
    const event = subscriptionEvent("customer.subscription.created", orgId);
    await handleStripeEvent(event);
    const [logged] = await db
      .select()
      .from(schema.stripeWebhookEvents)
      .where(eq(schema.stripeWebhookEvents.id, event.id));
    expect(logged).toBeDefined();
    expect(logged.type).toBe("customer.subscription.created");
    expect(logged.processedAt).not.toBeNull();
  });

  it("ignore proprement un événement sans organisation", async () => {
    await handleStripeEvent(
      subscriptionEvent("customer.subscription.created", "", {
        metadata: {},
      }),
    );
    // Aucune exception : l'événement est simplement journalisé.
  });
});
