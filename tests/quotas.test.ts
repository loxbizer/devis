import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb, seedOrg, type TestDb } from "./helpers/db";
import {
  canPublishProposal,
  canStoreFile,
  clampExpiry,
  getQuotaUsage,
} from "~/server/services/quotas.server";
import { PLANS } from "~/lib/plans";
import {
  createProposal,
  publishProposal,
  getProposalForOrg,
} from "~/server/services/proposals.server";
import type { Db } from "~/server/db.server";

let db: TestDb;

beforeEach(() => {
  ({ db } = createTestDb());
});

describe("quotas", () => {
  it("compte les propositions actives et le stockage", async () => {
    const { userId, orgId } = await seedOrg(db);
    const p1 = await createProposal({
      organizationId: orgId,
      userId,
      title: "Devis 1",
      clientName: "Client",
    });
    await publishProposal(p1, userId);
    // brouillon : ne compte pas
    await createProposal({
      organizationId: orgId,
      userId,
      title: "Devis 2",
      clientName: "Client",
    });

    const usage = await getQuotaUsage(db as unknown as Db, orgId, "free");
    expect(usage.activeProposals).toBe(1);
    expect(usage.storageBytes).toBe(0);
    expect(usage.members).toBe(1);
  });

  it("bloque la publication au-delà de la limite du plan gratuit", async () => {
    const { userId, orgId } = await seedOrg(db);
    for (let i = 0; i < 3; i++) {
      const proposal = await createProposal({
        organizationId: orgId,
        userId,
        title: `Devis ${i}`,
        clientName: "Client",
      });
      await publishProposal(proposal, userId);
    }
    const usage = await getQuotaUsage(db as unknown as Db, orgId, "free");
    const check = canPublishProposal(usage);
    expect(check.allowed).toBe(false);
    if (!check.allowed) {
      expect(check.reason).toContain("3");
      // Les données ne sont jamais perdues : le message propose l'archivage.
      expect(check.reason.toLowerCase()).toContain("archivez");
    }
  });

  it("autorise la publication sur un plan supérieur", async () => {
    const { orgId } = await seedOrg(db, { plan: "pro" });
    const usage = await getQuotaUsage(db as unknown as Db, orgId, "pro");
    expect(canPublishProposal(usage).allowed).toBe(true);
  });

  it("contrôle le quota de stockage", () => {
    const usage = {
      activeProposals: 0,
      storageBytes: PLANS.free.limits.maxStorageBytes - 100,
      members: 1,
      limits: PLANS.free.limits,
    };
    expect(canStoreFile(usage, 50).allowed).toBe(true);
    expect(canStoreFile(usage, 200).allowed).toBe(false);
  });

  it("plafonne l'expiration à 30 jours en plan gratuit", () => {
    const inSixtyDays = new Date(Date.now() + 60 * 24 * 3600 * 1000);
    const clamped = clampExpiry(PLANS.free.limits, inSixtyDays);
    expect(clamped).not.toBeNull();
    expect(clamped!.getTime()).toBeLessThan(inSixtyDays.getTime());
    // Pas de plafond en Pro
    expect(clampExpiry(PLANS.pro.limits, inSixtyDays)).toBe(inSixtyDays);
    // Sans date demandée, le gratuit reçoit quand même un plafond
    expect(clampExpiry(PLANS.free.limits, null)).not.toBeNull();
  });
});

describe("permissions inter-organisations", () => {
  it("une organisation ne voit jamais les devis d'une autre", async () => {
    const a = await seedOrg(db);
    const b = await seedOrg(db);
    const proposal = await createProposal({
      organizationId: a.orgId,
      userId: a.userId,
      title: "Devis privé",
      clientName: "Client A",
    });
    expect(await getProposalForOrg(proposal.id, a.orgId)).not.toBeNull();
    expect(await getProposalForOrg(proposal.id, b.orgId)).toBeNull();
  });
});
