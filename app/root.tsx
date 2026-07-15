import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";

export const meta: Route.MetaFunction = () => [
  { title: "DevisRoom — Transformez vos devis PDF en pages claires" },
  {
    name: "description",
    content:
      "Importez votre devis PDF, personnalisez sa présentation et envoyez un lien privé que votre client peut comprendre, commenter et accepter.",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0b1220" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let title = "Une erreur est survenue";
  let details =
    "Une erreur inattendue s'est produite. Merci de réessayer dans quelques instants.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      title = "Page introuvable";
      details =
        "La page demandée n'existe pas ou n'est plus disponible. Vérifiez le lien qui vous a été transmis.";
    } else {
      title = `Erreur ${error.status}`;
      details =
        typeof error.data === "string" && error.data.length > 0
          ? error.data
          : error.statusText || details;
    }
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-center text-slate-100">
      <p className="text-sm font-medium tracking-widest text-sky-400 uppercase">
        DevisRoom
      </p>
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="max-w-md text-slate-300">{details}</p>
      <Link
        to="/"
        className="mt-2 rounded-lg bg-sky-500 px-5 py-2.5 font-medium text-white transition hover:bg-sky-400"
      >
        Retour à l'accueil
      </Link>
      {stack && (
        <pre className="mt-6 max-w-full overflow-x-auto rounded-lg bg-slate-900 p-4 text-left text-xs text-slate-400">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
