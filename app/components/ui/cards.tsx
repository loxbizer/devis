import { Link } from "react-router";
import { formatDateTime, formatEuros } from "~/lib/format";
import type { Plan } from "~/lib/plans";
import { Badge, cx } from "./primitives";

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------

export function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div className="rounded-(--radius-card) border border-slate-200 bg-white p-5 shadow-(--shadow-card)">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
      {detail && <p className="mt-1 text-xs text-slate-400">{detail}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProposalCard
// ---------------------------------------------------------------------------

export interface ProposalCardData {
  id: string;
  title: string;
  clientName: string;
  totalAmountCents: number;
  status: "draft" | "published";
  outcome: "pending" | "won" | "lost" | "expired";
  archivedAt: Date | null;
  updatedAt: Date;
}

export function proposalStatusBadge(p: {
  status: "draft" | "published";
  outcome: "pending" | "won" | "lost" | "expired";
  archivedAt: Date | null;
}) {
  if (p.archivedAt) return <Badge tone="neutral">Archivé</Badge>;
  if (p.outcome === "won") return <Badge tone="green">Gagné</Badge>;
  if (p.outcome === "lost") return <Badge tone="red">Perdu</Badge>;
  if (p.outcome === "expired") return <Badge tone="amber">Expiré</Badge>;
  if (p.status === "draft") return <Badge tone="neutral">Brouillon</Badge>;
  return <Badge tone="blue">En attente</Badge>;
}

export function ProposalCard({ proposal }: { proposal: ProposalCardData }) {
  return (
    <Link
      to={`/app/devis/${proposal.id}`}
      className="block rounded-(--radius-card) border border-slate-200 bg-white p-5 shadow-(--shadow-card) transition hover:border-brand-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-slate-900">
            {proposal.title}
          </h3>
          <p className="mt-0.5 truncate text-sm text-slate-500">
            {proposal.clientName}
          </p>
        </div>
        {proposalStatusBadge(proposal)}
      </div>
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="font-semibold text-slate-900">
          {formatEuros(proposal.totalAmountCents)}
        </span>
        <span className="text-xs text-slate-400">
          Modifié le {formatDateTime(proposal.updatedAt)}
        </span>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// PricingCard
// ---------------------------------------------------------------------------

export function PricingCard({
  plan,
  interval,
  action,
  dark = false,
}: {
  plan: Plan;
  interval: "monthly" | "yearly";
  action?: React.ReactNode;
  dark?: boolean;
}) {
  const price =
    interval === "monthly" ? plan.monthlyPriceCents : plan.yearlyPriceCents;
  return (
    <div
      className={cx(
        "relative flex flex-col rounded-(--radius-card) border p-6",
        plan.highlighted
          ? "border-brand-500 shadow-lg shadow-brand-500/10"
          : dark
            ? "border-white/10"
            : "border-slate-200",
        dark ? "glass text-slate-100" : "bg-white text-slate-900",
      )}
    >
      {plan.highlighted && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-0.5 text-xs font-semibold text-white">
          Recommandé
        </span>
      )}
      <h3 className="text-lg font-semibold">{plan.name}</h3>
      <p
        className={cx(
          "mt-1 text-sm",
          dark ? "text-slate-300" : "text-slate-500",
        )}
      >
        {plan.description}
      </p>
      <p className="mt-4">
        <span className="text-4xl font-bold tracking-tight">
          {price === 0 ? "0 €" : formatEuros(price)}
        </span>
        <span
          className={cx("text-sm", dark ? "text-slate-300" : "text-slate-500")}
        >
          {price === 0
            ? ""
            : interval === "monthly"
              ? " TTC / mois"
              : " TTC / an"}
        </span>
      </p>
      <ul className="mt-5 flex flex-1 flex-col gap-2.5 text-sm">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="currentColor"
              className={cx(
                "mt-0.5 size-4 shrink-0",
                plan.highlighted ? "text-brand-500" : "text-emerald-500",
              )}
            >
              <path
                fillRule="evenodd"
                d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                clipRule="evenodd"
              />
            </svg>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ActivityTimeline
// ---------------------------------------------------------------------------

export const EVENT_LABELS: Record<string, string> = {
  published: "Proposition publiée",
  unpublished: "Proposition dépubliée",
  first_view: "Première consultation",
  view: "Nouvelle consultation",
  package_selected: "Formule sélectionnée",
  option_selected: "Option sélectionnée",
  question_asked: "Question posée",
  change_requested: "Modification demandée",
  accepted: "Proposition acceptée",
  deposit_started: "Paiement d'acompte déclenché",
  expired: "Proposition expirée",
  outcome_changed: "Statut mis à jour",
  archived: "Proposition archivée",
};

const EVENT_TONES: Record<string, string> = {
  accepted: "bg-emerald-500",
  deposit_started: "bg-emerald-500",
  first_view: "bg-brand-500",
  view: "bg-brand-300",
  question_asked: "bg-amber-500",
  change_requested: "bg-amber-500",
  expired: "bg-red-400",
};

export interface TimelineItem {
  id: string;
  type: string;
  label?: string;
  detail?: string;
  createdAt: Date | string | number;
  linkTo?: string;
}

export function ActivityTimeline({ items }: { items: TimelineItem[] }) {
  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">
        Aucun événement pour le moment.
      </p>
    );
  }
  return (
    <ol className="relative flex flex-col gap-5 border-l border-slate-200 pl-5">
      {items.map((item) => (
        <li key={item.id} className="relative">
          <span
            aria-hidden="true"
            className={cx(
              "absolute top-1.5 -left-[26px] size-2.5 rounded-full",
              EVENT_TONES[item.type] ?? "bg-slate-300",
            )}
          />
          <p className="text-sm font-medium text-slate-800">
            {item.linkTo ? (
              <Link
                to={item.linkTo}
                className="hover:text-brand-700 hover:underline"
              >
                {item.label ?? EVENT_LABELS[item.type] ?? item.type}
              </Link>
            ) : (
              (item.label ?? EVENT_LABELS[item.type] ?? item.type)
            )}
          </p>
          {item.detail && (
            <p className="text-sm text-slate-500">{item.detail}</p>
          )}
          <p className="mt-0.5 text-xs text-slate-400">
            {formatDateTime(item.createdAt)}
          </p>
        </li>
      ))}
    </ol>
  );
}
