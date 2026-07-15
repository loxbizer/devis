import { Form, Link, NavLink, Outlet, useRouteLoaderData } from "react-router";
import { ToastProvider } from "~/components/ui/overlays";
import { cx } from "~/components/ui/primitives";
import { requireOrg } from "~/server/services/org.server";
import { getUnreadCount } from "~/server/services/notifications.server";
import { isStripeConfigured, isProduction } from "~/server/env.server";
import type { Route } from "./+types/layout";

export async function loader({ request }: Route.LoaderArgs) {
  const ctx = await requireOrg(request);
  const unread = await getUnreadCount(ctx.organization.id);
  return {
    user: ctx.session.user,
    csrf: ctx.session.csrfToken,
    organizationName: ctx.organization.name,
    plan: ctx.plan.id,
    planName: ctx.plan.name,
    unread,
    demoMode: !isProduction() && !isStripeConfigured(),
  };
}

/** Récupère le contexte du layout depuis n'importe quelle page enfant. */
export function useAppContext() {
  const data = useRouteLoaderData<typeof loader>("routes/app/layout");
  if (!data) throw new Error("Contexte applicatif indisponible.");
  return data;
}

const NAV_ITEMS = [
  { to: "/app", label: "Tableau de bord", end: true },
  { to: "/app/devis", label: "Devis" },
  { to: "/app/activite", label: "Activité" },
  { to: "/app/entreprise", label: "Entreprise" },
  { to: "/app/abonnement", label: "Abonnement" },
  { to: "/app/parametres", label: "Paramètres" },
];

export default function AppLayout({ loaderData }: Route.ComponentProps) {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-100">
        {loaderData.demoMode && (
          <p
            role="status"
            className="bg-violet-600 px-4 py-1.5 text-center text-xs font-medium text-white"
          >
            Mode démonstration locale — Stripe non configuré, les paiements sont
            simulés. Voir README pour la configuration complète.
          </p>
        )}
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
            <div className="flex items-center gap-6">
              <Link to="/app" className="text-lg font-bold tracking-tight">
                Devis<span className="text-brand-600">Room</span>
              </Link>
              <nav
                aria-label="Navigation principale"
                className="hidden items-center gap-1 md:flex"
              >
                {NAV_ITEMS.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cx(
                        "rounded-lg px-3 py-1.5 text-sm font-medium transition",
                        isActive
                          ? "bg-brand-50 text-brand-700"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 sm:inline">
                Plan {loaderData.planName}
              </span>
              <Link
                to="/app/notifications"
                className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                aria-label={`Notifications${loaderData.unread > 0 ? ` (${loaderData.unread} non lues)` : ""}`}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="size-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
                  />
                </svg>
                {loaderData.unread > 0 && (
                  <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {loaderData.unread > 9 ? "9+" : loaderData.unread}
                  </span>
                )}
              </Link>
              {loaderData.user.role === "admin" && (
                <Link
                  to="/admin"
                  className="rounded-lg px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
                >
                  Admin
                </Link>
              )}
              <Form method="post" action="/deconnexion">
                <button
                  type="submit"
                  className="rounded-lg px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
                >
                  Déconnexion
                </button>
              </Form>
            </div>
          </div>
          {/* Navigation mobile */}
          <nav
            aria-label="Navigation mobile"
            className="flex gap-1 overflow-x-auto border-t border-slate-100 px-2 py-1.5 md:hidden"
          >
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cx(
                    "rounded-lg px-3 py-1 text-sm whitespace-nowrap",
                    isActive
                      ? "bg-brand-50 font-medium text-brand-700"
                      : "text-slate-600",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">
          <Outlet />
        </main>
      </div>
    </ToastProvider>
  );
}
