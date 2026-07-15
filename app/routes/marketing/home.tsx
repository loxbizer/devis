import { useRef } from "react";
import { Link } from "react-router";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { PricingCard } from "~/components/ui/cards";
import { PLAN_ORDER, PLANS } from "~/lib/plans";
import type { Route } from "./+types/home";

export const meta: Route.MetaFunction = () => [
  { title: "DevisRoom — Transformez vos devis PDF en pages claires" },
  {
    name: "description",
    content:
      "Votre devis mérite mieux qu'une pièce jointe oubliée. Importez votre PDF, ajoutez vos photos et envoyez une page privée que votre client peut comprendre, commenter et accepter.",
  },
  {
    property: "og:title",
    content: "DevisRoom — Transformez vos devis PDF en pages claires",
  },
  {
    property: "og:description",
    content:
      "Gardez votre logiciel habituel. Importez votre devis, personnalisez sa présentation et envoyez un lien privé à votre client.",
  },
  { property: "og:type", content: "website" },
  { name: "twitter:card", content: "summary_large_image" },
  {
    name: "twitter:title",
    content: "DevisRoom — Transformez vos devis PDF en pages claires",
  },
  {
    name: "twitter:description",
    content:
      "Importez votre devis PDF, personnalisez sa présentation et envoyez un lien privé à votre client.",
  },
];

// ---------------------------------------------------------------------------
// Briques d'animation
// ---------------------------------------------------------------------------

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Bouton magnétique : suit légèrement le curseur (désactivé si reduced motion). */
function MagneticLink({
  to,
  children,
  variant = "primary",
}: {
  to: string;
  children: React.ReactNode;
  variant?: "primary" | "ghost";
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  function onMouseMove(event: React.MouseEvent) {
    if (reduced || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    ref.current.style.transform = `translate(${x * 0.18}px, ${y * 0.18}px)`;
  }

  function onMouseLeave() {
    if (ref.current) ref.current.style.transform = "translate(0, 0)";
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="inline-block transition-transform duration-200 ease-out"
    >
      <Link
        to={to}
        className={
          variant === "primary"
            ? "inline-flex items-center gap-2 rounded-xl bg-brand-500 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand-500/25 transition hover:bg-brand-400"
            : "inline-flex items-center gap-2 rounded-xl border border-white/15 px-7 py-3.5 text-base font-semibold text-white transition hover:bg-white/5"
        }
      >
        {children}
      </Link>
    </div>
  );
}

/** Particules décoratives très discrètes (purement CSS, aria-hidden). */
function Particles() {
  const dots = [
    { left: "8%", top: "18%", delay: "0s", size: 5 },
    { left: "85%", top: "12%", delay: "1.2s", size: 4 },
    { left: "70%", top: "65%", delay: "2.1s", size: 6 },
    { left: "20%", top: "75%", delay: "0.7s", size: 4 },
    { left: "50%", top: "30%", delay: "1.8s", size: 3 },
    { left: "92%", top: "45%", delay: "2.6s", size: 5 },
  ];
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {dots.map((dot, i) => (
        <span
          key={i}
          className="absolute animate-float rounded-full bg-brand-400/25"
          style={{
            left: dot.left,
            top: dot.top,
            width: dot.size,
            height: dot.size,
            animationDelay: dot.delay,
          }}
        />
      ))}
    </div>
  );
}

/** Animation « PDF → page interactive ». */
function PdfToPage() {
  const reduced = useReducedMotion();
  return (
    <div className="relative mx-auto flex max-w-3xl items-center justify-center gap-6 sm:gap-12">
      {/* Le PDF terne */}
      <motion.div
        aria-hidden="true"
        initial={reduced ? false : { opacity: 0, x: -30, rotate: -4 }}
        whileInView={{ opacity: 1, x: 0, rotate: -4 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="w-36 shrink-0 rounded-lg border border-white/10 bg-slate-200 p-3 shadow-xl sm:w-44"
      >
        <p className="text-[9px] font-bold text-slate-500">
          DEVIS-2026-041.pdf
        </p>
        <div className="mt-2 flex flex-col gap-1.5">
          {[...Array(9)].map((_, i) => (
            <div
              key={i}
              className="h-1.5 rounded bg-slate-400/60"
              style={{ width: `${90 - (i % 4) * 15}%` }}
            />
          ))}
          <div className="mt-1 h-2 w-1/2 self-end rounded bg-slate-500/70" />
        </div>
      </motion.div>

      {/* Flèche */}
      <motion.svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="size-8 shrink-0 text-brand-400"
        initial={reduced ? false : { opacity: 0, scale: 0.6 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.4 }}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13.5 4.5 21 12l-7.5 7.5M21 12H3"
        />
      </motion.svg>

      {/* La DevisRoom vivante */}
      <motion.div
        initial={reduced ? false : { opacity: 0, x: 30, y: 10 }}
        whileInView={{ opacity: 1, x: 0, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.3 }}
        className="w-56 shrink-0 rounded-2xl border border-white/10 bg-white p-4 text-slate-900 shadow-(--shadow-float) sm:w-64"
      >
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-amber-600 text-xs font-bold text-white">
            H
          </span>
          <div>
            <p className="text-xs font-bold">Horizon Toiture</p>
            <p className="text-[10px] text-slate-500">
              Rénovation toiture — M. Martin
            </p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1.5" aria-hidden="true">
          {["Essentielle", "Recommandée", "Sérénité"].map((name, i) => (
            <div
              key={name}
              className={
                i === 1
                  ? "rounded-lg border-2 border-amber-600 bg-amber-50 p-1.5"
                  : "rounded-lg border border-slate-200 p-1.5"
              }
            >
              <p className="text-[8px] font-semibold">{name}</p>
              <p className="text-[9px] font-bold">
                {["7 900", "10 900", "13 900"][i]} €
              </p>
            </div>
          ))}
        </div>
        <div className="mt-2 flex flex-col gap-1" aria-hidden="true">
          <div className="h-1.5 w-4/5 rounded bg-slate-200" />
          <div className="h-1.5 w-3/5 rounded bg-slate-200" />
        </div>
        <motion.div
          className="mt-3 rounded-lg bg-emerald-600 py-1.5 text-center text-[10px] font-semibold text-white"
          initial={reduced ? false : { scale: 0.95, opacity: 0.6 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 1, duration: 0.4 }}
        >
          ✓ J'accepte cette proposition
        </motion.div>
      </motion.div>
    </div>
  );
}

/** Panneau « 3D » : téléphone incliné en perspective CSS avec parallaxe scroll. */
function Phone3D() {
  const reduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });
  const rotate = useSpring(useTransform(scrollYProgress, [0, 1], [18, -6]), {
    stiffness: 60,
    damping: 20,
  });
  const y = useTransform(scrollYProgress, [0, 1], [40, -40]);

  return (
    <div
      ref={containerRef}
      style={{ perspective: 1200 }}
      className="mx-auto w-fit"
    >
      <motion.div
        style={reduced ? undefined : { rotateX: rotate, y }}
        className="w-64 rounded-[2rem] border border-white/15 bg-slate-900 p-3 shadow-(--shadow-float)"
      >
        <div className="rounded-[1.5rem] bg-slate-50 p-3 text-slate-900">
          <p className="text-[10px] font-semibold text-slate-500">
            Proposition pour M. et Mme Martin
          </p>
          <p className="mt-0.5 text-sm font-bold">
            Rénovation complète de la toiture
          </p>
          <div className="mt-2 rounded-lg border-l-4 border-amber-600 bg-white p-2 text-[9px] text-slate-600 shadow-sm">
            « Bonjour, voici notre proposition suite à notre visite du 3
            juillet… »
          </div>
          <div className="mt-2 flex flex-col gap-1" aria-hidden="true">
            {["Dépose des ardoises", "Écran sous-toiture", "Zinguerie"].map(
              (item) => (
                <div
                  key={item}
                  className="flex items-center gap-1.5 rounded-lg bg-white p-1.5 text-[9px] shadow-sm"
                >
                  <span className="size-1.5 rounded-full bg-amber-600" />
                  {item}
                </div>
              ),
            )}
          </div>
          <div className="mt-2 flex items-center justify-between rounded-lg bg-white p-2 shadow-sm">
            <span className="text-[9px] text-slate-500">Total TTC</span>
            <span className="text-xs font-bold text-amber-700">10 900 €</span>
          </div>
          <div className="mt-2 rounded-lg bg-amber-600 py-1.5 text-center text-[10px] font-semibold text-white">
            J'accepte cette proposition
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const STEPS = [
  {
    title: "Importez votre devis PDF",
    text: "Gardez votre logiciel de devis habituel. Déposez le PDF : DevisRoom lit le texte quand c'est possible et pré-remplit la page. Vous vérifiez et corrigez tout avant publication.",
  },
  {
    title: "Personnalisez la présentation",
    text: "Ajoutez photos, étapes du chantier, délais, garanties, FAQ, jusqu'à trois formules et des options à cocher. Votre page porte vos couleurs et votre logo.",
  },
  {
    title: "Envoyez un lien privé",
    text: "Votre client ne crée aucun compte : il ouvre le lien, compare, pose ses questions, demande une modification ou accepte — depuis son téléphone.",
  },
];

const COMPARISON = [
  [
    "Lisible sur téléphone",
    "Zoom et pincements pénibles",
    "Page adaptée au mobile",
  ],
  ["Photos du chantier", "Rarement incluses", "Galerie intégrée"],
  ["Comparaison d'offres", "Tableaux confus", "3 formules côte à côte"],
  ["Questions du client", "Par téléphone, perdues", "Directement sur la page"],
  ["Savoir si c'est ouvert", "Aucune information", "Consultations visibles"],
  ["Acceptation", "Impression + scan", "En ligne avec confirmation"],
  ["Acompte", "RIB dans un e-mail", "Lien de paiement ou virement encadré"],
];

const PROFESSIONS_LIST = [
  "Couvreurs",
  "Entreprises de rénovation",
  "Installateurs de climatisation",
  "Menuisiers",
  "Paysagistes",
  "Piscinistes",
  "Cuisinistes",
  "Peintres",
  "Électriciens",
  "Plombiers",
];

const FAQ_ITEMS = [
  {
    q: "Dois-je changer de logiciel de devis ?",
    a: "Non. Vous continuez à créer vos devis comme aujourd'hui. DevisRoom transforme le PDF final en page web claire — c'est un complément, pas un remplacement, et ce n'est pas un logiciel de facturation.",
  },
  {
    q: "Mon client doit-il créer un compte ?",
    a: "Jamais. Il reçoit un lien privé, l'ouvre sur son téléphone ou son ordinateur, et peut consulter, poser une question, demander une modification ou accepter.",
  },
  {
    q: "L'acceptation en ligne a-t-elle une valeur ?",
    a: "DevisRoom enregistre la date, l'identité déclarée, le montant et la version acceptée — un faisceau de preuves utile. Ce n'est pas une signature électronique qualifiée : pour les documents qui l'exigent, utilisez un service dédié.",
  },
  {
    q: "Et si mon PDF est un scan sans texte ?",
    a: "DevisRoom vous le signale clairement : vous saisissez les informations à la main (quelques minutes) et le PDF original reste téléchargeable par votre client sur la page.",
  },
  {
    q: "Comment fonctionne l'acompte ?",
    a: "Vous branchez votre propre lien de paiement Stripe ou affichez vos coordonnées de virement. L'argent va directement sur votre compte : DevisRoom ne touche jamais les fonds de vos clients.",
  },
  {
    q: "Puis-je essayer gratuitement ?",
    a: "Oui : le plan Gratuit permet 3 DevisRooms actives, sans carte bancaire et sans limite de durée.",
  },
];

export default function Home() {
  return (
    <main>
      {/* 2. Hero */}
      <section className="relative overflow-hidden px-4 pt-20 pb-24 sm:px-6 sm:pt-28">
        <Particles />
        <div
          aria-hidden="true"
          className="absolute -top-40 left-1/2 h-96 w-[48rem] -translate-x-1/2 rounded-full bg-brand-600/20 blur-3xl"
        />
        <div className="relative mx-auto max-w-4xl text-center">
          <Reveal>
            <p className="mx-auto w-fit rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-slate-300">
              Pour les artisans et entreprises de services
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="mt-6 text-4xl leading-tight font-bold tracking-tight text-white sm:text-6xl">
              Votre devis mérite mieux qu'une{" "}
              <span className="bg-gradient-to-r from-brand-400 to-sky-300 bg-clip-text text-transparent">
                pièce jointe oubliée
              </span>
              .
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300">
              Importez votre PDF, ajoutez vos photos et envoyez une page privée
              que votre client peut comprendre, commenter et accepter.
            </p>
          </Reveal>
          <Reveal delay={0.3}>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <MagneticLink to="/inscription">
                Créer ma première DevisRoom
              </MagneticLink>
              <MagneticLink to="/demonstration" variant="ghost">
                Voir la démonstration
              </MagneticLink>
            </div>
          </Reveal>
          <Reveal delay={0.4}>
            <p className="mt-5 text-sm text-slate-500">
              Gratuit jusqu'à 3 DevisRooms actives · sans carte bancaire
            </p>
          </Reveal>
        </div>

        {/* 3. Démonstration visuelle */}
        <div className="relative mx-auto mt-20 max-w-5xl">
          <PdfToPage />
        </div>
      </section>

      {/* 4. Le problème */}
      <section className="border-t border-white/5 bg-night-900 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Le PDF de devis travaille contre vous.
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Illisible sur téléphone",
                text: "Votre client reçoit le devis sur son mobile, zoome, se perd dans les lignes, referme. La décision attendra.",
              },
              {
                title: "Muet sur votre savoir-faire",
                text: "Des lignes de prix ne montrent ni vos chantiers, ni vos garanties, ni votre sérieux. Le moins-disant gagne par défaut.",
              },
              {
                title: "Aucun retour",
                text: "Ouvert ? Lu ? Comparé ? Vous relancez à l'aveugle, souvent trop tard, parfois trop tôt.",
              },
            ].map((item, i) => (
              <Reveal key={item.title} delay={i * 0.1}>
                <div className="glass h-full rounded-2xl p-6">
                  <h3 className="font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm text-slate-400">{item.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Fonctionnement en 3 étapes */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Trois étapes, cinq minutes.
            </h2>
            <p className="mt-3 text-slate-400">
              Sans changer de logiciel de devis, sans former personne.
            </p>
          </Reveal>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <Reveal key={step.title} delay={i * 0.12}>
                <li className="glass h-full rounded-2xl p-6">
                  <span
                    aria-hidden="true"
                    className="flex size-9 items-center justify-center rounded-xl bg-brand-500 text-sm font-bold text-white"
                  >
                    {i + 1}
                  </span>
                  <h3 className="mt-4 font-semibold text-white">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-400">{step.text}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* 6. Aperçu de la DevisRoom (panneau 3D + parallaxe) */}
      <section className="overflow-hidden border-t border-white/5 bg-night-900 px-4 py-20 sm:px-6">
        <div className="mx-auto grid max-w-5xl items-center gap-12 md:grid-cols-2">
          <Reveal>
            <div>
              <h2 className="text-3xl font-bold text-white sm:text-4xl">
                Ce que votre client voit.
              </h2>
              <p className="mt-4 text-slate-400">
                Une page sobre et rapide, à vos couleurs : message personnel,
                prestations expliquées, photos, étapes du chantier, garanties,
                choix de la formule et total mis à jour en direct.
              </p>
              <ul className="mt-6 flex flex-col gap-3 text-sm text-slate-300">
                {[
                  "Aucun compte à créer pour votre client",
                  "Lien privé non indexé, code secret possible",
                  "Bouton d'acceptation avec confirmation du montant",
                  "Acompte par votre lien Stripe ou par virement",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span
                      aria-hidden="true"
                      className="mt-1 size-1.5 shrink-0 rounded-full bg-brand-400"
                    />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                to="/demonstration"
                className="mt-8 inline-block rounded-xl border border-white/15 px-6 py-3 font-medium text-white transition hover:bg-white/5"
              >
                Ouvrir la démonstration complète
              </Link>
            </div>
          </Reveal>
          <Phone3D />
        </div>
      </section>

      {/* 7. Comparaison */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              PDF classique ou DevisRoom&nbsp;?
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-8 overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 text-slate-300">
                    <th scope="col" className="px-5 py-3.5 font-medium">
                      {" "}
                    </th>
                    <th scope="col" className="px-5 py-3.5 font-medium">
                      Devis PDF envoyé par e-mail
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-3.5 font-semibold text-brand-300"
                    >
                      DevisRoom
                    </th>
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  {COMPARISON.map(([label, pdf, room]) => (
                    <tr key={label} className="border-b border-white/5">
                      <th
                        scope="row"
                        className="px-5 py-3 font-medium text-white"
                      >
                        {label}
                      </th>
                      <td className="px-5 py-3 text-slate-400">{pdf}</td>
                      <td className="px-5 py-3">{room}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 8. Suivi des consultations */}
      <section className="border-t border-white/5 bg-night-900 px-4 py-20 sm:px-6">
        <div className="mx-auto grid max-w-5xl items-center gap-12 md:grid-cols-2">
          <Reveal className="order-2 md:order-1">
            <div className="glass rounded-2xl p-6" aria-hidden="true">
              <p className="text-sm font-semibold text-white">
                Activité — Toiture Martin
              </p>
              <ul className="mt-4 flex flex-col gap-3 text-sm">
                {[
                  [
                    "Première consultation",
                    "mar. 18:42 · sur mobile",
                    "bg-brand-400",
                  ],
                  [
                    "Formule « Recommandée » comparée",
                    "mar. 18:47",
                    "bg-brand-400",
                  ],
                  ["Question posée", "mar. 18:55", "bg-amber-400"],
                  ["Proposition acceptée", "mer. 09:12", "bg-emerald-400"],
                ].map(([title, time, dot]) => (
                  <li key={title as string} className="flex items-start gap-3">
                    <span
                      className={`mt-1.5 size-2 shrink-0 rounded-full ${dot}`}
                    />
                    <div>
                      <p className="text-slate-200">{title}</p>
                      <p className="text-xs text-slate-500">{time}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal className="order-1 md:order-2">
            <div>
              <h2 className="text-3xl font-bold text-white sm:text-4xl">
                Relancez au bon moment, pas au hasard.
              </h2>
              <p className="mt-4 text-slate-400">
                DevisRoom vous montre des faits simples et honnêtes : la page
                a-t-elle été ouverte, quand, sur quel appareil, quelle formule a
                été comparée. Pas de score d'intention inventé, pas de suivi
                invasif — juste ce qu'il faut pour appeler au bon moment.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 9. Acceptation & acompte */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-4xl text-center">
          <Reveal>
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              De l'accord verbal à l'engagement concret.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-400">
              Votre client confirme son identité, le montant et la formule
              choisie. Vous recevez une notification immédiate, avec la version
              exacte de la proposition acceptée. Il peut ensuite régler
              l'acompte par votre lien de paiement Stripe ou par virement —
              l'argent arrive directement chez vous.
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="mx-auto mt-10 max-w-md rounded-2xl bg-white p-6 text-left text-slate-900 shadow-(--shadow-float)">
              <p className="text-sm text-slate-500">
                Confirmation d'acceptation
              </p>
              <p className="mt-1 font-semibold">
                Rénovation toiture — formule Recommandée
              </p>
              <p className="mt-1 text-2xl font-bold text-emerald-600">
                10 900 € TTC
              </p>
              <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
                ✓ Acceptée par M. Martin le 12 juillet à 09:12
              </div>
              <p className="mt-3 text-xs text-slate-400">
                L'acceptation en ligne ne constitue pas une signature
                électronique qualifiée.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 10. Professions */}
      <section className="border-t border-white/5 bg-night-900 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-4xl text-center">
          <Reveal>
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Pensé pour les métiers du chantier.
            </h2>
            <p className="mt-3 text-slate-400">
              Et configurable pour toute entreprise de services qui envoie des
              devis.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <ul className="mt-8 flex flex-wrap justify-center gap-2.5">
              {PROFESSIONS_LIST.map((profession) => (
                <li
                  key={profession}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300"
                >
                  {profession}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* 11. Prix */}
      <section className="px-4 py-20 sm:px-6" aria-labelledby="prix-titre">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <h2
              id="prix-titre"
              className="text-center text-3xl font-bold text-white sm:text-4xl"
            >
              Des prix d'artisan, pas de logiciel d'usine.
            </h2>
            <p className="mt-3 text-center text-slate-400">
              Commencez gratuitement. Passez au niveau supérieur quand vos devis
              le méritent. Paiement annuel : environ 2 mois offerts.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {PLAN_ORDER.map((planId, i) => (
              <Reveal key={planId} delay={i * 0.08}>
                <PricingCard
                  plan={PLANS[planId]}
                  interval="monthly"
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
              </Reveal>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-slate-500">
            <Link to="/tarifs" className="underline hover:text-slate-300">
              Voir le détail complet des plans et les tarifs annuels
            </Link>
          </p>
        </div>
      </section>

      {/* 12. FAQ */}
      <section
        className="border-t border-white/5 bg-night-900 px-4 py-20 sm:px-6"
        aria-labelledby="faq-titre"
      >
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <h2
              id="faq-titre"
              className="text-3xl font-bold text-white sm:text-4xl"
            >
              Questions fréquentes
            </h2>
          </Reveal>
          <div className="mt-8 flex flex-col gap-3">
            {FAQ_ITEMS.map((item, i) => (
              <Reveal key={item.q} delay={i * 0.05}>
                <details className="group glass rounded-2xl">
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
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 13. Appel à l'action final */}
      <section className="relative overflow-hidden px-4 py-24 sm:px-6">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-brand-600/15 to-transparent"
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <Reveal>
            <h2 className="text-3xl font-bold text-white sm:text-5xl">
              Votre prochain devis peut être votre plus convaincant.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-400">
              Créez votre compte gratuit, importez un devis et voyez la
              différence en cinq minutes.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <MagneticLink to="/inscription">
                Créer ma première DevisRoom
              </MagneticLink>
              <MagneticLink to="/demonstration" variant="ghost">
                Voir la démonstration
              </MagneticLink>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
