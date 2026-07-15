import { GuidePage, type GuideData } from "~/components/marketing/guide-page";
import type { Route } from "./+types/comment-presenter-un-devis";

export const meta: Route.MetaFunction = () => [
  { title: "Comment présenter un devis : le guide complet pour artisans" },
  {
    name: "description",
    content:
      "Contenu, ordre des sections, formules, envoi et relance : le guide complet pour présenter un devis professionnel qui aide votre client à décider.",
  },
];

const data: GuideData = {
  title: "Comment présenter un devis : le guide complet",
  intro:
    "Deux artisans également compétents, deux devis au même prix : celui qui est bien présenté part avec une longueur d'avance. La présentation d'un devis n'est ni de la décoration ni du marketing agressif — c'est rendre la décision facile pour quelqu'un qui n'est pas du métier. Voici le guide complet, de la structure à la relance.",
  sections: [
    {
      heading: "1. Le fond : ce que le devis doit contenir",
      paragraphs: [
        "Au-delà des mentions obligatoires (identité, date, validité, prix HT/TTC, conditions), un devis qui aide à décider contient :",
      ],
      list: [
        "Un titre de projet parlant : « Rénovation salle de bain — remplacement baignoire par douche » plutôt que « Devis n°2026-041 ».",
        "Un résumé de 3-4 phrases : le besoin, la solution, le résultat.",
        "Des prestations traduites : chaque ligne technique doublée d'une explication simple.",
        "Les étapes et une fourchette de dates : qui vient, quand, combien de temps.",
        "Les garanties applicables, expliquées avec des mots courants.",
        "La suite concrète : comment accepter, quel acompte, quel délai de démarrage.",
      ],
    },
    {
      heading: "2. La forme : hiérarchie et lisibilité",
      paragraphs: [
        "La règle d'or : votre client lira d'abord sur téléphone. Titres courts, paragraphes de trois lignes maximum, une idée par section. Le prix arrive après la valeur (résumé, photos, étapes), jamais en première ligne.",
        "Les photos font la différence : l'existant photographié pendant votre visite prouve que le devis répond à ce chantier précis ; les chantiers terminés comparables prouvent que vous savez faire.",
      ],
    },
    {
      heading: "3. Les formules : transformer « oui/non » en « laquelle »",
      paragraphs: [
        "Un prix unique déclenche une réponse binaire — et souvent une demande de remise. Deux ou trois formules (essentielle / recommandée / confort) déplacent la question vers « quelle version de ce projet je choisis ». Marquez celle que vous recommandez : la plupart des clients la suivent.",
        "Ajoutez des options claires à cocher (souvent acceptées quand elles sont visibles et chiffrées) plutôt que des « suppléments possibles » en petites lignes.",
      ],
    },
    {
      heading: "4. L'envoi : le support compte autant que le contenu",
      paragraphs: [
        "Le PDF reste le document contractuel — gardez-le. Mais pour la lecture et la décision, une page web privée est incomparablement plus efficace : lisible sur mobile, photos en galerie, formules côte à côte, questions posées directement, acceptation en ligne.",
        "C'est le principe de DevisRoom : vous importez votre PDF habituel, la page se pré-remplit, vous complétez, vous envoyez un lien privé. Le PDF original reste téléchargeable sur la page.",
      ],
    },
    {
      heading: "5. La relance : au bon moment, avec un prétexte utile",
      paragraphs: [
        "Relancez après la première consultation du devis (pas avant : le client n'a rien à vous dire), avec une question ouverte plutôt qu'une demande de décision : « Est-ce que les étapes vous paraissent claires ? ». Une seconde relance une semaine plus tard, puis une dernière avant expiration du devis, suffisent.",
      ],
    },
  ],
  example: {
    heading: "Exemple complet en démonstration",
    text: [
      "Nous avons construit une démonstration publique complète : un devis de rénovation de toiture présenté en page privée, avec résumé, trois formules, photos, étapes, garanties, FAQ et acceptation en ligne. Parcourez-la comme si vous étiez le client.",
    ],
  },
  faq: [
    {
      q: "Quelle durée de validité indiquer ?",
      a: "30 à 60 jours selon la volatilité de vos prix matériaux. Une validité affichée crée une échéance naturelle pour la décision — et un prétexte légitime pour la dernière relance.",
    },
    {
      q: "Faut-il envoyer le devis par e-mail ou SMS ?",
      a: "Les deux : e-mail pour la trace écrite et le PDF, SMS avec le lien de la page pour la lecture immédiate. Les SMS sont ouverts en quelques minutes, les e-mails parfois jamais.",
    },
    {
      q: "Comment annoncer le prix en visite sans tout dévoiler ?",
      a: "Donnez une fourchette honnête en fin de visite (« ce type de chantier se situe entre X et Y selon les finitions ») puis envoyez le devis détaillé sous 48 h. La fourchette évite le choc du montant ; le délai court montre le sérieux.",
    },
  ],
  related: [
    {
      to: "/presentation-devis-renovation",
      label: "Présenter un devis de rénovation",
    },
    { to: "/devis-interactif-artisan", label: "Devis interactif pour artisan" },
    { to: "/suivi-ouverture-devis", label: "Suivi d'ouverture de devis" },
  ],
};

export default function Page() {
  return <GuidePage data={data} />;
}
