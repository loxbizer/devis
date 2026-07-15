import { Link, NavLink, Outlet } from "react-router";
import { cx } from "~/components/ui/primitives";

const NAV = [
  { to: "/fonctionnalites", label: "Fonctionnalités" },
  { to: "/tarifs", label: "Tarifs" },
  { to: "/demonstration", label: "Démonstration" },
  { to: "/contact", label: "Contact" },
];

const SEO_LINKS = [
  { to: "/devis-interactif-artisan", label: "Devis interactif pour artisan" },
  {
    to: "/presentation-devis-renovation",
    label: "Présenter un devis de rénovation",
  },
  { to: "/suivi-ouverture-devis", label: "Suivi d'ouverture de devis" },
  { to: "/devis-en-ligne-couvreur", label: "Devis en ligne couvreur" },
  {
    to: "/devis-interactif-climatisation",
    label: "Devis interactif climatisation",
  },
  { to: "/devis-interactif-menuisier", label: "Devis interactif menuisier" },
  { to: "/comment-presenter-un-devis", label: "Comment présenter un devis" },
  { to: "/client-ne-repond-pas-au-devis", label: "Client qui ne répond pas" },
];

export default function MarketingLayout() {
  return (
    <div className="min-h-screen bg-night-950 text-slate-100">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:text-slate-900"
      >
        Aller au contenu
      </a>
      <header className="sticky top-0 z-40 border-b border-white/5 bg-night-950/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="text-xl font-bold tracking-tight">
            Devis<span className="text-brand-400">Room</span>
          </Link>
          <nav
            aria-label="Navigation principale"
            className="hidden items-center gap-1 md:flex"
          >
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cx(
                    "rounded-lg px-3 py-2 text-sm font-medium transition",
                    isActive ? "text-white" : "text-slate-400 hover:text-white",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to="/connexion"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:text-white"
            >
              Connexion
            </Link>
            <Link
              to="/inscription"
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-400"
            >
              Essai gratuit
            </Link>
          </div>
        </div>
      </header>
      <div id="contenu">
        <Outlet />
      </div>
      <footer className="border-t border-white/5 bg-night-900">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
          <div>
            <p className="text-lg font-bold">
              Devis<span className="text-brand-400">Room</span>
            </p>
            <p className="mt-3 text-sm text-slate-400">
              Transformez vos devis PDF en pages claires qui rassurent vos
              clients et facilitent leur décision.
            </p>
          </div>
          <nav aria-label="Produit">
            <p className="text-sm font-semibold text-white">Produit</p>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-slate-400">
              {NAV.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className="hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/inscription" className="hover:text-white">
                  Créer un compte
                </Link>
              </li>
            </ul>
          </nav>
          <nav aria-label="Guides">
            <p className="text-sm font-semibold text-white">Guides</p>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-slate-400">
              {SEO_LINKS.slice(0, 5).map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className="hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Informations légales">
            <p className="text-sm font-semibold text-white">Légal</p>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-slate-400">
              <li>
                <Link to="/mentions-legales" className="hover:text-white">
                  Mentions légales
                </Link>
              </li>
              <li>
                <Link to="/confidentialite" className="hover:text-white">
                  Confidentialité
                </Link>
              </li>
              <li>
                <Link to="/conditions-utilisation" className="hover:text-white">
                  Conditions d'utilisation
                </Link>
              </li>
              {SEO_LINKS.slice(5).map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className="hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="border-t border-white/5 py-5 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} DevisRoom. DevisRoom ne remplace pas un
          logiciel de facturation et ne fournit pas de signature électronique
          qualifiée.
        </div>
      </footer>
    </div>
  );
}
