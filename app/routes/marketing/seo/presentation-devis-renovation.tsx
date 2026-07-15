import { GuidePage, type GuideData } from "~/components/marketing/guide-page";
import type { Route } from "./+types/presentation-devis-renovation";

export const meta: Route.MetaFunction = () => [
  { title: "Présenter un devis de rénovation : la méthode qui rassure" },
  {
    name: "description",
    content:
      "Un devis de rénovation se joue autant sur la présentation que sur le prix. Structure conseillée, erreurs à éviter et exemple concret pour rassurer vos clients.",
  },
];

const data: GuideData = {
  title: "Présenter un devis de rénovation : la méthode qui rassure",
  intro:
    "Une rénovation représente souvent des dizaines de milliers d'euros pour une famille qui n'a aucun repère technique. Le devis le mieux présenté n'est pas celui qui paraît le moins cher : c'est celui qui fait dire « avec eux, on sait où on va ». Voici une structure qui a fait ses preuves.",
  sections: [
    {
      heading: "La structure d'un devis de rénovation qui rassure",
      paragraphs: [
        "L'ordre de lecture compte plus que la quantité d'informations. Commencez par le contexte humain, terminez par l'engagement :",
      ],
      list: [
        "Un mot personnel : rappelez la visite, les contraintes évoquées, ce qui compte pour ce client.",
        "Le résumé du projet en langage simple : ce qui sera fait, pourquoi, avec quel résultat.",
        "Les prestations détaillées, chacune expliquée en une phrase compréhensible.",
        "Les photos : l'existant, et surtout des chantiers comparables terminés.",
        "Les étapes et le calendrier : qui vient, quand, combien de temps.",
        "Les garanties : décennale, biennale, parfait achèvement — avec les mots simples.",
        "Le prix, en dernier, une fois que la valeur est établie.",
      ],
    },
    {
      heading: "Les trois erreurs qui font fuir",
      paragraphs: [
        "Première erreur : le jargon sans traduction. « Reprise des solins et abergements » ne dit rien à un particulier ; « refaire l'étanchéité autour de la cheminée » si.",
        "Deuxième erreur : le prix unique à prendre ou à laisser. Proposer deux ou trois formules transforme un « oui/non » en « laquelle ? » — et montre que vous vous êtes adapté au budget.",
        "Troisième erreur : l'absence de suite prévue. Un devis sans étapes ni délais laisse imaginer un chantier sans fin. Un calendrier même approximatif rassure énormément.",
      ],
    },
    {
      heading: "Le support de présentation compte aussi",
      paragraphs: [
        "80 % des devis de particuliers sont d'abord ouverts sur téléphone. Un PDF de six pages y est illisible. Présenter le même contenu sous forme de page web privée — résumé, photos, formules comparables, FAQ — change la perception avant même la lecture du prix.",
        "C'est exactement ce que fait DevisRoom : vous gardez votre logiciel de devis, vous importez le PDF, et vous envoyez un lien privé mis en page proprement.",
      ],
    },
  ],
  example: {
    heading: "Exemple : rénovation de toiture en trois formules",
    text: [
      "Pour une toiture de 120 m², présenter « Essentielle » (réparation et étanchéité, 7 900 €), « Recommandée » (rénovation complète avec écran sous-toiture, 10 900 €) et « Sérénité » (isolation renforcée et gouttières neuves, 13 900 €) permet au client de se situer. La majorité choisit la formule du milieu — celle que vous recommandez.",
    ],
  },
  faq: [
    {
      q: "Faut-il détailler tous les prix ligne par ligne ?",
      a: "Détaillez les prestations, mais un sous-total par grande phase suffit souvent. Trop de micro-lignes invite à négocier chaque vis ; des blocs cohérents recentrent la discussion sur le projet.",
    },
    {
      q: "Combien de formules proposer ?",
      a: "Deux ou trois. Au-delà, le client se perd. La formule du milieu, marquée « Recommandée », sert d'ancre de décision.",
    },
    {
      q: "Comment gérer les demandes de modification ?",
      a: "Prévoyez un canal explicite. Sur une page DevisRoom, le client clique sur « Demander une modification » et écrit ce qu'il veut changer : vous recevez la demande, vous ajustez, vous republiez la même page.",
    },
  ],
  related: [
    {
      to: "/comment-presenter-un-devis",
      label: "Comment présenter un devis (guide général)",
    },
    { to: "/devis-interactif-artisan", label: "Devis interactif pour artisan" },
    {
      to: "/client-ne-repond-pas-au-devis",
      label: "Votre client ne répond pas au devis ?",
    },
  ],
};

export default function Page() {
  return <GuidePage data={data} />;
}
