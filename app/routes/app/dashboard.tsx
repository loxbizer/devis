import { Link } from "react-router";
import { ActivityTimeline, StatCard } from "~/components/ui/cards";
import { EmptyState } from "~/components/ui/states";
import { formatBytes, formatEuros } from "~/lib/format";
import { requireOrg } from "~/server/services/org.server";
import { getDashboardStats } from "~/server/services/stats.server";
import { getQuotaUsage } from "~/server/services/quotas.server";
import { getDb } from "~/server/db.server";
import type { Route } from "./+types/dashboard";

export const meta: Route.MetaFunction = () => [
  { title: "Tableau de bord — DevisRoom" },
  { name: "robots", content: "noindex" },
];

export async function loader({ request }: Route.LoaderArgs) {
  const ctx = await requireOrg(request);
  const [stats, quotas] = await Promise.all([
    getDashboardStats(ctx.organization.id),
    getQuotaUsage(getDb(), ctx.organization.id, ctx.plan.id),
  ]);
  return { stats, quotas, firstName: ctx.session.user.name.split(" ")[0] };
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const { stats, quotas } = loaderData;
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Bonjour {loaderData.firstName}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {quotas.activeProposals}/{quotas.limits.maxActiveProposals}{" "}
            DevisRooms actives · {formatBytes(quotas.storageBytes)} /{" "}
            {formatBytes(quotas.limits.maxStorageBytes)} utilisés
          </p>
        </div>
        <Link
          to="/app/devis/nouveau"
          className="rounded-(--radius-button) bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
        >
          Nouvelle DevisRoom
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Devis actifs" value={stats.activeProposals} />
        <StatCard label="Devis consultés" value={stats.viewedProposals} />
        <StatCard label="Demandes reçues" value={stats.requests} />
        <StatCard label="Acceptations" value={stats.acceptances} />
        <StatCard
          label="Montant accepté"
          value={formatEuros(stats.acceptedAmountCents)}
        />
      </div>

      {stats.needsAction.length > 0 && (
        <section aria-labelledby="actions-titre">
          <h2 id="actions-titre" className="text-lg font-semibold">
            Devis nécessitant une action
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {stats.needsAction.map((item) => (
              <li key={item.id}>
                <Link
                  to={`/app/devis/${item.id}`}
                  className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm transition hover:border-amber-300"
                >
                  <span className="font-medium text-slate-800">
                    {item.title}
                  </span>
                  <span className="text-amber-700">{item.reason}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="evenements-titre">
        <h2 id="evenements-titre" className="text-lg font-semibold">
          Derniers événements
        </h2>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6">
          {stats.recentEvents.length === 0 ? (
            <EmptyState
              title="Aucun événement pour le moment"
              description="Créez votre première DevisRoom et envoyez le lien à votre client : chaque consultation, question et acceptation apparaîtra ici."
              action={
                <Link
                  to="/app/devis/nouveau"
                  className="rounded-(--radius-button) bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
                >
                  Créer ma première DevisRoom
                </Link>
              }
            />
          ) : (
            <ActivityTimeline
              items={stats.recentEvents.map((event) => ({
                id: event.id,
                type: event.type,
                detail: event.proposalTitle,
                createdAt: event.createdAt,
                linkTo: `/app/devis/${event.proposalId}`,
              }))}
            />
          )}
        </div>
      </section>
    </div>
  );
}
