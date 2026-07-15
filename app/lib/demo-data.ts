import type { PublicProposalVM } from "./proposal-vm";

/**
 * Données de la démonstration publique — entreprise et devis entièrement
 * fictifs, affichés avec une bannière « démonstration » permanente.
 */
export const DEMO_PROPOSAL_VM: PublicProposalVM = {
  slug: null,
  isDemo: true,
  branding: "discreet",
  organization: {
    name: "Horizon Toiture",
    profession: "Couverture & rénovation de toiture",
    phone: "01 23 45 67 89",
    email: "contact@horizon-toiture.example",
    address: "12 rue des Ardoisiers",
    postalCode: "44000",
    city: "Nantes",
    website: null,
    logoUrl: null,
    primaryColor: "#b45309",
  },
  proposal: {
    title: "Rénovation complète de la toiture de la maison Martin",
    clientName: "M. et Mme Martin",
    message:
      "Bonjour,\n\nSuite à notre visite du 3 juillet, voici notre proposition détaillée pour la rénovation de votre toiture. Nous avons prévu trois formules pour nous adapter à votre budget. N'hésitez pas à nous poser vos questions directement depuis cette page.\n\nBien cordialement,\nJulien Perrot, gérant",
    summary:
      "Votre toiture en ardoise de 120 m² présente des ardoises cassées, des solins fatigués et une ventilation insuffisante. Nous proposons une rénovation permettant d'assurer l'étanchéité durable de la maison, avec plusieurs niveaux d'intervention selon vos priorités.",
    terms:
      "Devis valable 45 jours. Acompte de 30 % à la commande, solde à la réception des travaux. Travaux réalisés selon les DTU en vigueur. Assurance décennale AXA n° 000000 (exemple fictif).",
    totalAmountCents: 1090000,
    version: 1,
    expiresAt: null,
    acceptedAt: null,
    depositEnabled: true,
    depositMode: "stripe_link",
    depositAmountCents: 327000,
    pdfUrl: null,
  },
  deposit: {
    stripePaymentLink: "https://buy.stripe.com/exemple-fictif",
    bankTransferDetails: null,
  },
  sections: [
    {
      id: "demo-services",
      type: "services",
      title: "Prestations prévues",
      content: {
        items: [
          {
            name: "Dépose et tri des ardoises existantes",
            description:
              "Retrait complet de la couverture actuelle, tri des ardoises réutilisables et évacuation des gravats en déchetterie agréée.",
          },
          {
            name: "Vérification et traitement de la charpente",
            description:
              "Contrôle visuel de l'ensemble des pièces de charpente et traitement préventif contre les insectes xylophages.",
          },
          {
            name: "Pose de la nouvelle couverture en ardoise naturelle",
            description:
              "Ardoise d'Espagne première qualité, fixation au crochet inox, faîtage à sec ventilé.",
          },
          {
            name: "Zinguerie",
            description:
              "Remplacement des solins, noquets et abergements de cheminée en zinc naturel.",
          },
        ],
      },
    },
    {
      id: "demo-steps",
      type: "steps",
      title: "Étapes du chantier",
      content: {
        items: [
          {
            title: "Installation du chantier",
            description:
              "Échafaudage, protection des abords, mise en sécurité.",
          },
          {
            title: "Dépose de la couverture",
            description: "2 jours — la maison reste hors d'eau chaque soir.",
          },
          {
            title: "Reprise de charpente et écran sous-toiture",
            description: "Selon la formule retenue.",
          },
          {
            title: "Pose de la nouvelle couverture",
            description: "5 à 7 jours selon la météo.",
          },
          {
            title: "Zinguerie et finitions",
            description: "Solins, gouttières, nettoyage complet du chantier.",
          },
          {
            title: "Réception des travaux",
            description:
              "Visite de contrôle avec vous et remise des documents de garantie.",
          },
        ],
      },
    },
    {
      id: "demo-timeline",
      type: "timeline",
      title: "Délais",
      content: {
        items: [
          {
            label: "Démarrage possible",
            value: "Sous 6 semaines après acceptation",
          },
          { label: "Durée du chantier", value: "2 semaines environ" },
          { label: "Validité de la proposition", value: "45 jours" },
        ],
      },
    },
    {
      id: "demo-guarantees",
      type: "guarantees",
      title: "Garanties",
      content: {
        items: [
          {
            title: "Garantie décennale",
            description:
              "Couverture et étanchéité assurées 10 ans (attestation fournie).",
          },
          {
            title: "Garantie biennale",
            description: "Éléments d'équipement (gouttières, ventilation).",
          },
          {
            title: "Parfait achèvement",
            description: "Reprise de tout désordre signalé pendant 1 an.",
          },
        ],
      },
    },
    {
      id: "demo-faq",
      type: "faq",
      title: "Questions fréquentes",
      content: {
        items: [
          {
            question: "Devons-nous quitter la maison pendant les travaux ?",
            answer:
              "Non. La maison reste habitable et hors d'eau chaque soir. Seuls les accès extérieurs côté rue seront ponctuellement condamnés.",
          },
          {
            question: "Que se passe-t-il en cas de pluie ?",
            answer:
              "Le chantier est bâché quotidiennement. En cas d'intempéries prolongées, le planning est décalé sans surcoût.",
          },
          {
            question: "Les ardoises actuelles peuvent-elles être réutilisées ?",
            answer:
              "Environ 30 % des ardoises sont réutilisables. Nous les intégrons sur les pans les moins exposés pour réduire le coût, uniquement dans la formule Essentielle.",
          },
          {
            question: "L'acompte est-il remboursable ?",
            answer:
              "Oui, intégralement, tant que le chantier n'a pas démarré et dans les conditions prévues au devis.",
          },
        ],
      },
    },
  ],
  packages: [
    {
      id: "demo-essentielle",
      name: "Essentielle",
      description:
        "L'intervention indispensable pour remettre la toiture en état.",
      priceCents: 790000,
      features: [
        "Remplacement des éléments endommagés",
        "Nettoyage complet de la couverture",
        "Étanchéité principale refaite",
      ],
      isRecommended: false,
    },
    {
      id: "demo-recommandee",
      name: "Recommandée",
      description:
        "Le meilleur équilibre durabilité / budget pour votre maison.",
      priceCents: 1090000,
      features: [
        "Rénovation complète de la couverture",
        "Écran sous-toiture HPV",
        "Isolation partielle des rampants",
        "Garantie renforcée",
      ],
      isRecommended: true,
    },
    {
      id: "demo-serenite",
      name: "Sérénité",
      description:
        "La rénovation la plus complète, sans rien à prévoir ensuite.",
      priceCents: 1390000,
      features: [
        "Rénovation complète de la couverture",
        "Isolation supérieure (R ≥ 6)",
        "Gouttières neuves en zinc",
        "Entretien annuel inclus pendant 3 ans",
      ],
      isRecommended: false,
    },
  ],
  options: [
    {
      id: "demo-opt-velux",
      name: "Remplacement de la fenêtre de toit",
      description:
        "Fourniture et pose d'une fenêtre de toit rotation 78×98 avec volet.",
      priceCents: 185000,
    },
    {
      id: "demo-opt-antimousse",
      name: "Traitement anti-mousse longue durée",
      description:
        "Application d'un traitement hydrofuge coloré sur toute la couverture.",
      priceCents: 68000,
    },
  ],
  images: [],
};
