import { Link, useFetcher } from "react-router";
import { useAppContext } from "./layout";
import { Button } from "~/components/ui/primitives";
import { EmptyState } from "~/components/ui/states";
import { formatDateTime } from "~/lib/format";
import { cx } from "~/components/ui/primitives";
import { verifyCsrf } from "~/server/auth/session.server";
import {
  listNotifications,
  markAllRead,
} from "~/server/services/notifications.server";
import { requireOrg } from "~/server/services/org.server";
import type { Route } from "./+types/notifications";

export const meta: Route.MetaFunction = () => [
  { title: "Notifications — DevisRoom" },
  { name: "robots", content: "noindex" },
];

export async function loader({ request }: Route.LoaderArgs) {
  const ctx = await requireOrg(request);
  const notifications = await listNotifications(ctx.organization.id);
  return { notifications };
}

export async function action({ request }: Route.ActionArgs) {
  const ctx = await requireOrg(request);
  const formData = await request.formData();
  await verifyCsrf(request, ctx.session, formData);
  await markAllRead(ctx.organization.id);
  return { ok: true };
}

export default function Notifications({ loaderData }: Route.ComponentProps) {
  const { csrf } = useAppContext();
  const fetcher = useFetcher();
  const hasUnread = loaderData.notifications.some((n) => !n.readAt);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        {hasUnread && (
          <fetcher.Form method="post">
            <input type="hidden" name="_csrf" value={csrf} />
            <Button type="submit" variant="outline" size="sm">
              Tout marquer comme lu
            </Button>
          </fetcher.Form>
        )}
      </div>

      {loaderData.notifications.length === 0 ? (
        <EmptyState
          title="Aucune notification"
          description="Les consultations, questions, demandes de modification et acceptations de vos clients apparaîtront ici."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {loaderData.notifications.map((notification) => (
            <li key={notification.id}>
              <Link
                to={notification.linkTo ?? "/app"}
                className={cx(
                  "block rounded-xl border p-4 transition hover:border-brand-300",
                  notification.readAt
                    ? "border-slate-200 bg-white"
                    : "border-brand-200 bg-brand-50",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-slate-900">
                    {notification.title}
                  </p>
                  {!notification.readAt && (
                    <span
                      className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-500"
                      aria-label="Non lue"
                    />
                  )}
                </div>
                {notification.body && (
                  <p className="mt-1 text-sm text-slate-600">
                    {notification.body}
                  </p>
                )}
                <p className="mt-1.5 text-xs text-slate-400">
                  {formatDateTime(notification.createdAt)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
