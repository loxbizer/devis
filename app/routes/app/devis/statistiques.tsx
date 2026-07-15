import { desc, eq } from "drizzle-orm";
import { Link } from "react-router";
import { ActivityTimeline, StatCard } from "~/components/ui/cards";
import { Alert } from "~/components/ui/primitives";
import { formatDateTime } from "~/lib/format";
import { getDb, schema } from "~/server/db.server";
import { getProposalForOrg } from "~/server/services/proposals.server";
import { requireOrg } from "~/server/services/org.server";
import { getProposalStats } from "~/server/services/stats.server";
import type { Route } from "./+types/statistiques";

export const meta: Route.MetaFunction = () => [
  { title: "Statistiques du devis — DevisRoom" },
  { name: "robots", content: "noindex" },
];

export async function loader({ request, params }: Route.LoaderArgs) {
  const ctx = await requireOrg(request);
  const proposal = await getProposalForOrg(params.id, ctx.organization.id);
  if (!proposal) throw new Response("Devis introuvable", { status: 404 });

  const statsLevel = ctx.plan.limits.stats;
  const stats = await getProposalStats(proposal.id);
  const db = getDb();
  const events =
    statsLevel === "views"
      ? []
      : await db
          .select()
          .from(schema.proposalEvents)
          .where(eq(schema.proposalEvents.proposalId, proposal.id))
          .orderBy(desc(schema.proposalEvents.createdAt))
          .limit(50);

  return {
    proposal: { id: proposal.id, title: proposal.title },
    stats,
    statsLevel,
    events: events.map((event) => ({
      id: event.id,
      type: event.type,
      createdAt: event.createdAt,
      detail: parseEventDetail(event.data),
    })),
  };
}

function parseEventDetail(data: unknown): string | undefined {
  if (!data) return undefined;
  try {
    const parsed = JSON.parse(String(data)) as Record<string, unknown>;
    if (typeof parsed.name === "string") return parsed.name;
    if (typeof parsed.packageName === "string") return parsed.packageName;
    if (typeof parsed.device === "string") {
      return parsed.device === "mobile"
        ? "Sur mobile"
        : parsed.device === "desktop"
          ? "Sur ordinateur"
          : undefined;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export default function StatistiquesDevis({
  loaderData,
}: Route.ComponentProps) {
  const { stats, statsLevel } = loaderData;
  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-sm text-slate-500">
          <Link
            to={`/app/devis/${loaderData.proposal.id}`}
            className="underline"
          >
            {loaderData.proposal.title}
          </Link>
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Statistiques</h1>
        <p className="mt-1 text-sm text-slate-500">
          Des chiffres simples et honnêtes : nombre de consultations réelles,
          sans techniques de suivi invasives.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Consultations" value={stats.totalViews} />
        <StatCard label="Visiteurs distincts" value={stats.uniqueVisitors} />
        <StatCard
          label="Première consultation"
          value={stats.firstViewAt ? formatDateTime(stats.firstViewAt) : "—"}
        />
        <StatCard
          label="Dernière consultation"
          value={stats.lastViewAt ? formatDateTime(stats.lastViewAt) : "—"}
        />
      </div>

      {statsLevel !== "views" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Appareils"
              value={`${stats.mobileViews} mobile · ${stats.desktopViews} ordinateur`}
              detail={
                stats.tabletViews > 0
                  ? `${stats.tabletViews} tablette`
                  : undefined
              }
            />
            <StatCard label="Questions posées" value={stats.questions} />
            <StatCard
              label="Demandes de modification"
              value={stats.changeRequests}
            />
            <StatCard
              label="Acceptée"
              value={stats.accepted ? "Oui" : "Pas encore"}
              detail={stats.depositStarted ? "Acompte déclenché" : undefined}
            />
          </div>

          {stats.selectedOptions.length > 0 && (
            <section aria-labelledby="options-stats-titre">
              <h2 id="options-stats-titre" className="text-lg font-semibold">
                Options explorées par le client
              </h2>
              <ul className="mt-2 flex flex-wrap gap-2">
                {stats.selectedOptions.map((name) => (
                  <li
                    key={name}
                    className="rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-800"
                  >
                    {name}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="historique-titre">
            <h2 id="historique-titre" className="text-lg font-semibold">
              Historique
            </h2>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6">
              <ActivityTimeline items={loaderData.events} />
            </div>
          </section>
        </>
      ) : (
        <Alert tone="info" title="Statistiques limitées">
          Le plan Gratuit affiche uniquement les consultations. Passez au plan
          Solo ou Pro pour l'historique détaillé (formules comparées, options
          explorées, appareils).{" "}
          <Link to="/app/abonnement" className="font-medium underline">
            Voir les plans
          </Link>
        </Alert>
      )}
    </div>
  );
}
