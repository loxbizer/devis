import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, seedOrg, type TestDb } from "./helpers/db";
import * as schema from "~/server/db/schema";
import {
  acceptProposal,
  createProposal,
  getPublicProposal,
  publishProposal,
  verifyAccessCode,
  setAccessCode,
} from "~/server/services/proposals.server";
import { newId } from "~/server/auth/password.server";

let db: TestDb;

beforeEach(() => {
  ({ db } = createTestDb());
});

async function makePublishedProposal() {
  const { userId, orgId } = await seedOrg(db, { plan: "pro" });
  const proposal = await createProposal({
    organizationId: orgId,
    userId,
    title: "Rénovation toiture",
    clientName: "M. Martin",
    totalAmountCents: 1090000,
  });
  await db.insert(schema.proposalPackages).values([
    {
      id: "pkg-a",
      proposalId: proposal.id,
      name: "Essentielle",
      priceCents: 790000,
      features: JSON.stringify([]),
      position: 0,
    },
    {
      id: "pkg-b",
      proposalId: proposal.id,
      name: "Recommandée",
      priceCents: 1090000,
      features: JSON.stringify([]),
      isRecommended: true,
      position: 1,
    },
  ]);
  await db.insert(schema.proposalOptions).values({
    id: "opt-a",
    proposalId: proposal.id,
    name: "Fenêtre de toit",
    priceCents: 185000,
    position: 0,
  });
  await publishProposal(proposal, userId);
  const [published] = await db
    .select()
    .from(schema.proposals)
    .where(eq(schema.proposals.id, proposal.id));
  return { proposal: published, userId, orgId };
}

describe("création et publication", () => {
  it("crée une proposition en brouillon avec un slug non prévisible", async () => {
    const { userId, orgId } = await seedOrg(db);
    const proposal = await createProposal({
      organizationId: orgId,
      userId,
      title: "Test",
      clientName: "Client",
    });
    expect(proposal.status).toBe("draft");
    expect(proposal.slug).toMatch(/^[0-9a-f]{24}$/);
  });

  it("un brouillon n'est pas accessible publiquement", async () => {
    const { userId, orgId } = await seedOrg(db);
    const proposal = await createProposal({
      organizationId: orgId,
      userId,
      title: "Test",
      clientName: "Client",
    });
    expect(await getPublicProposal(proposal.slug)).toBeNull();
  });

  it("la publication crée un instantané de version", async () => {
    const { proposal } = await makePublishedProposal();
    expect(proposal.status).toBe("published");
    const versions = await db
      .select()
      .from(schema.proposalVersions)
      .where(eq(schema.proposalVersions.proposalId, proposal.id));
    expect(versions).toHaveLength(1);
    const found = await getPublicProposal(proposal.slug);
    expect(found).not.toBeNull();
    expect(found!.expired).toBe(false);
  });

  it("une proposition expirée est signalée comme telle", async () => {
    const { proposal } = await makePublishedProposal();
    await db
      .update(schema.proposals)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(schema.proposals.id, proposal.id));
    const found = await getPublicProposal(proposal.slug);
    expect(found!.expired).toBe(true);
  });
});

describe("code d'accès", () => {
  it("vérifie le code indépendamment de la casse et des espaces", async () => {
    const { proposal } = await makePublishedProposal();
    await setAccessCode(proposal.id, "Martin2026");
    const [updated] = await db
      .select()
      .from(schema.proposals)
      .where(eq(schema.proposals.id, proposal.id));
    expect(await verifyAccessCode(updated, "martin2026")).toBe(true);
    expect(await verifyAccessCode(updated, "  MARTIN2026 ")).toBe(true);
    expect(await verifyAccessCode(updated, "mauvais")).toBe(false);
  });
});

describe("acceptation", () => {
  const baseInput = {
    name: "M. Martin",
    email: "martin@example.com",
    termsAccepted: true,
    userAgent: "test",
    ipAddress: null,
  };

  it("accepte avec le bon total recalculé côté serveur", async () => {
    const { proposal, orgId } = await makePublishedProposal();
    const result = await acceptProposal(proposal, "Entreprise Test", {
      ...baseInput,
      packageId: "pkg-b",
      optionIds: ["opt-a"],
      confirmedTotalCents: 1090000 + 185000,
    });
    expect(result.ok).toBe(true);

    const [updated] = await db
      .select()
      .from(schema.proposals)
      .where(eq(schema.proposals.id, proposal.id));
    expect(updated.outcome).toBe("won");
    expect(updated.acceptedAt).not.toBeNull();

    const acceptances = await db
      .select()
      .from(schema.proposalAcceptances)
      .where(eq(schema.proposalAcceptances.proposalId, proposal.id));
    expect(acceptances).toHaveLength(1);
    expect(acceptances[0].packageName).toBe("Recommandée");
    expect(acceptances[0].proposalVersion).toBe(1);

    // Une notification a été créée pour l'organisation.
    const notifications = await db
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.organizationId, orgId));
    expect(notifications.some((n) => n.type === "accepted")).toBe(true);
  });

  it("refuse un montant confirmé différent du calcul serveur", async () => {
    const { proposal } = await makePublishedProposal();
    const result = await acceptProposal(proposal, "Entreprise Test", {
      ...baseInput,
      packageId: "pkg-b",
      optionIds: ["opt-a"],
      confirmedTotalCents: 100, // montant manipulé
    });
    expect(result.ok).toBe(false);
  });

  it("refuse une formule inexistante", async () => {
    const { proposal } = await makePublishedProposal();
    const result = await acceptProposal(proposal, "Entreprise Test", {
      ...baseInput,
      packageId: "pkg-inconnu",
      optionIds: [],
      confirmedTotalCents: 790000,
    });
    expect(result.ok).toBe(false);
  });

  it("refuse sans acceptation des conditions", async () => {
    const { proposal } = await makePublishedProposal();
    const result = await acceptProposal(proposal, "Entreprise Test", {
      ...baseInput,
      termsAccepted: false,
      packageId: "pkg-a",
      optionIds: [],
      confirmedTotalCents: 790000,
    });
    expect(result.ok).toBe(false);
  });

  it("refuse une double acceptation", async () => {
    const { proposal } = await makePublishedProposal();
    const first = await acceptProposal(proposal, "Entreprise Test", {
      ...baseInput,
      packageId: "pkg-a",
      optionIds: [],
      confirmedTotalCents: 790000,
    });
    expect(first.ok).toBe(true);
    const [updated] = await db
      .select()
      .from(schema.proposals)
      .where(eq(schema.proposals.id, proposal.id));
    const second = await acceptProposal(updated, "Entreprise Test", {
      ...baseInput,
      packageId: "pkg-a",
      optionIds: [],
      confirmedTotalCents: 790000,
    });
    expect(second.ok).toBe(false);
  });

  it("fonctionne sans formules (offre de base seule)", async () => {
    const { userId, orgId } = await seedOrg(db);
    const proposal = await createProposal({
      organizationId: orgId,
      userId,
      title: "Simple",
      clientName: "Client",
      totalAmountCents: 500000,
    });
    await publishProposal(proposal, userId);
    const result = await acceptProposal(proposal, "Entreprise Test", {
      ...baseInput,
      packageId: null,
      optionIds: [],
      confirmedTotalCents: 500000,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.totalCents).toBe(500000);
  });
});

describe("identifiants", () => {
  it("newId produit des UUID", () => {
    expect(newId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});
