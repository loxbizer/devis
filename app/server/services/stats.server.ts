import {
  and,
  count,
  desc,
  eq,
  inArray,
  isNull,
  max,
  min,
  sql,
} from "drizzle-orm";
import { getDb, schema } from "../db.server";

/** Statistiques honnêtes d'une proposition — pas de précision trompeuse. */
export interface ProposalStats {
  totalViews: number;
  uniqueVisitors: number;
  firstViewAt: Date | null;
  lastViewAt: Date | null;
  mobileViews: number;
  desktopViews: number;
  tabletViews: number;
  questions: number;
  changeRequests: number;
  accepted: boolean;
  depositStarted: boolean;
  selectedOptions: string[];
}

export async function getProposalStats(
  proposalId: string,
): Promise<ProposalStats> {
  const db = getDb();
  const [viewAgg] = await db
    .select({
      total: count(),
      first: min(schema.proposalViews.createdAt),
      last: max(schema.proposalViews.createdAt),
      visitors: sql<number>`count(distinct ${schema.proposalViews.visitorId})`,
      mobile: sql<number>`sum(case when ${schema.proposalViews.device} = 'mobile' then 1 else 0 end)`,
      desktop: sql<number>`sum(case when ${schema.proposalViews.device} = 'desktop' then 1 else 0 end)`,
      tablet: sql<number>`sum(case when ${schema.proposalViews.device} = 'tablet' then 1 else 0 end)`,
    })
    .from(schema.proposalViews)
    .where(eq(schema.proposalViews.proposalId, proposalId));

  const [questions] = await db
    .select({ value: count() })
    .from(schema.proposalQuestions)
    .where(eq(schema.proposalQuestions.proposalId, proposalId));

  const [changes] = await db
    .select({ value: count() })
    .from(schema.proposalChangeRequests)
    .where(eq(schema.proposalChangeRequests.proposalId, proposalId));

  const [acceptance] = await db
    .select({ value: count() })
    .from(schema.proposalAcceptances)
    .where(eq(schema.proposalAcceptances.proposalId, proposalId));

  const events = await db
    .select()
    .from(schema.proposalEvents)
    .where(
      and(
        eq(schema.proposalEvents.proposalId, proposalId),
        inArray(schema.proposalEvents.type, [
          "deposit_started",
          "option_selected",
        ]),
      ),
    );

  const selectedOptions = new Set<string>();
  let depositStarted = false;
  for (const event of events) {
    if (event.type === "deposit_started") depositStarted = true;
    if (event.type === "option_selected" && event.data) {
      try {
        const data = JSON.parse(String(event.data)) as { name?: string };
        if (data.name) selectedOptions.add(data.name);
      } catch {
        // donnée illisible : ignorer
      }
    }
  }

  return {
    totalViews: viewAgg?.total ?? 0,
    uniqueVisitors: Number(viewAgg?.visitors ?? 0),
    firstViewAt: viewAgg?.first ?? null,
    lastViewAt: viewAgg?.last ?? null,
    mobileViews: Number(viewAgg?.mobile ?? 0),
    desktopViews: Number(viewAgg?.desktop ?? 0),
    tabletViews: Number(viewAgg?.tablet ?? 0),
    questions: questions?.value ?? 0,
    changeRequests: changes?.value ?? 0,
    accepted: (acceptance?.value ?? 0) > 0,
    depositStarted,
    selectedOptions: [...selectedOptions],
  };
}

export interface DashboardStats {
  activeProposals: number;
  viewedProposals: number;
  requests: number;
  acceptances: number;
  acceptedAmountCents: number;
  needsAction: { id: string; title: string; reason: string }[];
  recentEvents: {
    id: string;
    proposalId: string;
    proposalTitle: string;
    type: string;
    createdAt: Date;
  }[];
}

export async function getDashboardStats(
  organizationId: string,
): Promise<DashboardStats> {
  const db = getDb();
  const proposals = await db
    .select()
    .from(schema.proposals)
    .where(
      and(
        eq(schema.proposals.organizationId, organizationId),
        isNull(schema.proposals.deletedAt),
      ),
    );

  const ids = proposals.map((p) => p.id);
  const active = proposals.filter(
    (p) => p.status === "published" && !p.archivedAt,
  );

  let viewedProposals = 0;
  let requests = 0;
  let recentEvents: DashboardStats["recentEvents"] = [];
  const needsAction: DashboardStats["needsAction"] = [];

  if (ids.length > 0) {
    const viewed = await db
      .select({
        proposalId: schema.proposalViews.proposalId,
      })
      .from(schema.proposalViews)
      .where(inArray(schema.proposalViews.proposalId, ids))
      .groupBy(schema.proposalViews.proposalId);
    viewedProposals = viewed.length;

    const [questionCount] = await db
      .select({ value: count() })
      .from(schema.proposalQuestions)
      .where(inArray(schema.proposalQuestions.proposalId, ids));
    const [changeCount] = await db
      .select({ value: count() })
      .from(schema.proposalChangeRequests)
      .where(inArray(schema.proposalChangeRequests.proposalId, ids));
    requests = (questionCount?.value ?? 0) + (changeCount?.value ?? 0);

    const events = await db
      .select()
      .from(schema.proposalEvents)
      .where(inArray(schema.proposalEvents.proposalId, ids))
      .orderBy(desc(schema.proposalEvents.createdAt))
      .limit(12);
    const titleById = new Map(proposals.map((p) => [p.id, p.title]));
    recentEvents = events.map((e) => ({
      id: e.id,
      proposalId: e.proposalId,
      proposalTitle: titleById.get(e.proposalId) ?? "Proposition",
      type: e.type,
      createdAt: e.createdAt,
    }));

    // Propositions nécessitant une action : questions/demandes ouvertes.
    const openQuestions = await db
      .select()
      .from(schema.proposalQuestions)
      .where(
        and(
          inArray(schema.proposalQuestions.proposalId, ids),
          isNull(schema.proposalQuestions.answeredAt),
        ),
      );
    const openChanges = await db
      .select()
      .from(schema.proposalChangeRequests)
      .where(
        and(
          inArray(schema.proposalChangeRequests.proposalId, ids),
          eq(schema.proposalChangeRequests.status, "open"),
        ),
      );
    const flagged = new Map<string, string>();
    for (const q of openQuestions) {
      flagged.set(q.proposalId, "Question sans réponse");
    }
    for (const c of openChanges) {
      flagged.set(c.proposalId, "Demande de modification ouverte");
    }
    for (const [proposalId, reason] of flagged) {
      needsAction.push({
        id: proposalId,
        title: titleById.get(proposalId) ?? "Proposition",
        reason,
      });
    }
  }

  const won = proposals.filter((p) => p.outcome === "won");
  let acceptedAmountCents = 0;
  if (won.length > 0) {
    const acceptances = await db
      .select()
      .from(schema.proposalAcceptances)
      .where(
        inArray(
          schema.proposalAcceptances.proposalId,
          won.map((p) => p.id),
        ),
      );
    acceptedAmountCents = acceptances.reduce((s, a) => s + a.totalCents, 0);
  }

  return {
    activeProposals: active.length,
    viewedProposals,
    requests,
    acceptances: won.length,
    acceptedAmountCents,
    needsAction,
    recentEvents,
  };
}
