/**
 * Plans d'abonnement DevisRoom et limites d'usage associées.
 * Module partagé client/serveur — aucune dépendance Cloudflare.
 */

export type PlanId = "free" | "solo" | "pro" | "team";
export type BillingInterval = "monthly" | "yearly";

export interface PlanLimits {
  /** Nombre maximal de propositions actives (publiées, non archivées). */
  maxActiveProposals: number;
  /** Stockage total autorisé, en octets. */
  maxStorageBytes: number;
  /** Nombre maximal d'utilisateurs dans l'organisation. */
  maxUsers: number;
  /** Marque DevisRoom affichée sur les pages clients. */
  branding: "full" | "discreet" | "none";
  /** Paiement d'acompte (lien Stripe / virement) disponible. */
  deposit: boolean;
  /** Variantes (offres multiples) disponibles. */
  variants: boolean;
  /** Options supplémentaires sélectionnables par le client. */
  options: boolean;
  /** Duplication de proposition. */
  duplicate: boolean;
  /** Statistiques : simple = vues uniquement, full = tout. */
  stats: "views" | "standard" | "full";
  /** Durée de validité maximale d'une proposition, en jours (null = libre). */
  maxExpiryDays: number | null;
  /** Export des données. */
  export: boolean;
}

export interface Plan {
  id: PlanId;
  name: string;
  monthlyPriceCents: number;
  yearlyPriceCents: number;
  description: string;
  highlighted: boolean;
  features: string[];
  limits: PlanLimits;
}

const GB = 1024 * 1024 * 1024;
const MB = 1024 * 1024;

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Gratuit",
    monthlyPriceCents: 0,
    yearlyPriceCents: 0,
    description: "Pour découvrir DevisRoom avec vos premiers devis.",
    highlighted: false,
    features: [
      "3 DevisRooms actives",
      "500 Mo de fichiers",
      "Statistiques de consultation simples",
      "Marque DevisRoom visible",
      "Expiration maximale de 30 jours",
    ],
    limits: {
      maxActiveProposals: 3,
      maxStorageBytes: 500 * MB,
      maxUsers: 1,
      branding: "full",
      deposit: false,
      variants: false,
      options: false,
      duplicate: false,
      stats: "views",
      maxExpiryDays: 30,
      export: false,
    },
  },
  solo: {
    id: "solo",
    name: "Solo",
    monthlyPriceCents: 990,
    yearlyPriceCents: 9900,
    description:
      "Pour l'artisan indépendant qui envoie des devis chaque semaine.",
    highlighted: false,
    features: [
      "20 DevisRooms actives",
      "2 Go de fichiers",
      "Paiement d'acompte (lien Stripe ou virement)",
      "Options supplémentaires",
      "Duplication de devis",
      "Marque DevisRoom discrète",
      "Statistiques standard",
    ],
    limits: {
      maxActiveProposals: 20,
      maxStorageBytes: 2 * GB,
      maxUsers: 1,
      branding: "discreet",
      deposit: true,
      variants: false,
      options: true,
      duplicate: true,
      stats: "standard",
      maxExpiryDays: null,
      export: false,
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    monthlyPriceCents: 1990,
    yearlyPriceCents: 19900,
    description:
      "Pour l'entreprise qui veut des pages à sa marque et le suivi complet.",
    highlighted: true,
    features: [
      "DevisRooms actives illimitées*",
      "5 Go de fichiers",
      "Variantes d'offres (jusqu'à 3 formules)",
      "Retrait total de la marque DevisRoom",
      "Statistiques complètes",
      "Page personnalisée à vos couleurs",
      "Export des données",
    ],
    limits: {
      // « Illimité » avec une limite raisonnable d'usage anti-abus.
      maxActiveProposals: 500,
      maxStorageBytes: 5 * GB,
      maxUsers: 1,
      branding: "none",
      deposit: true,
      variants: true,
      options: true,
      duplicate: true,
      stats: "full",
      maxExpiryDays: null,
      export: true,
    },
  },
  team: {
    id: "team",
    name: "Équipe",
    monthlyPriceCents: 3990,
    yearlyPriceCents: 39900,
    description: "Pour les équipes commerciales avec plusieurs utilisateurs.",
    highlighted: false,
    features: [
      "Jusqu'à 5 utilisateurs",
      "10 Go de fichiers",
      "Rôles et permissions",
      "Statistiques par utilisateur",
      "Tout le plan Pro inclus",
      "Priorité au support",
    ],
    limits: {
      maxActiveProposals: 1000,
      maxStorageBytes: 10 * GB,
      maxUsers: 5,
      branding: "none",
      deposit: true,
      variants: true,
      options: true,
      duplicate: true,
      stats: "full",
      maxExpiryDays: null,
      export: true,
    },
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "solo", "pro", "team"];

export function getPlan(id: string | null | undefined): Plan {
  if (id && id in PLANS) return PLANS[id as PlanId];
  return PLANS.free;
}

/** Limites de fichiers, indépendantes du plan. */
export const FILE_LIMITS = {
  maxPdfBytes: 15 * MB,
  maxImageBytes: 8 * MB,
  maxImagesPerProposal: 20,
  allowedMimeTypes: [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
  ] as const,
};

export const PROFESSIONS = [
  "Couvreur",
  "Rénovation",
  "Climatisation / chauffage",
  "Menuisier",
  "Paysagiste",
  "Pisciniste",
  "Cuisiniste",
  "Peintre",
  "Électricien",
  "Plombier",
  "Autre",
] as const;
