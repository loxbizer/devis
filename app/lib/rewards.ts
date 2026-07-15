/**
 * Programme de récompenses DevisRoom — façon « miles ».
 * Ludique et sans pression : les points se gagnent en utilisant l'outil
 * normalement, et s'échangent contre des petits plus. Jamais de compte à
 * rebours, jamais de points qui expirent, jamais de relance commerciale.
 */

export interface EarnRule {
  reason: string;
  points: number;
  label: string;
  description: string;
}

export const EARN_RULES = {
  onboarding_done: {
    reason: "onboarding_done",
    points: 50,
    label: "Bienvenue à bord",
    description: "Terminer la configuration de votre entreprise.",
  },
  proposal_published: {
    reason: "proposal_published",
    points: 20,
    label: "DevisRoom publiée",
    description: "Première publication d'un devis (une fois par devis).",
  },
  first_view: {
    reason: "first_view",
    points: 10,
    label: "Devis consulté",
    description: "Votre client ouvre son devis pour la première fois.",
  },
  proposal_accepted: {
    reason: "proposal_accepted",
    points: 100,
    label: "Devis accepté 🎉",
    description: "Un client accepte votre proposition.",
  },
  deposit_started: {
    reason: "deposit_started",
    points: 30,
    label: "Acompte déclenché",
    description: "Votre client lance le paiement de l'acompte.",
  },
} as const satisfies Record<string, EarnRule>;

export type EarnReason = keyof typeof EARN_RULES;

export interface RewardItem {
  id: string;
  cost: number;
  label: string;
  description: string;
  kind: "badge" | "discount";
  /** Pour les réductions : pourcentage appliqué une fois sur la facture suivante. */
  percentOff?: number;
  /** Peut être échangé plusieurs fois ? */
  repeatable: boolean;
}

export const REWARD_CATALOG: RewardItem[] = [
  {
    id: "badge_certified",
    cost: 300,
    label: "Badge « Certifié »",
    description:
      "Un badge bleu « Entreprise certifiée » affiché en permanence sur toutes vos pages de devis. Débloqué une fois, gardé pour toujours.",
    kind: "badge",
    repeatable: false,
  },
  {
    id: "discount_20",
    cost: 600,
    label: "−20 % sur votre prochaine facture",
    description:
      "Une réduction de 20 % appliquée une fois sur la prochaine échéance de votre abonnement payant.",
    kind: "discount",
    percentOff: 20,
    repeatable: true,
  },
  {
    id: "discount_50",
    cost: 1200,
    label: "−50 % sur votre prochaine facture",
    description:
      "La grosse récompense : moitié prix sur la prochaine échéance de votre abonnement payant.",
    kind: "discount",
    percentOff: 50,
    repeatable: true,
  },
];

export interface RewardLevel {
  name: string;
  minLifetime: number;
  emoji: string;
}

/** Niveaux basés sur le total de points gagnés (jamais décomptés). */
export const REWARD_LEVELS: RewardLevel[] = [
  { name: "Bronze", minLifetime: 0, emoji: "🥉" },
  { name: "Argent", minLifetime: 300, emoji: "🥈" },
  { name: "Or", minLifetime: 1000, emoji: "🥇" },
  { name: "Platine", minLifetime: 2500, emoji: "💎" },
];

export function getLevel(lifetimePoints: number): RewardLevel {
  let current = REWARD_LEVELS[0];
  for (const level of REWARD_LEVELS) {
    if (lifetimePoints >= level.minLifetime) current = level;
  }
  return current;
}

export function getNextLevel(lifetimePoints: number): RewardLevel | null {
  return REWARD_LEVELS.find((l) => l.minLifetime > lifetimePoints) ?? null;
}

/** Badge affiché sur les pages publiques. */
export type OrgBadge = "none" | "certified" | "gold";

/**
 * Le badge Or est offert avec les plans Pro et Équipe ; le badge bleu
 * s'obtient avec des points. L'Or (payant) prime sur le bleu.
 */
export function computeBadge(
  storedBadge: "none" | "certified",
  planId: string,
): OrgBadge {
  if (planId === "pro" || planId === "team") return "gold";
  return storedBadge === "certified" ? "certified" : "none";
}
