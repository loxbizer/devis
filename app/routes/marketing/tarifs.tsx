import { useState } from "react";
import { Link } from "react-router";
import { PricingCard } from "~/components/ui/cards";
import { cx } from "~/components/ui/primitives";
import { PLAN_ORDER, PLANS, type BillingInterval } from "~/lib/plans";
import type { Route } from "./+types/tarifs";

export const meta: Route.MetaFunction = () => [
  { title: "Tarifs — DevisRoom" },
  {
    name: "description",
    content:
      "DevisRoom est gratuit jusqu'à 3 devis actifs. Plans Solo à 9,90 €, Pro à 19,90 € et Équipe à 39,90 € TTC par mois — ou tarif annuel avec environ 2 mois offerts.",
  },
];

const PRICING_FAQ = [
  {
    q: "Le plan Gratuit est-il limité dans le temps ?",
    a: "Non. Il permet 3 DevisRooms actives en permanence, sans carte bancaire. Archivez un devis terminé pour en publier un nouveau.",
  },
  {
    q: "Que se passe-t-il si je dépasse une limite ?",
    a: "Rien n'est supprimé, jamais. Vous êtes prévenu, la limite est expliquée et vous choisissez : archiver, supprimer ou passer au plan supérieur.",
  },
  {
    q: "Puis-je changer de plan ou résilier à tout moment ?",
    a: "Oui, depuis votre espace via le portail Stripe. La résiliation prend effet à la fin de la période payée.",
  },
  {
    q: "Les prix sont-ils TTC ?",
    a: "Oui, tous les prix affichés sont TTC. Le paiement est géré par Stripe (carte bancaire).",
  },
];

export default function Tarifs() {
  const [interval, setInterval] = useState<BillingInterval>("monthly");

  return (
    <main className="px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-center text-4xl font-bold tracking-tight text-white">
          Des tarifs simples et honnêtes.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-center text-lg text-slate-400">
          Commencez gratuitement, sans carte bancaire. Chaque plan supérieur se
          rembourse dès le premier chantier mieux présenté.
        </p>

        <div
          className="mt-10 flex justify-center gap-2"
          role="group"
          aria-label="Périodicité de facturation"
        >
          {(
            [
              ["monthly", "Mensuel"],
              ["yearly", "Annuel — ≈ 2 mois offerts"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={interval === value}
              onClick={() => setInterval(value)}
              className={cx(
                "rounded-full px-5 py-2 text-sm font-medium transition",
                interval === value
                  ? "bg-white text-slate-900"
                  : "border border-white/15 text-slate-300 hover:text-white",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {PLAN_ORDER.map((planId) => (
            <PricingCard
              key={planId}
              plan={PLANS[planId]}
              interval={interval}
              dark
              action={
                <Link
                  to="/inscription"
                  className={
                    PLANS[planId].highlighted
                      ? "block rounded-xl bg-brand-500 px-4 py-2.5 text-center font-semibold text-white transition hover:bg-brand-400"
                      : "block rounded-xl border border-white/15 px-4 py-2.5 text-center font-medium text-white transition hover:bg-white/5"
                  }
                >
                  {planId === "free"
                    ? "Commencer gratuitement"
                    : `Choisir ${PLANS[planId].name}`}
                </Link>
              }
            />
          ))}
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          * « Illimité » s'entend dans le cadre d'un usage professionnel normal
          (limite technique anti-abus de 500 DevisRooms actives).
        </p>

        <section
          aria-labelledby="tarifs-faq-titre"
          className="mx-auto mt-20 max-w-3xl"
        >
          <h2 id="tarifs-faq-titre" className="text-2xl font-bold text-white">
            Questions sur les tarifs
          </h2>
          <div className="mt-6 flex flex-col gap-3">
            {PRICING_FAQ.map((item) => (
              <details key={item.q} className="group glass rounded-2xl">
                <summary className="cursor-pointer list-none px-6 py-4 font-medium text-white">
                  <span className="flex items-center justify-between gap-3">
                    {item.q}
                    <span
                      aria-hidden="true"
                      className="text-slate-500 transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </span>
                </summary>
                <p className="px-6 pb-5 text-sm text-slate-400">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
