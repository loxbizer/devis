/**
 * Calcul du prix total d'une proposition côté client final.
 * Fonction pure, testée unitairement, utilisée à la fois par la page
 * publique (affichage) et par le serveur (validation d'une acceptation).
 */

export interface PricingPackage {
  id: string;
  priceCents: number;
}

export interface PricingOption {
  id: string;
  priceCents: number;
}

export interface PricingSelection {
  packageId: string | null;
  optionIds: string[];
}

export interface PricingResult {
  packageCents: number;
  optionsCents: number;
  totalCents: number;
}

/**
 * Calcule le total à partir de la sélection. Les identifiants inconnus sont
 * ignorés (ils ne doivent jamais faire crédit ou débit silencieux).
 */
export function computeTotal(
  packages: PricingPackage[],
  options: PricingOption[],
  selection: PricingSelection,
): PricingResult {
  const selectedPackage = packages.find((p) => p.id === selection.packageId);
  const packageCents = selectedPackage?.priceCents ?? 0;

  const uniqueOptionIds = [...new Set(selection.optionIds)];
  const optionsCents = uniqueOptionIds.reduce((sum, id) => {
    const option = options.find((o) => o.id === id);
    return sum + (option?.priceCents ?? 0);
  }, 0);

  return {
    packageCents,
    optionsCents,
    totalCents: packageCents + optionsCents,
  };
}
