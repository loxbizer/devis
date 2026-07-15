import { desc, eq } from "drizzle-orm";
import { useFetcher, useRouteLoaderData } from "react-router";
import { Badge, Button } from "~/components/ui/primitives";
import { formatDateTime } from "~/lib/format";
import { requireAdmin, verifyCsrf } from "~/server/auth/session.server";
import { getDb, schema } from "~/server/db.server";
import { audit } from "~/server/services/audit.server";
import type { Route } from "./+types/utilisateurs";

export const meta: Route.MetaFunction = () => [
  { title: "Utilisateurs — Administration DevisRoom" },
  { name: "robots", content: "noindex" },
];

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  const db = getDb();
  const users = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      role: schema.users.role,
      suspendedAt: schema.users.suspendedAt,
      createdAt: schema.users.createdAt,
    })
    .from(schema.users)
    .orderBy(desc(schema.users.createdAt))
    .limit(200);
  return { users };
}

export async function action({ request }: Route.ActionArgs) {
  const session = await requireAdmin(request);
  const formData = await request.formData();
  await verifyCsrf(request, session, formData);
  const userId = String(formData.get("userId") ?? "");
  if (userId === session.user.id) {
    return { ok: false, error: "Impossible de suspendre votre propre compte." };
  }
  const db = getDb();
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  if (!user) return { ok: false, error: "Utilisateur introuvable." };
  await db
    .update(schema.users)
    .set({ suspendedAt: user.suspendedAt ? null : new Date() })
    .where(eq(schema.users.id, userId));
  if (!user.suspendedAt) {
    // Sécurité : invalider toutes les sessions du compte suspendu.
    await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
  }
  await audit({
    userId: session.user.id,
    action: user.suspendedAt ? "admin.user.unsuspend" : "admin.user.suspend",
    targetType: "user",
    targetId: userId,
  });
  return { ok: true };
}

export default function AdminUtilisateurs({
  loaderData,
}: Route.ComponentProps) {
  const layoutData = useRouteLoaderData<{ csrf: string }>(
    "routes/admin/layout",
  );
  const csrf = layoutData?.csrf ?? "";
  const fetcher = useFetcher();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Utilisateurs</h1>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs text-slate-500 uppercase">
            <tr>
              <th scope="col" className="px-4 py-3">
                Nom
              </th>
              <th scope="col" className="px-4 py-3">
                E-mail
              </th>
              <th scope="col" className="px-4 py-3">
                Rôle
              </th>
              <th scope="col" className="px-4 py-3">
                Inscrit le
              </th>
              <th scope="col" className="px-4 py-3">
                Statut
              </th>
              <th scope="col" className="px-4 py-3">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {loaderData.users.map((user) => (
              <tr key={user.id} className="border-b border-slate-100">
                <td className="px-4 py-3 font-medium">{user.name}</td>
                <td className="px-4 py-3">{user.email}</td>
                <td className="px-4 py-3">
                  {user.role === "admin" ? (
                    <Badge tone="violet">Admin</Badge>
                  ) : (
                    <Badge>Utilisateur</Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {formatDateTime(user.createdAt)}
                </td>
                <td className="px-4 py-3">
                  {user.suspendedAt ? (
                    <Badge tone="red">Suspendu</Badge>
                  ) : (
                    <Badge tone="green">Actif</Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <fetcher.Form method="post">
                    <input type="hidden" name="_csrf" value={csrf} />
                    <input type="hidden" name="userId" value={user.id} />
                    <Button
                      type="submit"
                      size="sm"
                      variant={user.suspendedAt ? "outline" : "danger"}
                    >
                      {user.suspendedAt ? "Réactiver" : "Suspendre"}
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
