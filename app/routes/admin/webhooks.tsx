import { desc } from "drizzle-orm";
import { Badge } from "~/components/ui/primitives";
import { formatDateTime } from "~/lib/format";
import { requireAdmin } from "~/server/auth/session.server";
import { getDb, schema } from "~/server/db.server";
import type { Route } from "./+types/webhooks";

export const meta: Route.MetaFunction = () => [
  { title: "Webhooks Stripe — Administration DevisRoom" },
  { name: "robots", content: "noindex" },
];

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  const db = getDb();
  const events = await db
    .select()
    .from(schema.stripeWebhookEvents)
    .orderBy(desc(schema.stripeWebhookEvents.createdAt))
    .limit(100);
  return { events };
}

export default function AdminWebhooks({ loaderData }: Route.ComponentProps) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">
        Webhooks Stripe reçus
      </h1>
      {loaderData.events.length === 0 ? (
        <p className="text-sm text-slate-500">
          Aucun webhook reçu. Vérifiez la configuration de l'endpoint
          /api/stripe/webhook dans le dashboard Stripe.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs text-slate-500 uppercase">
              <tr>
                <th scope="col" className="px-4 py-3">
                  ID
                </th>
                <th scope="col" className="px-4 py-3">
                  Type
                </th>
                <th scope="col" className="px-4 py-3">
                  Reçu le
                </th>
                <th scope="col" className="px-4 py-3">
                  Statut
                </th>
              </tr>
            </thead>
            <tbody>
              {loaderData.events.map((event) => (
                <tr key={event.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-mono text-xs">{event.id}</td>
                  <td className="px-4 py-3">{event.type}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {formatDateTime(event.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    {event.error ? (
                      <Badge tone="red">
                        Erreur : {event.error.slice(0, 60)}
                      </Badge>
                    ) : event.processedAt ? (
                      <Badge tone="green">Traité</Badge>
                    ) : (
                      <Badge tone="amber">Reçu</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
