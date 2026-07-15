import { Link, NavLink, Outlet } from "react-router";
import { cx } from "~/components/ui/primitives";
import { requireAdmin } from "~/server/auth/session.server";
import type { Route } from "./+types/layout";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await requireAdmin(request);
  return { csrf: session.csrfToken };
}

const NAV = [
  { to: "/admin", label: "Vue d'ensemble", end: true },
  { to: "/admin/organisations", label: "Organisations" },
  { to: "/admin/utilisateurs", label: "Utilisateurs" },
  { to: "/admin/webhooks", label: "Webhooks Stripe" },
  { to: "/admin/audit", label: "Audit" },
];

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-slate-900 text-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <span className="font-bold">DevisRoom · Administration</span>
            <nav
              aria-label="Navigation administration"
              className="flex gap-1 overflow-x-auto"
            >
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cx(
                      "rounded-lg px-3 py-1.5 text-sm whitespace-nowrap",
                      isActive
                        ? "bg-white/15 font-medium"
                        : "text-slate-300 hover:text-white",
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <Link to="/app" className="text-sm text-slate-300 hover:text-white">
            Retour à l'application
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
