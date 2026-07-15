import { Form, Link, NavLink, Outlet, useRouteLoaderData } from "react-router";
import { ToastProvider } from "~/components/ui/overlays";
import { cx } from "~/components/ui/primitives";
import { requireOrg } from "~/server/services/org.server";
import { getUnreadCount } from "~/server/services/notifications.server";
import { getRewardBalance } from "~/server/services/rewards.server";
import { isStripeConfigured, isProduction } from "~/server/env.server";
import type { Route } from "./+types/layout";

export async function loader({ request }: Route.LoaderArgs) {
  const ctx = await requireOrg(request);
  const [unread, rewards] = await Promise.all([
    getUnreadCount(ctx.organization.id),
    getRewardBalance(ctx.organization.id),
  ]);
  return {
    user: ctx.session.user,
    csrf: ctx.session.csrfToken,
    organizationName: ctx.organization.name,
    plan: ctx.plan.id,
    planName: ctx.plan.name,
    unread,
    points: rewards.balance,
    demoMode: !isProduction() && !isStripeConfigured(),
  };
}

/** Récupère le contexte du layout depuis n'importe quelle page enfant. */
export function useAppContext() {
  const data = useRouteLoaderData<typeof loader>("routes/app/layout");
  if (!data) throw new Error("Contexte applicatif indisponible.");
  return data;
}

/** Icônes de navigation (traits fins Heroicons, décoratives). */
function NavIcon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    home: "m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75",
    doc: "M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z",
    pulse: "M3.75 12h4.5l2.25-6 3 12 2.25-6h4.5",
    gift: "M21 11.25v8.25a1.5 1.5 0 0 1-1.5 1.5H4.5a1.5 1.5 0 0 1-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1 0 9.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1 1 14.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z",
    building:
      "M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21",
    card: "M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z",
    cog: "M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  };
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="size-[18px] shrink-0"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={paths[name]} />
    </svg>
  );
}

const NAV_ITEMS = [
  { to: "/app", label: "Accueil", icon: "home", end: true },
  { to: "/app/devis", label: "Mes devis", icon: "doc" },
  { to: "/app/activite", label: "Activité", icon: "pulse" },
  { to: "/app/recompenses", label: "Récompenses", icon: "gift" },
  { to: "/app/entreprise", label: "Entreprise", icon: "building" },
  { to: "/app/abonnement", label: "Abonnement", icon: "card" },
  { to: "/app/parametres", label: "Paramètres", icon: "cog" },
];

export default function AppLayout({ loaderData }: Route.ComponentProps) {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#f6f8fb]">
        {loaderData.demoMode && (
          <p
            role="status"
            className="bg-violet-600 px-4 py-1.5 text-center text-xs font-medium text-white"
          >
            Mode démonstration locale — Stripe non configuré, les paiements sont
            simulés. Voir README pour la configuration complète.
          </p>
        )}
        <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur">
          <div className="mx-auto flex h-15 max-w-6xl items-center justify-between gap-4 px-4">
            <div className="flex items-center gap-6">
              <Link to="/app" className="text-lg font-bold tracking-tight">
                Devis<span className="text-brand-600">Room</span>
              </Link>
              <nav
                aria-label="Navigation principale"
                className="hidden items-center gap-0.5 lg:flex"
              >
                {NAV_ITEMS.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cx(
                        "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition",
                        isActive
                          ? "bg-brand-600 text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                      )
                    }
                  >
                    <NavIcon name={item.icon} />
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-1.5">
              <Link
                to="/app/recompenses"
                className="hidden items-center gap-1 rounded-full bg-gradient-to-r from-brand-50 to-violet-50 px-3 py-1.5 text-xs font-semibold text-brand-700 ring-1 ring-brand-100 transition hover:ring-brand-300 sm:inline-flex"
                aria-label={`${loaderData.points} points de récompense`}
              >
                <span aria-hidden="true">✦</span>
                {loaderData.points.toLocaleString("fr-FR")} pts
              </Link>
              <Link
                to="/app/notifications"
                className="relative rounded-full p-2 text-slate-600 hover:bg-slate-100"
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
                  className="rounded-full px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
                >
                  Admin
                </Link>
              )}
              <Form method="post" action="/deconnexion">
                <button
                  type="submit"
                  className="rounded-full px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
                >
                  Déconnexion
                </button>
              </Form>
            </div>
          </div>
          {/* Navigation mobile / tablette */}
          <nav
            aria-label="Navigation mobile"
            className="flex gap-1 overflow-x-auto border-t border-slate-100 px-2 py-1.5 lg:hidden"
          >
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cx(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm whitespace-nowrap",
                    isActive
                      ? "bg-brand-600 font-medium text-white"
                      : "text-slate-600",
                  )
                }
              >
                <NavIcon name={item.icon} />
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
