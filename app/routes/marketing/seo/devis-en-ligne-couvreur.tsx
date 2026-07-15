import { GuidePage, type GuideData } from "~/components/marketing/guide-page";
import type { Route } from "./+types/devis-en-ligne-couvreur";

export const meta: Route.MetaFunction = () => [
  {
    title:
      "Devis en ligne pour couvreur : présenter la toiture qu'on ne voit pas",
  },
  {
    name: "description",
    content:
      "Le client ne monte jamais sur son toit : votre devis de couverture doit montrer ce qu'il ne peut pas voir. Photos, formules et garanties — guide pratique pour couvreurs.",
  },
];

const data: GuideData = {
  title:
    "Devis en ligne pour couvreur : présenter la toiture qu'on ne voit pas",
  intro:
    "La couverture a une particularité commerciale : le client ne voit ni le problème, ni le résultat. Il ne montera jamais vérifier les ardoises cassées ni l'écran sous-toiture. Votre devis est donc son seul moyen de comprendre ce qu'il achète — et c'est précisément pour cela qu'un devis en ligne avec photos change la donne pour un couvreur.",
  sections: [
    {
      heading: "Montrez ce que le client ne peut pas voir",
      paragraphs: [
        "Les photos prises pendant votre visite (drone, perche ou depuis le toit) valent tous les paragraphes : ardoises fendues, zinguerie fatiguée, mousse, faîtage descellé. Ajoutez des photos de chantiers terminés comparables.",
        "Sur une page de devis en ligne, ces photos s'affichent en galerie à côté des prestations correspondantes. Dans un PDF, elles alourdissent le fichier et s'impriment en gris.",
      ],
    },
    {
      heading: "Trois formules plutôt qu'un prix sec",
      paragraphs: [
        "Une toiture se répare, se rénove ou se refait à neuf. Présenter ces trois niveaux comme des formules comparables aide le client à se situer :",
      ],
      list: [
        "Réparation : remplacer les éléments endommagés, assurer l'étanchéité — le minimum sécurisant.",
        "Rénovation : couverture reprise, écran sous-toiture, zinguerie neuve — le meilleur rapport durée/prix.",
        "Complète : isolation, gouttières, entretien programmé — la tranquillité longue durée.",
      ],
    },
    {
      heading: "Les garanties, vos meilleures ambassadrices",
      paragraphs: [
        "Décennale, biennale, garantie de parfait achèvement : ces mots rassurent s'ils sont expliqués simplement (« si un désordre d'étanchéité apparaît dans les 10 ans, nous intervenons, c'est assuré »). Une section garanties dédiée, visible avant le prix, désamorce la peur n°1 : « et s'il disparaît après le chantier ? ».",
      ],
    },
    {
      heading: "L'acompte sans friction",
      paragraphs: [
        "Un chantier de couverture démarre presque toujours avec un acompte de 30 %. Plutôt qu'un RIB dans un e-mail, la page de devis peut afficher un bouton de paiement (votre propre lien Stripe) ou vos coordonnées de virement clairement encadrées — actif dès que le client a accepté.",
      ],
    },
  ],
  example: {
    heading: "Exemple : la maison Martin",
    text: [
      "Notre démonstration publique montre un devis complet de rénovation de toiture : trois formules (7 900 €, 10 900 €, 13 900 €), photos, six étapes de chantier, garanties expliquées et deux options (fenêtre de toit, traitement anti-mousse). C'est une entreprise fictive, mais le déroulé est exactement celui que verraient vos clients.",
    ],
  },
  faq: [
    {
      q: "Mes photos de visite sont lourdes, est-ce un problème ?",
      a: "Non : DevisRoom optimise automatiquement les images avant envoi (redimensionnement et compression), pour que la page reste rapide même sur le réseau mobile d'une zone rurale.",
    },
    {
      q: "Puis-je joindre le devis PDF officiel ?",
      a: "Oui, le PDF original de votre logiciel reste téléchargeable depuis la page. La page web présente, le PDF fait foi.",
    },
    {
      q: "Et pour les marchés avec des syndics ou des pros ?",
      a: "Le lien privé se transfère facilement en interne chez votre client (syndic, copropriétaires, banque). Chaque consultation est comptée, ce qui vous indique quand le dossier circule.",
    },
  ],
  related: [
    {
      to: "/presentation-devis-renovation",
      label: "Présenter un devis de rénovation",
    },
    { to: "/suivi-ouverture-devis", label: "Suivi d'ouverture de devis" },
    { to: "/devis-interactif-artisan", label: "Devis interactif pour artisan" },
  ],
};

export default function Page() {
  return <GuidePage data={data} />;
}
