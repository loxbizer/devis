import { GuidePage, type GuideData } from "~/components/marketing/guide-page";
import type { Route } from "./+types/devis-interactif-climatisation";

export const meta: Route.MetaFunction = () => [
  { title: "Devis interactif climatisation : vendre le confort, pas des BTU" },
  {
    name: "description",
    content:
      "Un devis de climatisation aligne des références techniques que le client ne comprend pas. Comment un devis interactif aide un installateur à vendre le confort et le sérieux.",
  },
];

const data: GuideData = {
  title: "Devis interactif climatisation : vendre le confort, pas des BTU",
  intro:
    "Unité extérieure, splits, kW frigorifiques, SEER, liaisons frigorifiques… Le devis de climatisation est l'un des plus techniques du bâtiment, alors que la motivation du client est simple : dormir au frais en août et payer moins de chauffage en janvier. Un devis interactif permet de parler les deux langues à la fois.",
  sections: [
    {
      heading: "Traduire la technique en bénéfices",
      paragraphs: [
        "Gardez la précision technique (elle est contractuelle et rassure les connaisseurs), mais ajoutez pour chaque poste une phrase de traduction : « Unité Daikin multisplit 3 sorties » devient aussi « trois pièces climatisées indépendamment, chacune avec sa télécommande ».",
        "Sur une page interactive, cette double lecture est naturelle : le nom technique en titre, l'explication en dessous, la fiche du fabricant en pièce jointe si besoin.",
      ],
    },
    {
      heading: "Les formules qui fonctionnent en climatisation",
      paragraphs: [
        "Le choix type d'un foyer porte sur le nombre de pièces et la performance :",
      ],
      list: [
        "Essentielle : monosplit séjour — le confort là où on vit.",
        "Recommandée : multisplit séjour + 2 chambres — les nuits d'été réglées.",
        "Sérénité : gainable ou multisplit complet + contrat d'entretien — la maison entière, sans y penser.",
      ],
    },
    {
      heading: "Anticiper les questions qui bloquent la signature",
      paragraphs: [
        "En climatisation, trois questions reviennent systématiquement : « c'est bruyant ? », « ça consomme combien ? », « où passe la liaison sur ma façade ? ». Si le devis n'y répond pas, le client attend — souvent sans oser demander.",
        "Une section FAQ intégrée au devis y répond une fois pour toutes : niveau sonore en dB comparé à un lave-vaisselle, ordre de grandeur de consommation, photo d'une goulotte posée proprement. La question posée directement depuis la page couvre le reste.",
      ],
    },
    {
      heading: "La saison joue contre vous : soignez la relance",
      paragraphs: [
        "Les demandes explosent à la première canicule, et les devis se périment vite : le client compare trois installateurs en une semaine. Savoir que votre proposition a été ouverte mardi soir et la formule multisplit comparée deux fois vous permet d'appeler mercredi — pas la semaine suivante, quand le concurrent a signé.",
      ],
    },
  ],
  example: {
    heading: "Exemple : pavillon de 95 m²",
    text: [
      "Un installateur propose trois formules (monosplit 2 490 €, multisplit 3 pièces 5 890 €, gainable 9 900 €) avec en option le contrat d'entretien annuel et la goulotte peinte à la couleur de la façade. Le client coche les options, voit le total en direct, pose une question sur le niveau sonore et accepte la formule multisplit le soir même.",
    ],
  },
  faq: [
    {
      q: "Puis-je mettre les fiches techniques des unités ?",
      a: "Oui : le PDF original du devis reste joint, et les caractéristiques importantes (marque, modèle, classe énergétique, niveau sonore) ont leur place dans le détail des prestations.",
    },
    {
      q: "Comment gérer les aides (MaPrimeRénov', CEE) dans le devis ?",
      a: "Indiquez-les dans le résumé et les conditions, avec les montants estimés et la mention « sous réserve d'éligibilité ». Ne promettez jamais un reste à charge garanti.",
    },
    {
      q: "Le client peut-il accepter puis régler un acompte ?",
      a: "Oui : après acceptation, la page propose votre lien de paiement Stripe ou vos coordonnées de virement. L'argent va directement sur votre compte.",
    },
  ],
  related: [
    { to: "/devis-interactif-artisan", label: "Devis interactif pour artisan" },
    { to: "/suivi-ouverture-devis", label: "Suivi d'ouverture de devis" },
    { to: "/comment-presenter-un-devis", label: "Comment présenter un devis" },
  ],
};

export default function Page() {
  return <GuidePage data={data} />;
}
