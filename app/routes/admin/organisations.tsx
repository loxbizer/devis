import { desc, eq } from "drizzle-orm";
import { useFetcher, useRouteLoaderData } from "react-router";
import { Badge, Button } from "~/components/ui/primitives";
import { formatDateTime } from "~/lib/format";
import { PLANS, type PlanId } from "~/lib/plans";
import { requireAdmin, verifyCsrf } from "~/server/auth/session.server";
import { getDb, schema } from "~/server/db.server";
import { audit } from "~/server/services/audit.server";
import type { Route } from "./+types/organisations";

export const meta: Route.MetaFunction = () => [
  { title: "Organisations — Administration DevisRoom" },
  { name: "robots", content: "noindex" },
];

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  const db = getDb();
  const rows = await db
    .select({
      organization: schema.organizations,
      subscription: schema.subscriptions,
    })
    .from(schema.organizations)
    .leftJoin(
      schema.subscriptions,
      eq(schema.subscriptions.organizationId, schema.organizations.id),
    )
    .orderBy(desc(schema.organizations.createdAt))
    .limit(200);
  return { rows };
}

export async function action({ request }: Route.ActionArgs) {
  const session = await requireAdmin(request);
  const formData = await request.formData();
  await verifyCsrf(request, session, formData);
  const intent = String(formData.get("intent") ?? "");
  const organizationId = String(formData.get("organizationId") ?? "");
  const db = getDb();

  if (intent === "toggle_suspend") {
    const [org] = await db
      .select()
      .from(schema.organizations)
      .where(eq(schema.organizations.id, organizationId))
      .limit(1);
    if (!org) return { ok: false, error: "Organisation introuvable." };
    await db
      .update(schema.organizations)
      .set({ suspendedAt: org.suspendedAt ? null : new Date() })
      .where(eq(schema.organizations.id, organizationId));
    await audit({
      userId: session.user.id,
      organizationId,
      action: org.suspendedAt ? "admin.org.unsuspend" : "admin.org.suspend",
    });
    return { ok: true };
  }

  if (intent === "set_plan") {
    const plan = String(formData.get("plan") ?? "") as PlanId;
    if (!(plan in PLANS)) return { ok: false, error: "Plan inconnu." };
    await db
      .update(schema.subscriptions)
      .set({ plan, updatedAt: new Date() })
      .where(eq(schema.subscriptions.organizationId, organizationId));
    await audit({
      userId: session.user.id,
      organizationId,
      action: "admin.subscription.set_plan",
      data: { plan },
    });
    return { ok: true };
  }

  return { ok: false, error: "Action inconnue." };
}

export default function AdminOrganisations({
  loaderData,
}: Route.ComponentProps) {
  const layoutData = useRouteLoaderData<{ csrf: string }>(
    "routes/admin/layout",
  );
  const csrf = layoutData?.csrf ?? "";
  const fetcher = useFetcher();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Organisations</h1>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs text-slate-500 uppercase">
            <tr>
              <th scope="col" className="px-4 py-3">
                Nom
              </th>
              <th scope="col" className="px-4 py-3">
                Plan
              </th>
              <th scope="col" className="px-4 py-3">
                Statut
              </th>
              <th scope="col" className="px-4 py-3">
                Créée le
              </th>
              <th scope="col" className="px-4 py-3">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loaderData.rows.map(({ organization, subscription }) => (
              <tr key={organization.id} className="border-b border-slate-100">
                <td className="px-4 py-3 font-medium">{organization.name}</td>
                <td className="px-4 py-3">
                  <fetcher.Form
                    method="post"
                    className="flex items-center gap-2"
                  >
                    <input type="hidden" name="_csrf" value={csrf} />
                    <input type="hidden" name="intent" value="set_plan" />
                    <input
                      type="hidden"
                      name="organizationId"
                      value={organization.id}
                    />
                    <label
                      className="sr-only"
                      htmlFor={`plan-${organization.id}`}
                    >
                      Plan de {organization.name}
                    </label>
                    <select
                      id={`plan-${organization.id}`}
                      name="plan"
                      defaultValue={subscription?.plan ?? "free"}
                      className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                    >
                      {Object.values(PLANS).map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name}
                        </option>
                      ))}
                    </select>
                    <Button type="submit" size="sm" variant="outline">
                      OK
                    </Button>
                  </fetcher.Form>
                </td>
                <td className="px-4 py-3">
                  {organization.suspendedAt ? (
                    <Badge tone="red">Suspendue</Badge>
                  ) : (
                    <Badge tone="green">Active</Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {formatDateTime(organization.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <fetcher.Form method="post">
                    <input type="hidden" name="_csrf" value={csrf} />
                    <input type="hidden" name="intent" value="toggle_suspend" />
                    <input
                      type="hidden"
                      name="organizationId"
                      value={organization.id}
                    />
                    <Button
                      type="submit"
                      size="sm"
                      variant={organization.suspendedAt ? "outline" : "danger"}
                    >
                      {organization.suspendedAt ? "Réactiver" : "Suspendre"}
                    </Button>
                  </fetcher.Form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
