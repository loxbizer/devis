import { GuidePage, type GuideData } from "~/components/marketing/guide-page";
import type { Route } from "./+types/devis-interactif-artisan";

export const meta: Route.MetaFunction = () => [
  { title: "Devis interactif pour artisan : pourquoi et comment s'y mettre" },
  {
    name: "description",
    content:
      "Un devis interactif permet à votre client de comparer vos offres, poser ses questions et accepter en ligne. Guide pratique pour les artisans, sans changer de logiciel de devis.",
  },
];

const data: GuideData = {
  title: "Devis interactif pour artisan : pourquoi et comment s'y mettre",
  intro:
    "Un devis interactif n'est pas un gadget : c'est un devis présenté sous forme de page web privée, que votre client ouvre sur son téléphone, comprend sans effort et peut accepter en quelques gestes. Voici concrètement ce que cela change pour un artisan, et comment s'y mettre sans changer de logiciel.",
  sections: [
    {
      heading: "Qu'est-ce qu'un devis interactif exactement ?",
      paragraphs: [
        "C'est une page privée qui reprend le contenu de votre devis PDF, mais organisée pour la lecture à l'écran : un résumé du projet en tête, les prestations expliquées ligne par ligne, vos photos de chantiers, les étapes prévues, vos garanties, et un bouton d'acceptation.",
        "Contrairement au PDF, la page peut être interactive : le client compare plusieurs formules, coche des options, voit le total se recalculer, pose une question directement sous le devis.",
      ],
    },
    {
      heading: "Ce que ça change côté client",
      paragraphs: [
        "Vos clients particuliers reçoivent souvent trois devis pour un même chantier. Celui qui se lit confortablement sur téléphone, qui montre des photos et qui explique les étapes a un avantage évident sur deux pièces jointes de quatre pages.",
      ],
      list: [
        "Lecture facile sur mobile, sans zoomer sur un tableau.",
        "Comparaison claire entre vos formules plutôt qu'une négociation de remise.",
        "Possibilité de poser une question au moment où elle se pose.",
        "Acceptation immédiate quand la décision est prise, même un dimanche soir.",
      ],
    },
    {
      heading: "Faut-il changer de logiciel de devis ?",
      paragraphs: [
        "Non, et c'est le point important. Votre logiciel actuel (ou votre expert-comptable) reste la source de vérité pour le chiffrage et la facturation. L'outil de devis interactif intervient après : vous importez le PDF final, vous vérifiez les informations extraites, vous ajoutez photos et explications, et vous envoyez un lien privé.",
        "Avec DevisRoom, cette étape prend environ cinq minutes une fois l'entreprise configurée.",
      ],
    },
  ],
  example: {
    heading: "Exemple : un devis de rénovation de toiture",
    text: [
      "Un couvreur envoie un devis de 10 900 € pour une réfection complète. En PDF : quatre pages de lignes techniques. En page interactive : un mot personnel, trois formules (Essentielle 7 900 €, Recommandée 10 900 €, Sérénité 13 900 €), les photos d'un chantier similaire, six étapes datées et deux options à cocher. Le client comprend ce qu'il paie — et pourquoi.",
    ],
  },
  faq: [
    {
      q: "Un devis interactif est-il juridiquement valable ?",
      a: "Le devis reste votre document contractuel (le PDF original est d'ailleurs joint à la page). L'acceptation en ligne enregistre l'identité déclarée, la date, le montant et la version acceptée : c'est un faisceau d'indices utile, mais pas une signature électronique qualifiée.",
    },
    {
      q: "Mes clients âgés vont-ils s'y retrouver ?",
      a: "Ouvrir un lien est plus simple que télécharger et ouvrir un PDF. La page se lit comme un article, sans compte à créer ni application à installer.",
    },
    {
      q: "Combien ça coûte ?",
      a: "DevisRoom est gratuit jusqu'à 3 devis actifs, puis à partir de 9,90 € TTC par mois. Aucune carte bancaire n'est demandée pour essayer.",
    },
  ],
  related: [
    {
      to: "/comment-presenter-un-devis",
      label: "Comment présenter un devis qui donne confiance",
    },
    {
      to: "/suivi-ouverture-devis",
      label: "Savoir si votre devis a été ouvert",
    },
    { to: "/devis-en-ligne-couvreur", label: "Devis en ligne pour couvreur" },
  ],
};

export default function Page() {
  return <GuidePage data={data} />;
}
