import { GuidePage, type GuideData } from "~/components/marketing/guide-page";
import type { Route } from "./+types/suivi-ouverture-devis";

export const meta: Route.MetaFunction = () => [
  { title: "Suivi d'ouverture de devis : relancer au bon moment" },
  {
    name: "description",
    content:
      "Savoir si un devis a été ouvert change tout pour la relance. Méthodes possibles, limites des accusés de lecture, et ce qu'un suivi honnête permet vraiment.",
  },
];

const data: GuideData = {
  title: "Suivi d'ouverture de devis : relancer au bon moment",
  intro:
    "« Vous avez bien reçu mon devis ? » — la relance à l'aveugle est inconfortable pour tout le monde. Savoir si, quand et comment votre devis a été consulté transforme la relance en conversation naturelle. Encore faut-il un suivi fiable et respectueux.",
  sections: [
    {
      heading: "Pourquoi l'accusé de lecture e-mail ne suffit pas",
      paragraphs: [
        "Les accusés de réception d'e-mail sont bloqués par la plupart des messageries, et un e-mail « ouvert » ne dit pas que la pièce jointe l'a été. Le PDF, une fois téléchargé, ne vous dira jamais rien : ni s'il a été lu, ni combien de fois, ni sur quel appareil.",
      ],
    },
    {
      heading: "Ce qu'un lien de devis permet de savoir",
      paragraphs: [
        "En envoyant votre devis sous forme de page web privée, chaque consultation devient mesurable simplement :",
      ],
      list: [
        "La première ouverture (le bon signal pour un premier appel « tout est clair ? »).",
        "Le nombre de consultations distinctes — un devis rouvert trois fois en deux jours est un devis en cours de décision.",
        "L'appareil utilisé : un client qui a tout lu sur mobile appréciera qu'on lui propose de reparler des détails.",
        "Les formules comparées et les options explorées, quand la page les propose.",
      ],
    },
    {
      heading: "Les limites d'un suivi honnête",
      paragraphs: [
        "Méfiez-vous des outils qui promettent le « temps passé sur chaque ligne » ou un « score d'intention d'achat » : ces métriques sont largement fabriquées et créent de fausses certitudes.",
        "DevisRoom fait le choix inverse : compter les consultations réelles, horodater les événements concrets (question posée, formule comparée, acceptation), et rien d'autre. Pas de pixel publicitaire, pas de profilage.",
      ],
    },
    {
      heading: "Comment relancer après une ouverture",
      paragraphs: [
        "La bonne relance ne mentionne pas la surveillance. Plutôt que « j'ai vu que vous avez ouvert mon devis », appelez un jour après la première consultation avec une question ouverte : « Je voulais vérifier que tout était clair dans la proposition — avez-vous des questions sur les étapes ? ». L'information vous sert à choisir le moment, pas à le dire.",
      ],
    },
  ],
  example: {
    heading: "Exemple : la relance qui tombe juste",
    text: [
      "Mardi 18h42 : première consultation sur mobile. Mardi 18h47 : la formule « Recommandée » est comparée. Mercredi matin, l'artisan appelle : « Avez-vous pu regarder la proposition ? » — « Oui justement, on hésitait sur l'option gouttières ». Le devis est accepté dans la journée. Sans le suivi, la relance serait partie le lundi suivant.",
    ],
  },
  faq: [
    {
      q: "Le client sait-il que la consultation est comptée ?",
      a: "La politique de confidentialité de la page l'indique. Le comptage repose sur un cookie technique anonyme, sans identification de la personne ni suivi publicitaire.",
    },
    {
      q: "Que faire si le devis n'est jamais ouvert ?",
      a: "C'est aussi une information précieuse : le lien s'est peut-être perdu. Renvoyez-le par SMS — les liens y sont ouverts bien plus vite que les pièces jointes d'e-mail.",
    },
    {
      q: "Le suivi fonctionne-t-il si le client transfère le lien ?",
      a: "Oui, chaque visiteur distinct est compté séparément. Un devis consulté par plusieurs personnes (conjoint, banque) est souvent bon signe.",
    },
  ],
  related: [
    {
      to: "/client-ne-repond-pas-au-devis",
      label: "Votre client ne répond pas au devis ?",
    },
    { to: "/devis-interactif-artisan", label: "Devis interactif pour artisan" },
    {
      to: "/presentation-devis-renovation",
      label: "Présenter un devis de rénovation",
    },
  ],
};

export default function Page() {
  return <GuidePage data={data} />;
}
