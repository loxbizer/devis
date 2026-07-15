import { useState } from "react";
import { redirect, useFetcher, useSearchParams } from "react-router";
import { useAppContext } from "./layout";
import { PricingCard } from "~/components/ui/cards";
import { Alert, Button, cx } from "~/components/ui/primitives";
import { formatBytes, formatDate } from "~/lib/format";
import {
  PLAN_ORDER,
  PLANS,
  type BillingInterval,
  type PlanId,
} from "~/lib/plans";
import { verifyCsrf } from "~/server/auth/session.server";
import { getDb } from "~/server/db.server";
import { requireOrg } from "~/server/services/org.server";
import { getQuotaUsage } from "~/server/services/quotas.server";
import {
  createBillingPortal,
  createSubscriptionCheckout,
  isStripeConfigured,
} from "~/server/services/stripe.server";
import type { Route } from "./+types/abonnement";

export const meta: Route.MetaFunction = () => [
  { title: "Abonnement — DevisRoom" },
  { name: "robots", content: "noindex" },
];

export async function loader({ request }: Route.LoaderArgs) {
  const ctx = await requireOrg(request);
  const usage = await getQuotaUsage(getDb(), ctx.organization.id, ctx.plan.id);
  return {
    subscription: {
      plan: ctx.subscription.plan,
      status: ctx.subscription.status,
      interval: ctx.subscription.interval,
      currentPeriodEnd: ctx.subscription.currentPeriodEnd,
      cancelAtPeriodEnd: ctx.subscription.cancelAtPeriodEnd,
      hasStripeCustomer: Boolean(ctx.subscription.stripeCustomerId),
    },
    usage: {
      activeProposals: usage.activeProposals,
      maxActiveProposals: usage.limits.maxActiveProposals,
      storageBytes: usage.storageBytes,
      maxStorageBytes: usage.limits.maxStorageBytes,
    },
    stripeConfigured: isStripeConfigured(),
  };
}

export async function action({ request }: Route.ActionArgs) {
  const ctx = await requireOrg(request);
  const formData = await request.formData();
  await verifyCsrf(request, ctx.session, formData);
  const intent = String(formData.get("intent") ?? "");

  if (intent === "checkout") {
    const plan = String(formData.get("plan") ?? "") as PlanId;
    const interval = String(
      formData.get("interval") ?? "monthly",
    ) as BillingInterval;
    if (!["solo", "pro", "team"].includes(plan)) {
      return { ok: false, error: "Plan inconnu." };
    }
    if (ctx.membership.role !== "owner" && ctx.membership.role !== "admin") {
      return {
        ok: false,
        error: "Seul le propriétaire du compte peut gérer l'abonnement.",
      };
    }
    const result = await createSubscriptionCheckout({
      organizationId: ctx.organization.id,
      userEmail: ctx.session.user.email,
      plan,
      interval,
    });
    if (!result.ok) return { ok: false, error: result.error };
    // L'activation réelle du plan n'aura lieu qu'à réception du webhook Stripe.
    throw redirect(result.url);
  }

  if (intent === "portal") {
    const result = await createBillingPortal(ctx.organization.id);
    if (!result.ok) return { ok: false, error: result.error };
    throw redirect(result.url);
  }

  return { ok: false, error: "Action inconnue." };
}

export default function Abonnement({ loaderData }: Route.ComponentProps) {
  const { csrf } = useAppContext();
  const fetcher = useFetcher<{ ok: boolean; error?: string }>();
  const [searchParams] = useSearchParams();
  const [interval, setInterval] = useState<BillingInterval>(
    loaderData.subscription.interval === "yearly" ? "yearly" : "monthly",
  );
  const checkoutStatus = searchParams.get("checkout");
  const current = loaderData.subscription;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Abonnement</h1>
        <p className="mt-1 text-sm text-slate-500">
          Plan actuel : <strong>{PLANS[current.plan].name}</strong>
          {current.interval &&
            (current.interval === "yearly" ? " (annuel)" : " (mensuel)")}
          {current.currentPeriodEnd &&
            ` — renouvellement le ${formatDate(current.currentPeriodEnd)}`}
          {current.cancelAtPeriodEnd && " · résiliation programmée"}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Utilisation : {loaderData.usage.activeProposals}/
          {loaderData.usage.maxActiveProposals} DevisRooms actives ·{" "}
          {formatBytes(loaderData.usage.storageBytes)} /{" "}
          {formatBytes(loaderData.usage.maxStorageBytes)}
        </p>
      </div>

      {checkoutStatus === "succes" && (
        <Alert tone="success" title="Paiement en cours de confirmation">
          Merci ! Votre abonnement sera activé dès la confirmation de Stripe
          (quelques secondes en général). Rechargez cette page si nécessaire.
        </Alert>
      )}
      {checkoutStatus === "annule" && (
        <Alert tone="info">
          Le paiement a été annulé. Aucun montant n'a été prélevé.
        </Alert>
      )}
      {!loaderData.stripeConfigured && (
        <Alert tone="warning" title="Stripe non configuré sur cette instance">
          Les paiements d'abonnement sont désactivés (mode démonstration).
          Consultez STRIPE.md pour configurer les clés et les prix.
        </Alert>
      )}
      {fetcher.data && !fetcher.data.ok && (
        <Alert tone="error">{fetcher.data.error}</Alert>
      )}

      <div
        className="flex items-center gap-2"
        role="group"
        aria-label="Périodicité"
      >
        {(
          [
            ["monthly", "Mensuel"],
            ["yearly", "Annuel (2 mois offerts)"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={interval === value}
            onClick={() => setInterval(value)}
            className={cx(
              "rounded-full px-4 py-1.5 text-sm font-medium transition",
              interval === value
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {PLAN_ORDER.map((planId) => {
          const plan = PLANS[planId];
          const isCurrent = current.plan === planId;
          return (
            <PricingCard
              key={planId}
              plan={plan}
              interval={interval}
              action={
                isCurrent ? (
                  <Button variant="outline" disabled className="w-full">
                    Plan actuel
                  </Button>
                ) : planId === "free" ? (
                  current.hasStripeCustomer ? (
                    <fetcher.Form method="post">
                      <input type="hidden" name="_csrf" value={csrf} />
                      <input type="hidden" name="intent" value="portal" />
                      <Button
                        type="submit"
                        variant="outline"
                        className="w-full"
                      >
                        Gérer via Stripe
                      </Button>
                    </fetcher.Form>
                  ) : (
                    <Button variant="outline" disabled className="w-full">
                      Plan de départ
                    </Button>
                  )
                ) : (
                  <fetcher.Form method="post">
                    <input type="hidden" name="_csrf" value={csrf} />
                    <input type="hidden" name="intent" value="checkout" />
                    <input type="hidden" name="plan" value={planId} />
                    <input type="hidden" name="interval" value={interval} />
                    <Button
                      type="submit"
                      className="w-full"
                      variant={plan.highlighted ? "primary" : "outline"}
                      disabled={!loaderData.stripeConfigured}
                      loading={fetcher.state !== "idle"}
                    >
                      Choisir {plan.name}
                    </Button>
                  </fetcher.Form>
                )
              }
            />
          );
        })}
      </div>

      {current.hasStripeCustomer && (
        <fetcher.Form method="post">
          <input type="hidden" name="_csrf" value={csrf} />
          <input type="hidden" name="intent" value="portal" />
          <Button type="submit" variant="outline">
            Gérer mon abonnement et mes factures (portail Stripe)
          </Button>
        </fetcher.Form>
      )}

      <p className="text-xs text-slate-400">
        Prix TTC. Le passage à un plan inférieur ne supprime jamais vos données
        : les DevisRooms au-delà de la limite devront simplement être archivées
        avant de pouvoir en publier de nouvelles.
      </p>
    </div>
  );
}
