import { describe, expect, it } from "vitest";
import { computeTotal } from "~/lib/pricing";

const packages = [
  { id: "p1", priceCents: 790000 },
  { id: "p2", priceCents: 1090000 },
];
const options = [
  { id: "o1", priceCents: 185000 },
  { id: "o2", priceCents: 68000 },
];

describe("computeTotal", () => {
  it("calcule le prix d'une formule seule", () => {
    const result = computeTotal(packages, options, {
      packageId: "p2",
      optionIds: [],
    });
    expect(result.totalCents).toBe(1090000);
    expect(result.packageCents).toBe(1090000);
    expect(result.optionsCents).toBe(0);
  });

  it("additionne les options sélectionnées", () => {
    const result = computeTotal(packages, options, {
      packageId: "p1",
      optionIds: ["o1", "o2"],
    });
    expect(result.totalCents).toBe(790000 + 185000 + 68000);
  });

  it("ignore les identifiants inconnus (aucun crédit silencieux)", () => {
    const result = computeTotal(packages, options, {
      packageId: "inexistant",
      optionIds: ["o1", "hack"],
    });
    expect(result.packageCents).toBe(0);
    expect(result.optionsCents).toBe(185000);
  });

  it("déduplique les options répétées", () => {
    const result = computeTotal(packages, options, {
      packageId: "p1",
      optionIds: ["o1", "o1", "o1"],
    });
    expect(result.optionsCents).toBe(185000);
  });

  it("gère l'absence de formule (offre de base)", () => {
    const result = computeTotal([{ id: "__base__", priceCents: 500000 }], [], {
      packageId: "__base__",
      optionIds: [],
    });
    expect(result.totalCents).toBe(500000);
  });
});
