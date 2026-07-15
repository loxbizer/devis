import { GuidePage, type GuideData } from "~/components/marketing/guide-page";
import type { Route } from "./+types/devis-interactif-menuisier";

export const meta: Route.MetaFunction = () => [
  {
    title:
      "Devis interactif menuisier : faire voir le sur-mesure avant de le fabriquer",
  },
  {
    name: "description",
    content:
      "Le sur-mesure ne se vend pas sur un tableau de dimensions. Comment un menuisier peut présenter ses devis avec photos, essences et finitions pour déclencher la décision.",
  },
];

const data: GuideData = {
  title:
    "Devis interactif menuisier : faire voir le sur-mesure avant de le fabriquer",
  intro:
    "Le paradoxe du menuisier : vous vendez un objet qui n'existe pas encore, à un prix supérieur au standard de grande surface. Si votre devis se résume à des dimensions et un montant, le client compare avec le catalogue industriel — et le sur-mesure perd. Votre devis doit faire voir l'atelier, la matière et le geste.",
  sections: [
    {
      heading: "Vos réalisations sont votre argumentaire",
      paragraphs: [
        "Une bibliothèque sous pente, un escalier quart tournant, un dressing toute hauteur : les photos de vos réalisations comparables sont l'argument n°1. Sur une page de devis interactive, la galerie se place juste après le résumé du projet — le client se projette avant même de lire les lignes.",
        "Ajoutez les photos de l'existant prises lors de la prise de cotes : elles montrent que le devis répond à SA pièce, pas à un gabarit.",
      ],
    },
    {
      heading: "Expliquer ce qui justifie le sur-mesure",
      paragraphs: [
        "Détaillez ce que le standard ne fait pas, en langage client :",
      ],
      list: [
        "Essence et finition : « chêne massif, vernis mat trois couches » plutôt qu'une référence.",
        "Ajustement : « posé au millimètre malgré le mur non droit (faux aplomb de 2 cm relevé) ».",
        "Quincaillerie : « charnières invisibles, amortisseurs sur toutes les portes ».",
        "Fabrication locale et délais d'atelier réalistes, étape par étape.",
      ],
    },
    {
      heading: "Les options, levier naturel du bois",
      paragraphs: [
        "Le sur-mesure appelle les options : tiroirs supplémentaires, éclairage LED intégré, finition huilée plutôt que vernie, façades toute hauteur. Présentées comme des cases à cocher avec leur prix, elles laissent le client composer son projet — et augmentent naturellement le panier sans négociation.",
      ],
    },
    {
      heading: "Le délai d'atelier, à afficher plutôt qu'à cacher",
      paragraphs: [
        "Six à dix semaines de fabrication ne font pas fuir un client qui comprend pourquoi : séchage, usinage, finition, pose. Une section « étapes » transforme le délai en preuve de sérieux. Ce qui fait fuir, c'est le silence sur la date.",
      ],
    },
  ],
  example: {
    heading: "Exemple : dressing sous pente sur mesure",
    text: [
      "Devis présenté en deux formules : « Mélaminé structuré » (3 200 €) et « Chêne massif » (5 400 €), avec options éclairage LED (390 €) et miroir de porte (280 €). Photos de trois dressings comparables terminés, étapes de la prise de cotes à la pose, garantie de parfait achèvement expliquée. Le client coche l'éclairage et accepte la formule chêne.",
    ],
  },
  faq: [
    {
      q: "Mes prix sont plus élevés que le standard : la comparaison ne va-t-elle pas me desservir ?",
      a: "C'est l'inverse : la comparaison sans contexte (prix seul) vous dessert. Une page qui montre la matière, l'ajustement et les finitions explique l'écart — c'est le PDF nu qui laisse le prix seul face au catalogue.",
    },
    {
      q: "Puis-je présenter des variantes d'essence de bois ?",
      a: "Oui, c'est l'usage idéal des formules : même projet en mélaminé, chêne ou noyer, avec photos de chaque finition. Le client visualise et choisit.",
    },
    {
      q: "Comment gérer l'acompte de commande ?",
      a: "Le sur-mesure se lance classiquement avec 40 à 50 % à la commande. Après acceptation en ligne, la page affiche votre lien de paiement ou vos coordonnées de virement — le lancement en atelier n'attend plus le chèque.",
    },
  ],
  related: [
    { to: "/devis-interactif-artisan", label: "Devis interactif pour artisan" },
    { to: "/comment-presenter-un-devis", label: "Comment présenter un devis" },
    {
      to: "/client-ne-repond-pas-au-devis",
      label: "Votre client ne répond pas au devis ?",
    },
  ],
};

export default function Page() {
  return <GuidePage data={data} />;
}
