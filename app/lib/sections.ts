import { z } from "zod";

/**
 * Types et validation Zod du contenu structuré des sections d'une
 * proposition. Partagé entre l'éditeur, la page publique et le serveur.
 */

export const SECTION_TYPES = [
  "services",
  "steps",
  "timeline",
  "guarantees",
  "faq",
  "custom",
] as const;

export type SectionType = (typeof SECTION_TYPES)[number];

export const servicesContentSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        description: z.string().max(2000).optional().default(""),
      }),
    )
    .max(50),
});

export const stepsContentSchema = z.object({
  items: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().max(2000).optional().default(""),
      }),
    )
    .max(30),
});

export const timelineContentSchema = z.object({
  items: z
    .array(
      z.object({
        label: z.string().min(1).max(200),
        value: z.string().min(1).max(200),
      }),
    )
    .max(20),
});

export const guaranteesContentSchema = z.object({
  items: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().max(2000).optional().default(""),
      }),
    )
    .max(20),
});

export const faqContentSchema = z.object({
  items: z
    .array(
      z.object({
        question: z.string().min(1).max(300),
        answer: z.string().min(1).max(3000),
      }),
    )
    .max(30),
});

export const customContentSchema = z.object({
  text: z.string().max(5000),
});

export const sectionContentSchemas = {
  services: servicesContentSchema,
  steps: stepsContentSchema,
  timeline: timelineContentSchema,
  guarantees: guaranteesContentSchema,
  faq: faqContentSchema,
  custom: customContentSchema,
} satisfies Record<SectionType, z.ZodTypeAny>;

export type ServicesContent = z.infer<typeof servicesContentSchema>;
export type StepsContent = z.infer<typeof stepsContentSchema>;
export type TimelineContent = z.infer<typeof timelineContentSchema>;
export type GuaranteesContent = z.infer<typeof guaranteesContentSchema>;
export type FaqContent = z.infer<typeof faqContentSchema>;
export type CustomContent = z.infer<typeof customContentSchema>;

export const SECTION_LABELS: Record<SectionType, string> = {
  services: "Prestations",
  steps: "Étapes du chantier",
  timeline: "Délais",
  guarantees: "Garanties",
  faq: "Questions fréquentes",
  custom: "Texte libre",
};

export function parseSectionContent(
  type: SectionType,
  raw: unknown,
): unknown | null {
  const schema = sectionContentSchemas[type];
  const result = schema.safeParse(raw);
  return result.success ? result.data : null;
}
