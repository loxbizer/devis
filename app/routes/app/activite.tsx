import { desc, eq, inArray, isNull, and } from "drizzle-orm";
import { ActivityTimeline } from "~/components/ui/cards";
import { EmptyState } from "~/components/ui/states";
import { getDb, schema } from "~/server/db.server";
import { requireOrg } from "~/server/services/org.server";
import type { Route } from "./+types/activite";

export const meta: Route.MetaFunction = () => [
  { title: "Activité — DevisRoom" },
  { name: "robots", content: "noindex" },
];

export async function loader({ request }: Route.LoaderArgs) {
  const ctx = await requireOrg(request);
  const db = getDb();
  const proposals = await db
    .select({ id: schema.proposals.id, title: schema.proposals.title })
    .from(schema.proposals)
    .where(
      and(
        eq(schema.proposals.organizationId, ctx.organization.id),
        isNull(schema.proposals.deletedAt),
      ),
    );
  const titleById = new Map(proposals.map((p) => [p.id, p.title]));
  const events =
    proposals.length === 0
      ? []
      : await db
          .select()
          .from(schema.proposalEvents)
          .where(
            inArray(
              schema.proposalEvents.proposalId,
              proposals.map((p) => p.id),
            ),
          )
          .orderBy(desc(schema.proposalEvents.createdAt))
          .limit(100);

  return {
    events: events.map((event) => ({
      id: event.id,
      type: event.type,
      detail: titleById.get(event.proposalId) ?? "Proposition",
      createdAt: event.createdAt,
      linkTo: `/app/devis/${event.proposalId}`,
    })),
  };
}

export default function Activite({ loaderData }: Route.ComponentProps) {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Activité</h1>
        <p className="mt-1 text-sm text-slate-500">
          L'historique complet des événements sur l'ensemble de vos devis.
        </p>
      </div>
      {loaderData.events.length === 0 ? (
        <EmptyState
          title="Aucune activité pour le moment"
          description="Publiez une DevisRoom et envoyez le lien à votre client pour voir apparaître les premiers événements."
        />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <ActivityTimeline items={loaderData.events} />
        </div>
      )}
    </div>
  );
}
