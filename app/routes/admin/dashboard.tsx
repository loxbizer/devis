import { count, desc, isNull, sum } from "drizzle-orm";
import { StatCard } from "~/components/ui/cards";
import { formatBytes, formatDateTime } from "~/lib/format";
import { requireAdmin } from "~/server/auth/session.server";
import { getDb, schema } from "~/server/db.server";
import type { Route } from "./+types/dashboard";

export const meta: Route.MetaFunction = () => [
  { title: "Administration — DevisRoom" },
  { name: "robots", content: "noindex" },
];

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  const db = getDb();
  const [users] = await db.select({ value: count() }).from(schema.users);
  const [organizations] = await db
    .select({ value: count() })
    .from(schema.organizations);
  const [proposals] = await db
    .select({ value: count() })
    .from(schema.proposals)
    .where(isNull(schema.proposals.deletedAt));
  const [storage] = await db
    .select({ value: sum(schema.proposalAssets.sizeBytes) })
    .from(schema.proposalAssets)
    .where(isNull(schema.proposalAssets.deletedAt));
  const subscriptions = await db
    .select({ plan: schema.subscriptions.plan, value: count() })
    .from(schema.subscriptions)
    .groupBy(schema.subscriptions.plan);
  const recentErrors = await db
    .select()
    .from(schema.stripeWebhookEvents)
    .orderBy(desc(schema.stripeWebhookEvents.createdAt))
    .limit(5);

  return {
    users: users?.value ?? 0,
    organizations: organizations?.value ?? 0,
    proposals: proposals?.value ?? 0,
    storageBytes: Number(storage?.value ?? 0),
    subscriptions,
    recentErrors: recentErrors
      .filter((event) => event.error)
      .map((event) => ({
        id: event.id,
        type: event.type,
        error: event.error,
        createdAt: event.createdAt,
      })),
  };
}

export default function AdminDashboard({ loaderData }: Route.ComponentProps) {
  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold tracking-tight">Vue d'ensemble</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Utilisateurs" value={loaderData.users} />
        <StatCard label="Organisations" value={loaderData.organizations} />
        <StatCard label="Propositions" value={loaderData.proposals} />
        <StatCard
          label="Stockage utilisé"
          value={formatBytes(loaderData.storageBytes)}
        />
      </div>
      <section aria-labelledby="abonnements-admin-titre">
        <h2 id="abonnements-admin-titre" className="text-lg font-semibold">
          Abonnements par plan
        </h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-4">
          {loaderData.subscriptions.map((row) => (
            <StatCard
              key={row.plan}
              label={`Plan ${row.plan}`}
              value={row.value}
            />
          ))}
          {loaderData.subscriptions.length === 0 && (
            <p className="text-sm text-slate-500">Aucun abonnement.</p>
          )}
        </div>
      </section>
      <section aria-labelledby="erreurs-admin-titre">
        <h2 id="erreurs-admin-titre" className="text-lg font-semibold">
          Erreurs récentes (webhooks)
        </h2>
        {loaderData.recentErrors.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            Aucune erreur enregistrée.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {loaderData.recentErrors.map((event) => (
              <li
                key={event.id}
                className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm"
              >
                <p className="font-medium text-red-900">
                  {event.type} — {formatDateTime(event.createdAt)}
                </p>
                <p className="mt-1 text-red-700">{event.error}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
