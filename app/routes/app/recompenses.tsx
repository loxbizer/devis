import { useFetcher } from "react-router";
import { useAppContext } from "./layout";
import { ActivityTimeline } from "~/components/ui/cards";
import { Alert, Badge, Button, cx } from "~/components/ui/primitives";
import {
  computeBadge,
  EARN_RULES,
  getLevel,
  getNextLevel,
  REWARD_CATALOG,
} from "~/lib/rewards";
import { verifyCsrf } from "~/server/auth/session.server";
import { requireOrg } from "~/server/services/org.server";
import {
  getRewardBalance,
  listRewardTransactions,
  redeemReward,
} from "~/server/services/rewards.server";
import type { Route } from "./+types/recompenses";

export const meta: Route.MetaFunction = () => [
  { title: "Récompenses — DevisRoom" },
  { name: "robots", content: "noindex" },
];

export async function loader({ request }: Route.LoaderArgs) {
  const ctx = await requireOrg(request);
  const [balance, transactions] = await Promise.all([
    getRewardBalance(ctx.organization.id),
    listRewardTransactions(ctx.organization.id),
  ]);
  return {
    balance: balance.balance,
    lifetime: balance.lifetime,
    badge: computeBadge(ctx.organization.badge, ctx.plan.id),
    planId: ctx.plan.id,
    transactions: transactions.map((t) => ({
      id: t.id,
      label: t.label,
      delta: t.delta,
      createdAt: t.createdAt,
    })),
  };
}

export async function action({ request }: Route.ActionArgs) {
  const ctx = await requireOrg(request);
  const formData = await request.formData();
  await verifyCsrf(request, ctx.session, formData);
  const itemId = String(formData.get("itemId") ?? "");
  return redeemReward(ctx.organization.id, itemId);
}

export default function Recompenses({ loaderData }: Route.ComponentProps) {
  const { csrf } = useAppContext();
  const fetcher = useFetcher<{
    ok: boolean;
    error?: string;
    message?: string;
  }>();
  const { balance, lifetime, badge } = loaderData;
  const level = getLevel(lifetime);
  const nextLevel = getNextLevel(lifetime);
  const progress = nextLevel
    ? Math.min(100, Math.round((lifetime / nextLevel.minLifetime) * 100))
    : 100;

  return (
    <div className="flex max-w-3xl flex-col gap-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Récompenses</h1>
        <p className="mt-1 text-sm text-slate-500">
          Vos points arrivent tout seuls en utilisant DevisRoom — rien à faire
          de plus, rien n'expire, et personne ne vous relancera pour les
          dépenser. C'est juste notre façon de dire merci.
        </p>
      </div>

      {/* Solde + niveau */}
      <section
        aria-label="Votre solde de points"
        className="rounded-3xl bg-gradient-to-br from-brand-600 to-violet-600 p-[1px]"
      >
        <div className="flex flex-col gap-4 rounded-3xl bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">Points disponibles</p>
            <p className="text-4xl font-bold tracking-tight text-slate-900">
              {balance.toLocaleString("fr-FR")}{" "}
              <span className="text-lg font-semibold text-brand-600">pts</span>
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {lifetime.toLocaleString("fr-FR")} points gagnés au total
            </p>
          </div>
          <div className="sm:text-right">
            <p className="text-sm text-slate-500">
              Niveau{" "}
              <span className="font-semibold text-slate-900">
                {level.emoji} {level.name}
              </span>
            </p>
            {nextLevel ? (
              <>
                <div
                  role="progressbar"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Progression vers le niveau ${nextLevel.name}`}
                  className="mt-2 h-2 w-48 overflow-hidden rounded-full bg-slate-100"
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {nextLevel.emoji} {nextLevel.name} à{" "}
                  {nextLevel.minLifetime.toLocaleString("fr-FR")} points
                </p>
              </>
            ) : (
              <p className="mt-1 text-xs text-slate-400">
                Niveau maximum atteint — chapeau !
              </p>
            )}
            {badge !== "none" && (
              <p className="mt-2">
                {badge === "gold" ? (
                  <Badge tone="amber">★ Certifié Or</Badge>
                ) : (
                  <Badge tone="blue">✓ Certifié</Badge>
                )}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Comment gagner */}
      <section aria-labelledby="gagner-titre">
        <h2 id="gagner-titre" className="text-lg font-semibold">
          Comment gagner des points
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {Object.values(EARN_RULES).map((rule) => (
            <li
              key={rule.reason}
              className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4"
            >
              <div>
                <p className="font-medium text-slate-900">{rule.label}</p>
                <p className="mt-0.5 text-sm text-slate-500">
                  {rule.description}
                </p>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-sm font-bold whitespace-nowrap text-emerald-700">
                +{rule.points}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Catalogue */}
      <section aria-labelledby="catalogue-titre">
        <h2 id="catalogue-titre" className="text-lg font-semibold">
          Échanger mes points
        </h2>
        {fetcher.data && !fetcher.data.ok && (
          <div className="mt-3">
            <Alert tone="info">{fetcher.data.error}</Alert>
          </div>
        )}
        {fetcher.data?.ok && (
          <div className="mt-3">
            <Alert tone="success">{fetcher.data.message}</Alert>
          </div>
        )}
        <ul className="mt-4 grid gap-4 md:grid-cols-3">
          {REWARD_CATALOG.map((item) => {
            const affordable = balance >= item.cost;
            const alreadyOwned =
              item.id === "badge_certified" &&
              (badge === "certified" || badge === "gold");
            return (
              <li
                key={item.id}
                className={cx(
                  "flex flex-col rounded-2xl border bg-white p-5",
                  affordable && !alreadyOwned
                    ? "border-brand-300 shadow-sm"
                    : "border-slate-200/80",
                )}
              >
                <p className="text-2xl" aria-hidden="true">
                  {item.kind === "badge" ? "🛡️" : "🎁"}
                </p>
                <p className="mt-2 font-semibold text-slate-900">
                  {item.label}
                </p>
                <p className="mt-1 flex-1 text-sm text-slate-500">
                  {item.description}
                </p>
                <p className="mt-3 text-sm font-bold text-brand-700">
                  {item.cost.toLocaleString("fr-FR")} points
                </p>
                <fetcher.Form method="post" className="mt-3">
                  <input type="hidden" name="_csrf" value={csrf} />
                  <input type="hidden" name="itemId" value={item.id} />
                  <Button
                    type="submit"
                    variant={
                      affordable && !alreadyOwned ? "primary" : "outline"
                    }
                    size="sm"
                    className="w-full"
                    disabled={!affordable || alreadyOwned}
                    loading={fetcher.state !== "idle"}
                  >
                    {alreadyOwned
                      ? item.id === "badge_certified" && badge === "gold"
                        ? "Inclus avec votre plan"
                        : "Déjà débloqué"
                      : affordable
                        ? "Échanger"
                        : `Encore ${(item.cost - balance).toLocaleString("fr-FR")} pts`}
                  </Button>
                </fetcher.Form>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-slate-400">
          Le badge Or est offert avec les plans Pro et Équipe. Les réductions
          s'appliquent une fois, sur la prochaine facture d'un abonnement
          payant. Vos points ne sont débités que si la récompense est réellement
          appliquée.
        </p>
      </section>

      {/* Historique */}
      <section aria-labelledby="historique-points-titre">
        <h2 id="historique-points-titre" className="text-lg font-semibold">
          Historique
        </h2>
        <div className="mt-4 rounded-2xl border border-slate-200/80 bg-white p-6">
          {loaderData.transactions.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">
              Vos premiers points arriveront avec votre première DevisRoom
              publiée. Bonne chance !
            </p>
          ) : (
            <ActivityTimeline
              items={loaderData.transactions.map((t) => ({
                id: t.id,
                type: t.delta > 0 ? "accepted" : "outcome_changed",
                label: t.label,
                detail: `${t.delta > 0 ? "+" : ""}${t.delta} points`,
                createdAt: t.createdAt,
              }))}
            />
          )}
        </div>
      </section>
    </div>
  );
}
