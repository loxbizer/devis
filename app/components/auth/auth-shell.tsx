import { Link } from "react-router";

/** Gabarit commun des pages d'authentification. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-night-950 px-4 py-10">
      <Link
        to="/"
        className="mb-8 text-2xl font-bold tracking-tight text-white"
        aria-label="DevisRoom — retour à l'accueil"
      >
        Devis<span className="text-brand-400">Room</span>
      </Link>
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
      {footer && <div className="mt-6 text-sm text-slate-400">{footer}</div>}
    </main>
  );
}
