/**
 * Modèle de vue sérialisable de la page publique d'une proposition.
 * N'expose QUE les données nécessaires au client final — jamais les
 * identifiants internes de l'organisation ni les statistiques.
 */

export interface PublicSection {
  id: string;
  type: "services" | "steps" | "timeline" | "guarantees" | "faq" | "custom";
  title: string;
  content: unknown;
}

export interface PublicPackage {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  features: string[];
  isRecommended: boolean;
}

export interface PublicOption {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
}

export interface PublicProposalVM {
  slug: string | null; // null = démonstration (actions simulées)
  organization: {
    name: string;
    profession: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    postalCode: string | null;
    city: string | null;
    website: string | null;
    logoUrl: string | null;
    primaryColor: string;
  };
  proposal: {
    title: string;
    clientName: string;
    message: string | null;
    summary: string | null;
    terms: string | null;
    totalAmountCents: number;
    version: number;
    expiresAt: string | null;
    acceptedAt: string | null;
    depositEnabled: boolean;
    depositMode: "stripe_link" | "bank_transfer" | null;
    depositAmountCents: number | null;
    pdfUrl: string | null;
  };
  deposit: {
    stripePaymentLink: string | null;
    bankTransferDetails: string | null;
  };
  sections: PublicSection[];
  packages: PublicPackage[];
  options: PublicOption[];
  images: { id: string; url: string; filename: string }[];
  branding: "full" | "discreet" | "none";
  isDemo: boolean;
}
