import { describe, expect, it } from "vitest";
import { parseSectionContent, sectionContentSchemas } from "~/lib/sections";

describe("validation des sections", () => {
  it("accepte un contenu services valide", () => {
    const result = sectionContentSchemas.services.safeParse({
      items: [{ name: "Dépose", description: "Détail" }],
    });
    expect(result.success).toBe(true);
  });

  it("refuse un élément sans intitulé", () => {
    const result = sectionContentSchemas.services.safeParse({
      items: [{ name: "", description: "x" }],
    });
    expect(result.success).toBe(false);
  });

  it("refuse une FAQ sans réponse", () => {
    const result = sectionContentSchemas.faq.safeParse({
      items: [{ question: "Q ?", answer: "" }],
    });
    expect(result.success).toBe(false);
  });

  it("limite le nombre d'éléments", () => {
    const result = sectionContentSchemas.steps.safeParse({
      items: Array.from({ length: 31 }, (_, i) => ({ title: `Étape ${i}` })),
    });
    expect(result.success).toBe(false);
  });

  it("parseSectionContent renvoie null sur contenu invalide", () => {
    expect(
      parseSectionContent("faq", { items: [{ question: "" }] }),
    ).toBeNull();
    expect(
      parseSectionContent("timeline", {
        items: [{ label: "Durée", value: "2 semaines" }],
      }),
    ).not.toBeNull();
  });
});
