import { Link, useSearchParams } from "react-router";
import { ProposalCard } from "~/components/ui/cards";
import { cx } from "~/components/ui/primitives";
import { EmptyState } from "~/components/ui/states";
import { requireOrg } from "~/server/services/org.server";
import { listProposalsForOrg } from "~/server/services/proposals.server";
import type { Route } from "./+types/liste";

export const meta: Route.MetaFunction = () => [
  { title: "Mes devis — DevisRoom" },
  { name: "robots", content: "noindex" },
];

export async function loader({ request }: Route.LoaderArgs) {
  const ctx = await requireOrg(request);
  const proposals = await listProposalsForOrg(ctx.organization.id);
  return { proposals };
}

const FILTERS = [
  { id: "tous", label: "Tous" },
  { id: "brouillons", label: "Brouillons" },
  { id: "attente", label: "En attente" },
  { id: "gagnes", label: "Gagnés" },
  { id: "perdus", label: "Perdus" },
  { id: "expires", label: "Expirés" },
  { id: "archives", label: "Archivés" },
] as const;

export default function ListeDevis({ loaderData }: Route.ComponentProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = searchParams.get("filtre") ?? "tous";

  const proposals = loaderData.proposals.filter((p) => {
    switch (filter) {
      case "brouillons":
        return p.status === "draft" && !p.archivedAt;
      case "attente":
        return (
          p.status === "published" && p.outcome === "pending" && !p.archivedAt
        );
      case "gagnes":
        return p.outcome === "won" && !p.archivedAt;
      case "perdus":
        return p.outcome === "lost" && !p.archivedAt;
      case "expires":
        return p.outcome === "expired" && !p.archivedAt;
      case "archives":
        return Boolean(p.archivedAt);
      default:
        return !p.archivedAt;
    }
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Mes devis</h1>
        <Link
          to="/app/devis/nouveau"
          className="rounded-(--radius-button) bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
        >
          Nouvelle DevisRoom
        </Link>
      </div>

      <div
        role="group"
        aria-label="Filtrer les devis"
        className="flex flex-wrap gap-1.5"
      >
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() =>
              setSearchParams(f.id === "tous" ? {} : { filtre: f.id })
            }
            className={cx(
              "rounded-full px-3.5 py-1.5 text-sm font-medium transition",
              filter === f.id
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:text-slate-900",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {proposals.length === 0 ? (
        <EmptyState
          title={
            filter === "tous"
              ? "Aucun devis pour le moment"
              : "Aucun devis dans cette catégorie"
          }
          description="Importez votre devis PDF et créez une page claire que votre client pourra consulter, commenter et accepter."
          action={
            <Link
              to="/app/devis/nouveau"
              className="rounded-(--radius-button) bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
            >
              Créer ma première DevisRoom
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {proposals.map((proposal) => (
            <li key={proposal.id}>
              <ProposalCard proposal={proposal} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
