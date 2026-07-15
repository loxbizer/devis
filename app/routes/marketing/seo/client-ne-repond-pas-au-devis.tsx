import { GuidePage, type GuideData } from "~/components/marketing/guide-page";
import type { Route } from "./+types/client-ne-repond-pas-au-devis";

export const meta: Route.MetaFunction = () => [
  { title: "Client qui ne répond pas au devis : que faire (et ne pas faire)" },
  {
    name: "description",
    content:
      "Silence radio après l'envoi d'un devis ? Les vraies raisons du non-retour, le calendrier de relance qui fonctionne et les erreurs qui enterrent définitivement le dossier.",
  },
];

const data: GuideData = {
  title: "Votre client ne répond pas au devis : que faire (et ne pas faire)",
  intro:
    "Vous avez fait la visite, passé une heure sur le chiffrage, envoyé le devis… silence. Ce silence est rarement un refus : c'est le plus souvent un devis non lu, mal compris ou en attente d'un troisième avis. Voici comment débloquer la situation sans passer pour un vendeur insistant.",
  sections: [
    {
      heading: "Pourquoi les clients ne répondent pas (vraiment)",
      paragraphs: [
        "Dans la grande majorité des cas, le silence a une cause banale :",
      ],
      list: [
        "Le devis n'a jamais été ouvert : e-mail en spam, pièce jointe qui ne s'ouvre pas sur téléphone.",
        "Le devis a été ouvert mais pas compris : jargon, tableau illisible sur mobile, prix sans contexte.",
        "Le client attend un autre devis pour comparer — le vôtre est en concurrence silencieuse.",
        "Une question bloque (« et si on trouve de l'amiante ? ») mais il n'ose pas la poser.",
        "La décision est différée : budget, conjoint, banque. Le projet n'est pas mort, il est en pause.",
      ],
    },
    {
      heading: "Le calendrier de relance qui fonctionne",
      paragraphs: [
        "J+2 après l'envoi : un SMS court — « Bonjour, avez-vous bien reçu la proposition ? N'hésitez pas si un point mérite d'être précisé. » C'est une vérification de réception, pas une pression.",
        "J+7 : un appel avec une question ouverte sur le contenu (« les étapes vous paraissent-elles claires ? »), jamais « alors, vous vous décidez ? ».",
        "J+20 (ou une semaine avant expiration) : la relance d'échéance — « la proposition reste valable jusqu'au 30 ; après cette date je devrai réviser les prix matériaux ». Factuel et vrai.",
        "Au-delà : un dernier message qui laisse la porte ouverte, puis on classe. Un dossier classé proprement peut revenir six mois plus tard.",
      ],
    },
    {
      heading: "Les erreurs qui enterrent le dossier",
      paragraphs: [
        "Relancer tous les deux jours (vous devenez un spam), baisser le prix spontanément (vous dévaluez votre première proposition et inquiétez sur vos marges), culpabiliser le client (« j'ai bloqué mon planning pour vous »), ou tout arrêter après une seule tentative — la moitié des chantiers se signent après la deuxième relance.",
      ],
    },
    {
      heading: "Mieux : rendre le silence moins probable dès l'envoi",
      paragraphs: [
        "Le meilleur traitement du silence est préventif. Un devis envoyé comme page web privée règle les causes n°1 et n°2 : il s'ouvre d'un tap depuis un SMS, se lit confortablement sur mobile, et le client peut poser sa question bloquante directement sous la proposition.",
        "Vous savez en plus s'il a été consulté : votre J+2 devient « appeler ceux qui n'ont pas ouvert, laisser respirer ceux qui relisent ». La relance cesse d'être aveugle.",
      ],
    },
  ],
  example: {
    heading: "Exemple : le devis débloqué par une question",
    text: [
      "Un plombier envoie une proposition de salle de bain à 8 400 €. Silence pendant cinq jours — mais le suivi montre trois consultations. Au téléphone, la cliente avoue son blocage : la durée des travaux. La réponse (« 8 jours ouvrés, eau coupée seulement 2 demi-journées ») était dans le devis… en page 3 du PDF. Sur la page DevisRoom, la question aurait été posée dès le premier soir — ou la section « étapes » l'aurait désamorcée.",
    ],
  },
  faq: [
    {
      q: "Combien de relances avant d'abandonner ?",
      a: "Trois relances espacées (J+2, J+7, avant expiration) puis un message de clôture courtois. Au-delà, le rapport gêne/bénéfice s'inverse.",
    },
    {
      q: "Le client a ouvert le devis plusieurs fois mais ne répond pas : bon ou mauvais signe ?",
      a: "Plutôt bon : on ne relit pas un devis qu'on a écarté. C'est le moment d'un appel avec une question ouverte — il y a probablement un point à clarifier ou une comparaison en cours.",
    },
    {
      q: "Dois-je proposer une remise pour débloquer ?",
      a: "Pas spontanément. Si le budget est le vrai blocage, proposez plutôt une formule réduite (moins de prestations, prix plus bas) : vous protégez votre marge et votre crédibilité.",
    },
  ],
  related: [
    { to: "/suivi-ouverture-devis", label: "Suivi d'ouverture de devis" },
    { to: "/comment-presenter-un-devis", label: "Comment présenter un devis" },
    { to: "/devis-interactif-artisan", label: "Devis interactif pour artisan" },
  ],
};

export default function Page() {
  return <GuidePage data={data} />;
}
