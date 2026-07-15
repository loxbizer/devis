import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, seedOrg, type TestDb } from "./helpers/db";
import * as schema from "~/server/db/schema";
import { computeBadge, getLevel, getNextLevel } from "~/lib/rewards";
import {
  awardPoints,
  getRewardBalance,
  redeemReward,
} from "~/server/services/rewards.server";

let db: TestDb;

beforeEach(() => {
  ({ db } = createTestDb());
});

describe("gains de points", () => {
  it("crédite les points selon la règle", async () => {
    const { orgId } = await seedOrg(db);
    await awardPoints(orgId, "proposal_published", "prop-1");
    await awardPoints(orgId, "proposal_accepted", "prop-1");
    const { balance, lifetime } = await getRewardBalance(orgId);
    expect(balance).toBe(120);
    expect(lifetime).toBe(120);
  });

  it("est idempotent : le même événement ne crédite qu'une fois", async () => {
    const { orgId } = await seedOrg(db);
    expect(await awardPoints(orgId, "first_view", "prop-1")).toBe(true);
    expect(await awardPoints(orgId, "first_view", "prop-1")).toBe(false);
    const { balance } = await getRewardBalance(orgId);
    expect(balance).toBe(10);
  });

  it("crédite des propositions distinctes séparément", async () => {
    const { orgId } = await seedOrg(db);
    await awardPoints(orgId, "proposal_published", "prop-1");
    await awardPoints(orgId, "proposal_published", "prop-2");
    const { balance } = await getRewardBalance(orgId);
    expect(balance).toBe(40);
  });

  it("isole les organisations", async () => {
    const a = await seedOrg(db);
    const b = await seedOrg(db);
    await awardPoints(a.orgId, "proposal_accepted", "prop-1");
    expect((await getRewardBalance(a.orgId)).balance).toBe(100);
    expect((await getRewardBalance(b.orgId)).balance).toBe(0);
  });
});

describe("échanges", () => {
  it("refuse un échange sans solde suffisant", async () => {
    const { orgId } = await seedOrg(db);
    const result = await redeemReward(orgId, "badge_certified");
    expect(result.ok).toBe(false);
    expect((await getRewardBalance(orgId)).balance).toBe(0);
  });

  it("active le badge Certifié et débite les points", async () => {
    const { orgId } = await seedOrg(db);
    // 3 acceptations = 300 points
    await awardPoints(orgId, "proposal_accepted", "p1");
    await awardPoints(orgId, "proposal_accepted", "p2");
    await awardPoints(orgId, "proposal_accepted", "p3");

    const result = await redeemReward(orgId, "badge_certified");
    expect(result.ok).toBe(true);

    const [org] = await db
      .select()
      .from(schema.organizations)
      .where(eq(schema.organizations.id, orgId));
    expect(org.badge).toBe("certified");

    const { balance, lifetime } = await getRewardBalance(orgId);
    expect(balance).toBe(0);
    expect(lifetime).toBe(300); // les dépenses ne réduisent pas le total gagné
  });

  it("refuse un second badge", async () => {
    const { orgId } = await seedOrg(db);
    for (let i = 0; i < 6; i++) {
      await awardPoints(orgId, "proposal_accepted", `p${i}`);
    }
    expect((await redeemReward(orgId, "badge_certified")).ok).toBe(true);
    const again = await redeemReward(orgId, "badge_certified");
    expect(again.ok).toBe(false);
    // Les points du second essai n'ont pas été débités.
    expect((await getRewardBalance(orgId)).balance).toBe(300);
  });

  it("refuse la réduction sans abonnement payant et ne débite rien", async () => {
    const { orgId } = await seedOrg(db); // plan free, pas de Stripe
    for (let i = 0; i < 6; i++) {
      await awardPoints(orgId, "proposal_accepted", `p${i}`);
    }
    const result = await redeemReward(orgId, "discount_20");
    expect(result.ok).toBe(false);
    expect((await getRewardBalance(orgId)).balance).toBe(600);
  });

  it("refuse une récompense inconnue", async () => {
    const { orgId } = await seedOrg(db);
    expect((await redeemReward(orgId, "hack")).ok).toBe(false);
  });
});

describe("niveaux et badge", () => {
  it("calcule le niveau à partir du total gagné", () => {
    expect(getLevel(0).name).toBe("Bronze");
    expect(getLevel(299).name).toBe("Bronze");
    expect(getLevel(300).name).toBe("Argent");
    expect(getLevel(1000).name).toBe("Or");
    expect(getLevel(9999).name).toBe("Platine");
    expect(getNextLevel(0)?.name).toBe("Argent");
    expect(getNextLevel(9999)).toBeNull();
  });

  it("le badge Or (plans payants) prime sur le badge points", () => {
    expect(computeBadge("none", "free")).toBe("none");
    expect(computeBadge("certified", "free")).toBe("certified");
    expect(computeBadge("certified", "solo")).toBe("certified");
    expect(computeBadge("none", "pro")).toBe("gold");
    expect(computeBadge("certified", "team")).toBe("gold");
  });
});
