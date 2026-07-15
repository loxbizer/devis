import { and, asc, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { computeTotal } from "~/lib/pricing";
import type { SectionType } from "~/lib/sections";
import { newId, randomToken, sha256Hex } from "../auth/password.server";
import { getDb, schema } from "../db.server";
import { notifyOrganization } from "./notifications.server";
import { awardPoints } from "./rewards.server";

export type Proposal = typeof schema.proposals.$inferSelect;
export type ProposalSection = typeof schema.proposalSections.$inferSelect;
export type ProposalPackage = typeof schema.proposalPackages.$inferSelect;
export type ProposalOption = typeof schema.proposalOptions.$inferSelect;
export type ProposalAsset = typeof schema.proposalAssets.$inferSelect;

/** Slug public non prévisible (~95 bits d'entropie). */
export function generateSlug(): string {
  return randomToken(12);
}

// ---------------------------------------------------------------------------
// Lecture côté professionnel (toujours filtrée par organisation)
// ---------------------------------------------------------------------------

export async function getProposalForOrg(
  proposalId: string,
  organizationId: string,
): Promise<Proposal | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.proposals)
    .where(
      and(
        eq(schema.proposals.id, proposalId),
        eq(schema.proposals.organizationId, organizationId),
        isNull(schema.proposals.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function listProposalsForOrg(organizationId: string) {
  const db = getDb();
  return db
    .select()
    .from(schema.proposals)
    .where(
      and(
        eq(schema.proposals.organizationId, organizationId),
        isNull(schema.proposals.deletedAt),
      ),
    )
    .orderBy(desc(schema.proposals.updatedAt));
}

export interface ProposalDetails {
  proposal: Proposal;
  sections: ProposalSection[];
  packages: ProposalPackage[];
  options: ProposalOption[];
  images: ProposalAsset[];
}

export async function getProposalDetails(
  proposal: Proposal,
): Promise<ProposalDetails> {
  const db = getDb();
  const [sections, packages, options, images] = await Promise.all([
    db
      .select()
      .from(schema.proposalSections)
      .where(eq(schema.proposalSections.proposalId, proposal.id))
      .orderBy(asc(schema.proposalSections.position)),
    db
      .select()
      .from(schema.proposalPackages)
      .where(eq(schema.proposalPackages.proposalId, proposal.id))
      .orderBy(asc(schema.proposalPackages.position)),
    db
      .select()
      .from(schema.proposalOptions)
      .where(eq(schema.proposalOptions.proposalId, proposal.id))
      .orderBy(asc(schema.proposalOptions.position)),
    db
      .select()
      .from(schema.proposalAssets)
      .where(
        and(
          eq(schema.proposalAssets.proposalId, proposal.id),
          eq(schema.proposalAssets.kind, "image"),
          isNull(schema.proposalAssets.deletedAt),
        ),
      )
      .orderBy(asc(schema.proposalAssets.position)),
  ]);
  return { proposal, sections, packages, options, images };
}

// ---------------------------------------------------------------------------
// Création / modification
// ---------------------------------------------------------------------------

export async function createProposal(params: {
  organizationId: string;
  userId: string;
  title: string;
  clientName: string;
  clientEmail?: string | null;
  totalAmountCents?: number;
  summary?: string | null;
}): Promise<Proposal> {
  const db = getDb();
  const [proposal] = await db
    .insert(schema.proposals)
    .values({
      id: newId(),
      organizationId: params.organizationId,
      createdByUserId: params.userId,
      slug: generateSlug(),
      title: params.title,
      clientName: params.clientName,
      clientEmail: params.clientEmail ?? null,
      totalAmountCents: params.totalAmountCents ?? 0,
      summary: params.summary ?? null,
    })
    .returning();
  return proposal;
}

export async function upsertSection(params: {
  proposalId: string;
  type: SectionType;
  title: string;
  content: unknown;
  position: number;
  sectionId?: string | null;
}) {
  const db = getDb();
  if (params.sectionId) {
    await db
      .update(schema.proposalSections)
      .set({
        title: params.title,
        content: JSON.stringify(params.content),
        position: params.position,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.proposalSections.id, params.sectionId),
          eq(schema.proposalSections.proposalId, params.proposalId),
        ),
      );
    return params.sectionId;
  }
  const id = newId();
  await db.insert(schema.proposalSections).values({
    id,
    proposalId: params.proposalId,
    type: params.type,
    title: params.title,
    content: JSON.stringify(params.content),
    position: params.position,
  });
  return id;
}

export async function recordEvent(
  proposalId: string,
  type: (typeof schema.proposalEvents.$inferInsert)["type"],
  data?: unknown,
) {
  const db = getDb();
  await db.insert(schema.proposalEvents).values({
    id: newId(),
    proposalId,
    type,
    data: data ? JSON.stringify(data) : null,
  });
}

/** Publication : snapshot de version + passage en « published ». */
export async function publishProposal(proposal: Proposal, userId: string) {
  const db = getDb();
  const details = await getProposalDetails(proposal);
  const nextVersion =
    proposal.status === "published" ? proposal.version + 1 : proposal.version;
  await db.insert(schema.proposalVersions).values({
    id: newId(),
    proposalId: proposal.id,
    version: nextVersion,
    snapshot: JSON.stringify({
      proposal: {
        title: proposal.title,
        clientName: proposal.clientName,
        summary: proposal.summary,
        message: proposal.message,
        terms: proposal.terms,
        totalAmountCents: proposal.totalAmountCents,
      },
      sections: details.sections,
      packages: details.packages,
      options: details.options,
    }),
    createdByUserId: userId,
  });
  await db
    .update(schema.proposals)
    .set({
      status: "published",
      version: nextVersion,
      publishedAt: proposal.publishedAt ?? new Date(),
      archivedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(schema.proposals.id, proposal.id));
  await recordEvent(proposal.id, "published", { version: nextVersion });
  // Points de récompense — idempotent : une seule fois par devis.
  await awardPoints(proposal.organizationId, "proposal_published", proposal.id);
}

export async function setAccessCode(proposalId: string, code: string | null) {
  const db = getDb();
  await db
    .update(schema.proposals)
    .set({
      accessCodeHash: code ? await sha256Hex(code.trim().toLowerCase()) : null,
      updatedAt: new Date(),
    })
    .where(eq(schema.proposals.id, proposalId));
}

export async function duplicateProposal(source: Proposal, userId: string) {
  const db = getDb();
  const details = await getProposalDetails(source);
  const copy = await createProposal({
    organizationId: source.organizationId,
    userId,
    title: `${source.title} (copie)`,
    clientName: source.clientName,
    clientEmail: source.clientEmail,
    totalAmountCents: source.totalAmountCents,
    summary: source.summary,
  });
  await db
    .update(schema.proposals)
    .set({
      message: source.message,
      terms: source.terms,
      depositEnabled: source.depositEnabled,
      depositMode: source.depositMode,
      depositAmountCents: source.depositAmountCents,
    })
    .where(eq(schema.proposals.id, copy.id));
  for (const section of details.sections) {
    await db.insert(schema.proposalSections).values({
      id: newId(),
      proposalId: copy.id,
      type: section.type,
      title: section.title,
      content:
        typeof section.content === "string"
          ? section.content
          : JSON.stringify(section.content),
      position: section.position,
    });
  }
  for (const pkg of details.packages) {
    await db.insert(schema.proposalPackages).values({
      id: newId(),
      proposalId: copy.id,
      name: pkg.name,
      description: pkg.description,
      priceCents: pkg.priceCents,
      features:
        typeof pkg.features === "string"
          ? pkg.features
          : JSON.stringify(pkg.features),
      isRecommended: pkg.isRecommended,
      position: pkg.position,
    });
  }
  for (const option of details.options) {
    await db.insert(schema.proposalOptions).values({
      id: newId(),
      proposalId: copy.id,
      name: option.name,
      description: option.description,
      priceCents: option.priceCents,
      position: option.position,
    });
  }
  return copy;
}

// ---------------------------------------------------------------------------
// Lecture côté client final (page publique /d/[slug])
// ---------------------------------------------------------------------------

export async function getPublicProposal(slug: string) {
  const db = getDb();
  const rows = await db
    .select({
      proposal: schema.proposals,
      organization: schema.organizations,
    })
    .from(schema.proposals)
    .innerJoin(
      schema.organizations,
      eq(schema.proposals.organizationId, schema.organizations.id),
    )
    .where(
      and(
        eq(schema.proposals.slug, slug),
        eq(schema.proposals.status, "published"),
        isNull(schema.proposals.deletedAt),
        isNull(schema.proposals.archivedAt),
        isNull(schema.organizations.suspendedAt),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  // Expiration automatique.
  if (row.proposal.expiresAt && row.proposal.expiresAt.getTime() < Date.now()) {
    if (row.proposal.outcome === "pending") {
      await db
        .update(schema.proposals)
        .set({ outcome: "expired", updatedAt: new Date() })
        .where(eq(schema.proposals.id, row.proposal.id));
      await recordEvent(row.proposal.id, "expired");
    }
    return { ...row, expired: true };
  }
  return { ...row, expired: false };
}

export async function verifyAccessCode(
  proposal: Proposal,
  code: string,
): Promise<boolean> {
  if (!proposal.accessCodeHash) return true;
  const hash = await sha256Hex(code.trim().toLowerCase());
  return hash === proposal.accessCodeHash;
}

/** Enregistre une vue (une par session de visite) sans traçage invasif. */
export async function recordView(params: {
  proposalId: string;
  organizationId: string;
  visitorId: string;
  userAgent: string | null;
  proposalTitle: string;
}) {
  const db = getDb();
  const existing = await db
    .select({ id: schema.proposalViews.id })
    .from(schema.proposalViews)
    .where(
      and(
        eq(schema.proposalViews.proposalId, params.proposalId),
        eq(schema.proposalViews.visitorId, params.visitorId),
        gt(
          schema.proposalViews.createdAt,
          new Date(Date.now() - 30 * 60 * 1000),
        ),
      ),
    )
    .limit(1);
  if (existing[0]) return; // même session de visite : ne pas recompter

  const device = detectDevice(params.userAgent);
  await db.insert(schema.proposalViews).values({
    id: newId(),
    proposalId: params.proposalId,
    visitorId: params.visitorId,
    device,
  });

  const [{ value: total }] = await db
    .select({ value: sql<number>`count(*)` })
    .from(schema.proposalViews)
    .where(eq(schema.proposalViews.proposalId, params.proposalId));

  await recordEvent(params.proposalId, total <= 1 ? "first_view" : "view", {
    device,
  });
  if (total <= 1) {
    await notifyOrganization({
      organizationId: params.organizationId,
      type: "first_view",
      title: `Première consultation : ${params.proposalTitle}`,
      body: "Votre client vient d'ouvrir sa DevisRoom pour la première fois.",
      linkTo: `/app/devis/${params.proposalId}/statistiques`,
    });
    await awardPoints(params.organizationId, "first_view", params.proposalId);
  }
}

export function detectDevice(
  userAgent: string | null,
): "mobile" | "tablet" | "desktop" | "unknown" {
  if (!userAgent) return "unknown";
  if (/iPad|Tablet/i.test(userAgent)) return "tablet";
  if (/Mobi|Android|iPhone/i.test(userAgent)) return "mobile";
  return "desktop";
}

// ---------------------------------------------------------------------------
// Acceptation
// ---------------------------------------------------------------------------

export interface AcceptanceInput {
  name: string;
  email: string;
  packageId: string | null;
  optionIds: string[];
  confirmedTotalCents: number;
  termsAccepted: boolean;
  userAgent: string | null;
  ipAddress: string | null;
}

export type AcceptanceResult =
  | { ok: true; acceptanceId: string; totalCents: number }
  | { ok: false; error: string };

/**
 * Enregistre l'acceptation d'une proposition. Le total est recalculé côté
 * serveur ; le montant confirmé par le client doit correspondre exactement.
 */
export async function acceptProposal(
  proposal: Proposal,
  organizationName: string,
  input: AcceptanceInput,
): Promise<AcceptanceResult> {
  if (!input.termsAccepted) {
    return { ok: false, error: "Vous devez confirmer votre acceptation." };
  }
  if (proposal.acceptedAt) {
    return { ok: false, error: "Cette proposition a déjà été acceptée." };
  }
  const db = getDb();
  const details = await getProposalDetails(proposal);

  let packageName = "Offre principale";
  let selectedPackage: ProposalPackage | null = null;
  if (details.packages.length > 0) {
    selectedPackage =
      details.packages.find((p) => p.id === input.packageId) ?? null;
    if (!selectedPackage) {
      return { ok: false, error: "Merci de sélectionner une formule." };
    }
    packageName = selectedPackage.name;
  }

  const pricing = computeTotal(
    details.packages.length > 0
      ? details.packages
      : [{ id: "__base__", priceCents: proposal.totalAmountCents }],
    details.options,
    {
      packageId: selectedPackage?.id ?? "__base__",
      optionIds: input.optionIds,
    },
  );

  if (pricing.totalCents !== input.confirmedTotalCents) {
    return {
      ok: false,
      error:
        "Le montant affiché a changé. Merci de vérifier votre sélection puis de confirmer à nouveau.",
    };
  }

  const selectedOptions = details.options
    .filter((o) => input.optionIds.includes(o.id))
    .map((o) => ({ id: o.id, name: o.name, priceCents: o.priceCents }));

  const acceptanceId = newId();
  await db.insert(schema.proposalAcceptances).values({
    id: acceptanceId,
    proposalId: proposal.id,
    proposalVersion: proposal.version,
    name: input.name,
    email: input.email,
    packageId: selectedPackage?.id ?? null,
    packageName,
    selectedOptions: JSON.stringify(selectedOptions),
    totalCents: pricing.totalCents,
    termsAccepted: true,
    userAgent: input.userAgent?.slice(0, 255) ?? null,
    ipAddress: input.ipAddress,
  });
  await db
    .update(schema.proposals)
    .set({ acceptedAt: new Date(), outcome: "won", updatedAt: new Date() })
    .where(eq(schema.proposals.id, proposal.id));
  await recordEvent(proposal.id, "accepted", {
    packageName,
    totalCents: pricing.totalCents,
  });
  await notifyOrganization({
    organizationId: proposal.organizationId,
    type: "accepted",
    title: `Proposition acceptée : ${proposal.title}`,
    body: `${input.name} a accepté « ${packageName} » pour un total de ${(pricing.totalCents / 100).toLocaleString("fr-FR")} €. Vous gagnez 100 points de récompense !`,
    linkTo: `/app/devis/${proposal.id}`,
  });
  await awardPoints(proposal.organizationId, "proposal_accepted", proposal.id);
  return { ok: true, acceptanceId, totalCents: pricing.totalCents };
}
