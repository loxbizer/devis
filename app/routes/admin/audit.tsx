import { desc } from "drizzle-orm";
import { formatDateTime } from "~/lib/format";
import { requireAdmin } from "~/server/auth/session.server";
import { getDb, schema } from "~/server/db.server";
import type { Route } from "./+types/audit";

export const meta: Route.MetaFunction = () => [
  { title: "Journal d'audit — Administration DevisRoom" },
  { name: "robots", content: "noindex" },
];

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  const db = getDb();
  const logs = await db
    .select()
    .from(schema.auditLogs)
    .orderBy(desc(schema.auditLogs.createdAt))
    .limit(200);
  return { logs };
}

export default function AdminAudit({ loaderData }: Route.ComponentProps) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Journal d'audit</h1>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs text-slate-500 uppercase">
            <tr>
              <th scope="col" className="px-4 py-3">
                Date
              </th>
              <th scope="col" className="px-4 py-3">
                Action
              </th>
              <th scope="col" className="px-4 py-3">
                Utilisateur
              </th>
              <th scope="col" className="px-4 py-3">
                Cible
              </th>
              <th scope="col" className="px-4 py-3">
                IP
              </th>
            </tr>
          </thead>
          <tbody>
            {loaderData.logs.map((log) => (
              <tr key={log.id} className="border-b border-slate-100">
                <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                  {formatDateTime(log.createdAt)}
                </td>
                <td className="px-4 py-3 font-mono text-xs">{log.action}</td>
                <td className="px-4 py-3 font-mono text-xs">
                  {log.userId ?? "—"}
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  {log.targetType ? `${log.targetType}:${log.targetId}` : "—"}
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  {log.ipAddress ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loaderData.logs.length === 0 && (
          <p className="p-6 text-sm text-slate-500">Journal vide.</p>
        )}
      </div>
    </div>
  );
}
