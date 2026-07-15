import { useState } from "react";
import { Link, useFetcher, useSearchParams } from "react-router";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { useAppContext } from "../layout";
import { ItemListEditor, type ListItem } from "~/components/editor/list-editor";
import { Tabs, useToast } from "~/components/ui/overlays";
import {
  Alert,
  Button,
  Checkbox,
  Input,
  Select,
  Textarea,
} from "~/components/ui/primitives";
import { ImageUploader } from "~/components/ui/uploaders";
import { centsToEurosInput, parseEurosToCents } from "~/lib/format";
import { FILE_LIMITS } from "~/lib/plans";
import {
  SECTION_LABELS,
  sectionContentSchemas,
  type SectionType,
} from "~/lib/sections";
import { verifyCsrf } from "~/server/auth/session.server";
import { checkRateLimit, RATE_LIMITS } from "~/server/auth/rate-limit.server";
import { getDb, schema } from "~/server/db.server";
import { newId } from "~/server/auth/password.server";
import {
  getProposalDetails,
  getProposalForOrg,
  upsertSection,
} from "~/server/services/proposals.server";
import { requireOrg } from "~/server/services/org.server";
import { canStoreFile, getQuotaUsage } from "~/server/services/quotas.server";
import { deleteAsset, storeAsset } from "~/server/services/storage.server";
import type { Route } from "./+types/modifier";

export const meta: Route.MetaFunction = () => [
  { title: "Modifier la DevisRoom — DevisRoom" },
  { name: "robots", content: "noindex" },
];

export async function loader({ request, params }: Route.LoaderArgs) {
  const ctx = await requireOrg(request);
  const proposal = await getProposalForOrg(params.id, ctx.organization.id);
  if (!proposal) throw new Response("Devis introuvable", { status: 404 });
  const details = await getProposalDetails(proposal);

  return {
    proposal,
    sections: details.sections.map((section) => ({
      id: section.id,
      type: section.type,
      title: section.title,
      content:
        typeof section.content === "string"
          ? (JSON.parse(section.content) as unknown)
          : section.content,
    })),
    packages: details.packages.map((pkg) => ({
      ...pkg,
      features:
        typeof pkg.features === "string"
          ? (JSON.parse(pkg.features) as string[])
          : (pkg.features as string[]),
    })),
    options: details.options,
    images: details.images.map((image) => ({
      id: image.id,
      url: `/api/fichiers/${image.id}`,
      filename: image.filename,
    })),
    limits: {
      variants: ctx.plan.limits.variants,
      options: ctx.plan.limits.options,
      deposit: ctx.plan.limits.deposit,
    },
  };
}

// ---------------------------------------------------------------------------
// Validation serveur
// ---------------------------------------------------------------------------

const infoSchema = z.object({
  title: z.string().trim().min(3).max(200),
  clientName: z.string().trim().min(2).max(120),
  clientEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .max(200)
    .or(z.literal("")),
  message: z.string().trim().max(3000),
  summary: z.string().trim().max(3000),
  terms: z.string().trim().max(5000),
  amount: z.string().trim().max(20),
});

const packagesSchema = z
  .array(
    z.object({
      id: z.string().max(60).optional(),
      name: z.string().trim().min(1).max(120),
      description: z.string().trim().max(1000),
      priceCents: z.number().int().min(0).max(100_000_000),
      features: z.array(z.string().trim().min(1).max(300)).max(20),
      isRecommended: z.boolean(),
    }),
  )
  .max(3);

const optionsSchema = z
  .array(
    z.object({
      id: z.string().max(60).optional(),
      name: z.string().trim().min(1).max(120),
      description: z.string().trim().max(1000),
      priceCents: z.number().int().min(0).max(100_000_000),
    }),
  )
  .max(20);

export async function action({ request, params }: Route.ActionArgs) {
  const ctx = await requireOrg(request);
  const proposal = await getProposalForOrg(params.id, ctx.organization.id);
  if (!proposal) throw new Response("Devis introuvable", { status: 404 });

  const formData = await request.formData();
  await verifyCsrf(request, ctx.session, formData);
  const intent = String(formData.get("intent") ?? "");
  const db = getDb();

  switch (intent) {
    case "save_info": {
      const parsed = infoSchema.safeParse({
        title: formData.get("title"),
        clientName: formData.get("clientName"),
        clientEmail: formData.get("clientEmail") ?? "",
        message: formData.get("message") ?? "",
        summary: formData.get("summary") ?? "",
        terms: formData.get("terms") ?? "",
        amount: formData.get("amount") ?? "",
      });
      if (!parsed.success) {
        return {
          ok: false,
          error: "Certains champs sont invalides. Vérifiez le formulaire.",
        };
      }
      const amountCents = parsed.data.amount
        ? parseEurosToCents(parsed.data.amount)
        : 0;
      if (amountCents === null) {
        return { ok: false, error: "Montant invalide." };
      }

      // Acompte (selon le plan).
      let depositEnabled = false;
      let depositMode: "stripe_link" | "bank_transfer" | null = null;
      let depositAmountCents: number | null = null;
      if (ctx.plan.limits.deposit) {
        depositEnabled = formData.get("depositEnabled") === "yes";
        const mode = String(formData.get("depositMode") ?? "");
        depositMode =
          mode === "stripe_link" || mode === "bank_transfer" ? mode : null;
        const depositRaw = String(formData.get("depositAmount") ?? "").trim();
        depositAmountCents = depositRaw ? parseEurosToCents(depositRaw) : null;
        if (depositEnabled && !depositMode) {
          return {
            ok: false,
            error: "Choisissez un mode d'acompte (lien Stripe ou virement).",
          };
        }
      }

      await db
        .update(schema.proposals)
        .set({
          title: parsed.data.title,
          clientName: parsed.data.clientName,
          clientEmail: parsed.data.clientEmail || null,
          message: parsed.data.message || null,
          summary: parsed.data.summary || null,
          terms: parsed.data.terms || null,
          totalAmountCents: amountCents,
          depositEnabled,
          depositMode,
          depositAmountCents,
          updatedAt: new Date(),
        })
        .where(eq(schema.proposals.id, proposal.id));
      return { ok: true, message: "Informations enregistrées." };
    }

    case "save_section": {
      const type = String(formData.get("type") ?? "") as SectionType;
      if (!(type in sectionContentSchemas)) {
        return { ok: false, error: "Type de section inconnu." };
      }
      const title = String(formData.get("sectionTitle") ?? "").trim();
      if (!title || title.length > 200) {
        return { ok: false, error: "Titre de section invalide." };
      }
      let rawContent: unknown;
      try {
        rawContent = JSON.parse(String(formData.get("content") ?? "{}"));
      } catch {
        return { ok: false, error: "Contenu illisible." };
      }
      const parsed = sectionContentSchemas[type].safeParse(rawContent);
      if (!parsed.success) {
        return {
          ok: false,
          error:
            "Contenu invalide : vérifiez que chaque élément a un intitulé.",
        };
      }
      const sectionId = String(formData.get("sectionId") ?? "") || null;
      const position = [
        "services",
        "steps",
        "timeline",
        "guarantees",
        "faq",
        "custom",
      ].indexOf(type);

      // Section vide = suppression.
      const items = parsed.data as { items?: unknown[]; text?: string };
      const isEmpty =
        (Array.isArray(items.items) && items.items.length === 0) ||
        (type === "custom" && !items.text);
      if (isEmpty) {
        if (sectionId) {
          await db
            .delete(schema.proposalSections)
            .where(
              and(
                eq(schema.proposalSections.id, sectionId),
                eq(schema.proposalSections.proposalId, proposal.id),
              ),
            );
        }
        return { ok: true, message: "Section retirée." };
      }

      await upsertSection({
        proposalId: proposal.id,
        type,
        title,
        content: parsed.data,
        position,
        sectionId,
      });
      await db
        .update(schema.proposals)
        .set({ updatedAt: new Date() })
        .where(eq(schema.proposals.id, proposal.id));
      return {
        ok: true,
        message: `Section « ${SECTION_LABELS[type]} » enregistrée.`,
      };
    }

    case "save_packages": {
      let raw: unknown;
      try {
        raw = JSON.parse(String(formData.get("packages") ?? "[]"));
      } catch {
        return { ok: false, error: "Données illisibles." };
      }
      const parsed = packagesSchema.safeParse(raw);
      if (!parsed.success) {
        return {
          ok: false,
          error: "Offres invalides : nom et prix requis pour chaque formule.",
        };
      }
      const packages = parsed.data;
      if (!ctx.plan.limits.variants && packages.length > 1) {
        return {
          ok: false,
          error:
            "Les variantes (plusieurs formules) sont disponibles à partir du plan Pro.",
        };
      }
      await db
        .delete(schema.proposalPackages)
        .where(eq(schema.proposalPackages.proposalId, proposal.id));
      let position = 0;
      for (const pkg of packages) {
        await db.insert(schema.proposalPackages).values({
          id: newId(),
          proposalId: proposal.id,
          name: pkg.name,
          description: pkg.description || null,
          priceCents: pkg.priceCents,
          features: JSON.stringify(pkg.features),
          isRecommended: pkg.isRecommended,
          position: position++,
        });
      }
      // Le montant principal suit l'offre recommandée (ou la première).
      const main = packages.find((p) => p.isRecommended) ?? packages[0];
      if (main) {
        await db
          .update(schema.proposals)
          .set({ totalAmountCents: main.priceCents, updatedAt: new Date() })
          .where(eq(schema.proposals.id, proposal.id));
      }
      return { ok: true, message: "Offres enregistrées." };
    }

    case "save_options": {
      if (!ctx.plan.limits.options) {
        return {
          ok: false,
          error: "Les options sont disponibles à partir du plan Solo.",
        };
      }
      let raw: unknown;
      try {
        raw = JSON.parse(String(formData.get("options") ?? "[]"));
      } catch {
        return { ok: false, error: "Données illisibles." };
      }
      const parsed = optionsSchema.safeParse(raw);
      if (!parsed.success) {
        return { ok: false, error: "Options invalides : nom et prix requis." };
      }
      await db
        .delete(schema.proposalOptions)
        .where(eq(schema.proposalOptions.proposalId, proposal.id));
      let position = 0;
      for (const option of parsed.data) {
        await db.insert(schema.proposalOptions).values({
          id: newId(),
          proposalId: proposal.id,
          name: option.name,
          description: option.description || null,
          priceCents: option.priceCents,
          position: position++,
        });
      }
      return { ok: true, message: "Options enregistrées." };
    }

    case "upload_image": {
      const rl = await checkRateLimit(
        db,
        "upload",
        ctx.session.user.id,
        RATE_LIMITS.upload,
      );
      if (!rl.allowed) return { ok: false, error: "Trop d'envois récents." };

      const details = await getProposalDetails(proposal);
      if (details.images.length >= FILE_LIMITS.maxImagesPerProposal) {
        return {
          ok: false,
          error: `Maximum ${FILE_LIMITS.maxImagesPerProposal} images par proposition.`,
        };
      }
      const file = formData.get("image");
      if (!(file instanceof File) || file.size === 0) {
        return { ok: false, error: "Aucun fichier reçu." };
      }
      const usage = await getQuotaUsage(db, ctx.organization.id, ctx.plan.id);
      const quota = canStoreFile(usage, file.size);
      if (!quota.allowed) return { ok: false, error: quota.reason };

      const stored = await storeAsset({
        organizationId: ctx.organization.id,
        proposalId: proposal.id,
        kind: "image",
        file,
      });
      if (!stored.ok) return { ok: false, error: stored.error };
      return { ok: true, message: "Image ajoutée." };
    }

    case "delete_image": {
      const assetId = String(formData.get("assetId") ?? "");
      const deleted = await deleteAsset(assetId, ctx.organization.id);
      return deleted
        ? { ok: true, message: "Image supprimée." }
        : { ok: false, error: "Image introuvable." };
    }

    default:
      return { ok: false, error: "Action inconnue." };
  }
}

// ---------------------------------------------------------------------------
// Composant
// ---------------------------------------------------------------------------

type SectionState = {
  sectionId: string | null;
  title: string;
  items: ListItem[];
};

function sectionToItems(content: unknown): ListItem[] {
  if (content && typeof content === "object" && "items" in content) {
    return ((content as { items: ListItem[] }).items ?? []).map((item) => ({
      ...item,
    }));
  }
  return [];
}

const SECTION_FIELDS: Record<
  Exclude<SectionType, "custom">,
  {
    key: string;
    label: string;
    type?: "text" | "textarea";
    required?: boolean;
  }[]
> = {
  services: [
    { key: "name", label: "Prestation", required: true },
    { key: "description", label: "Détail (facultatif)", type: "textarea" },
  ],
  steps: [
    { key: "title", label: "Étape", required: true },
    { key: "description", label: "Détail (facultatif)", type: "textarea" },
  ],
  timeline: [
    {
      key: "label",
      label: "Intitulé (ex. : Démarrage possible)",
      required: true,
    },
    { key: "value", label: "Valeur (ex. : Sous 6 semaines)", required: true },
  ],
  guarantees: [
    { key: "title", label: "Garantie", required: true },
    { key: "description", label: "Détail (facultatif)", type: "textarea" },
  ],
  faq: [
    { key: "question", label: "Question", required: true },
    { key: "answer", label: "Réponse", type: "textarea", required: true },
  ],
};

function itemsToContent(type: SectionType, items: ListItem[]): unknown {
  const filtered = items.filter((item) =>
    Object.values(item).some((value) => value.trim() !== ""),
  );
  return { items: filtered };
}

export default function ModifierDevis({ loaderData }: Route.ComponentProps) {
  const { csrf } = useAppContext();
  const [searchParams] = useSearchParams();
  const pdfError = searchParams.get("pdf_erreur");
  const [tab, setTab] = useState("infos");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {loaderData.proposal.title}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Personnalisez la page avant de l'envoyer à{" "}
            {loaderData.proposal.clientName}.
          </p>
        </div>
        <Link
          to={`/app/devis/${loaderData.proposal.id}`}
          className="rounded-(--radius-button) border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Aperçu & publication
        </Link>
      </div>

      {pdfError && (
        <Alert tone="warning" title="PDF non joint">
          {pdfError}
        </Alert>
      )}

      <Tabs
        tabs={[
          { id: "infos", label: "Informations" },
          { id: "contenu", label: "Contenu" },
          { id: "offres", label: "Offres & options" },
          { id: "photos", label: "Photos" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "infos" && <InfoTab loaderData={loaderData} csrf={csrf} />}
      {tab === "contenu" && <ContentTab loaderData={loaderData} csrf={csrf} />}
      {tab === "offres" && <OffersTab loaderData={loaderData} csrf={csrf} />}
      {tab === "photos" && <PhotosTab loaderData={loaderData} csrf={csrf} />}
    </div>
  );
}

type TabProps = {
  loaderData: Route.ComponentProps["loaderData"];
  csrf: string;
};

function ActionFeedback({
  data,
}: {
  data: { ok: boolean; error?: string; message?: string } | undefined;
}) {
  if (!data) return null;
  if (!data.ok && data.error) return <Alert tone="error">{data.error}</Alert>;
  if (data.ok && data.message)
    return <Alert tone="success">{data.message}</Alert>;
  return null;
}

// --- Onglet informations ---------------------------------------------------

function InfoTab({ loaderData, csrf }: TabProps) {
  const fetcher = useFetcher<{
    ok: boolean;
    error?: string;
    message?: string;
  }>();
  const { proposal, limits } = loaderData;
  const [depositEnabled, setDepositEnabled] = useState(proposal.depositEnabled);

  return (
    <fetcher.Form method="post" className="flex max-w-2xl flex-col gap-5">
      <input type="hidden" name="_csrf" value={csrf} />
      <input type="hidden" name="intent" value="save_info" />
      <Input
        label="Titre du projet"
        name="title"
        required
        defaultValue={proposal.title}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Nom du client"
          name="clientName"
          required
          defaultValue={proposal.clientName}
        />
        <Input
          label="E-mail du client (facultatif)"
          name="clientEmail"
          type="email"
          defaultValue={proposal.clientEmail ?? ""}
        />
      </div>
      <Textarea
        label="Message personnalisé (affiché en tête de page)"
        name="message"
        defaultValue={proposal.message ?? ""}
        placeholder="Bonjour, voici notre proposition suite à notre visite…"
      />
      <Textarea
        label="Résumé du projet"
        name="summary"
        defaultValue={proposal.summary ?? ""}
      />
      <Input
        label="Montant TTC de l'offre principale (€)"
        name="amount"
        inputMode="decimal"
        defaultValue={centsToEurosInput(proposal.totalAmountCents)}
        hint="Si vous définissez des formules dans l'onglet Offres, ce montant suivra la formule recommandée."
      />
      <Textarea
        label="Conditions affichées au moment de l'acceptation"
        name="terms"
        defaultValue={proposal.terms ?? ""}
        placeholder="Validité du devis, modalités d'acompte, assurances…"
      />

      <fieldset className="rounded-xl border border-slate-200 p-4">
        <legend className="px-1 text-sm font-semibold">Acompte</legend>
        {limits.deposit ? (
          <div className="flex flex-col gap-4">
            <Checkbox
              name="depositEnabled"
              value="yes"
              checked={depositEnabled}
              onChange={(e) => setDepositEnabled(e.target.checked)}
              label="Proposer le paiement d'un acompte sur la page"
            />
            {depositEnabled && (
              <>
                <Select
                  label="Mode de paiement"
                  name="depositMode"
                  defaultValue={proposal.depositMode ?? ""}
                  hint="Le lien Stripe et les coordonnées de virement se configurent dans Entreprise. L'argent est encaissé directement par vous — jamais par DevisRoom."
                >
                  <option value="">— Choisir —</option>
                  <option value="stripe_link">
                    Lien de paiement Stripe (votre propre Payment Link)
                  </option>
                  <option value="bank_transfer">
                    Virement bancaire (instructions affichées)
                  </option>
                </Select>
                <Input
                  label="Montant de l'acompte (€, facultatif)"
                  name="depositAmount"
                  inputMode="decimal"
                  defaultValue={centsToEurosInput(proposal.depositAmountCents)}
                />
              </>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            Le paiement d'acompte est disponible à partir du plan Solo.{" "}
            <Link
              to="/app/abonnement"
              className="font-medium text-brand-700 underline"
            >
              Voir les plans
            </Link>
          </p>
        )}
      </fieldset>

      <ActionFeedback data={fetcher.data} />
      <Button type="submit" loading={fetcher.state !== "idle"}>
        Enregistrer les informations
      </Button>
    </fetcher.Form>
  );
}

// --- Onglet contenu ---------------------------------------------------------

function ContentTab({ loaderData, csrf }: TabProps) {
  const types: Exclude<SectionType, "custom">[] = [
    "services",
    "steps",
    "timeline",
    "guarantees",
    "faq",
  ];
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <p className="text-sm text-slate-500">
        Chaque section n'apparaît sur la page client que si elle contient au
        moins un élément.
      </p>
      {types.map((type) => (
        <SectionEditor
          key={type}
          type={type}
          loaderData={loaderData}
          csrf={csrf}
        />
      ))}
    </div>
  );
}

function SectionEditor({
  type,
  loaderData,
  csrf,
}: TabProps & { type: Exclude<SectionType, "custom"> }) {
  const fetcher = useFetcher<{
    ok: boolean;
    error?: string;
    message?: string;
  }>();
  const existing = loaderData.sections.find((section) => section.type === type);
  const [state, setState] = useState<SectionState>({
    sectionId: existing?.id ?? null,
    title: existing?.title ?? SECTION_LABELS[type],
    items: existing ? sectionToItems(existing.content) : [],
  });

  return (
    <details
      className="rounded-2xl border border-slate-200 bg-white"
      open={state.items.length > 0}
    >
      <summary className="cursor-pointer px-5 py-4 font-semibold">
        {SECTION_LABELS[type]}
        {state.items.length > 0 && (
          <span className="ml-2 text-sm font-normal text-slate-500">
            ({state.items.length} élément{state.items.length > 1 ? "s" : ""})
          </span>
        )}
      </summary>
      <fetcher.Form
        method="post"
        className="flex flex-col gap-4 border-t border-slate-100 p-5"
      >
        <input type="hidden" name="_csrf" value={csrf} />
        <input type="hidden" name="intent" value="save_section" />
        <input type="hidden" name="type" value={type} />
        {state.sectionId && (
          <input type="hidden" name="sectionId" value={state.sectionId} />
        )}
        <input
          type="hidden"
          name="content"
          value={JSON.stringify(itemsToContent(type, state.items))}
        />
        <Input
          label="Titre de la section"
          name="sectionTitle"
          required
          value={state.title}
          onChange={(e) => setState({ ...state, title: e.target.value })}
        />
        <ItemListEditor
          items={state.items}
          onChange={(items) => setState({ ...state, items })}
          fields={SECTION_FIELDS[type]}
          addLabel={`Ajouter — ${SECTION_LABELS[type].toLowerCase()}`}
        />
        <ActionFeedback data={fetcher.data} />
        <Button
          type="submit"
          variant="outline"
          loading={fetcher.state !== "idle"}
        >
          Enregistrer cette section
        </Button>
      </fetcher.Form>
    </details>
  );
}

// --- Onglet offres ----------------------------------------------------------

interface PackageDraft {
  id?: string;
  name: string;
  description: string;
  price: string;
  features: string;
  isRecommended: boolean;
}

function OffersTab({ loaderData, csrf }: TabProps) {
  const packagesFetcher = useFetcher<{
    ok: boolean;
    error?: string;
    message?: string;
  }>();
  const optionsFetcher = useFetcher<{
    ok: boolean;
    error?: string;
    message?: string;
  }>();
  const { toast } = useToast();
  const { limits } = loaderData;

  const [packages, setPackages] = useState<PackageDraft[]>(
    loaderData.packages.map((pkg) => ({
      id: pkg.id,
      name: pkg.name,
      description: pkg.description ?? "",
      price: centsToEurosInput(pkg.priceCents),
      features: pkg.features.join("\n"),
      isRecommended: pkg.isRecommended,
    })),
  );
  const [options, setOptions] = useState<ListItem[]>(
    loaderData.options.map((option) => ({
      name: option.name,
      description: option.description ?? "",
      price: centsToEurosInput(option.priceCents),
    })),
  );

  const maxPackages = limits.variants ? 3 : 1;

  function submitPackages() {
    const payload = [];
    for (const pkg of packages) {
      if (!pkg.name.trim()) continue;
      const priceCents = parseEurosToCents(pkg.price);
      if (priceCents === null) {
        toast(`Prix invalide pour la formule « ${pkg.name} ».`, "error");
        return;
      }
      payload.push({
        name: pkg.name.trim(),
        description: pkg.description.trim(),
        priceCents,
        features: pkg.features
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
        isRecommended: pkg.isRecommended,
      });
    }
    packagesFetcher.submit(
      {
        intent: "save_packages",
        _csrf: csrf,
        packages: JSON.stringify(payload),
      },
      { method: "post" },
    );
  }

  function submitOptions() {
    const payload = [];
    for (const option of options) {
      if (!option.name?.trim()) continue;
      const priceCents = parseEurosToCents(option.price ?? "");
      if (priceCents === null) {
        toast(`Prix invalide pour l'option « ${option.name} ».`, "error");
        return;
      }
      payload.push({
        name: option.name.trim(),
        description: (option.description ?? "").trim(),
        priceCents,
      });
    }
    optionsFetcher.submit(
      { intent: "save_options", _csrf: csrf, options: JSON.stringify(payload) },
      { method: "post" },
    );
  }

  return (
    <div className="flex max-w-2xl flex-col gap-10">
      <section aria-labelledby="offres-editeur-titre">
        <h2 id="offres-editeur-titre" className="text-lg font-semibold">
          Formules
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {limits.variants
            ? "Proposez jusqu'à 3 formules (offre principale + 2 variantes) : votre client compare et choisit."
            : "Votre plan permet une formule unique. Les variantes (jusqu'à 3 formules) sont disponibles à partir du plan Pro."}
        </p>
        <div className="mt-4 flex flex-col gap-4">
          {packages.map((pkg, index) => (
            <fieldset
              key={index}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <legend className="sr-only">Formule {index + 1}</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Nom de la formule"
                  value={pkg.name}
                  onChange={(e) =>
                    setPackages(
                      packages.map((p, i) =>
                        i === index ? { ...p, name: e.target.value } : p,
                      ),
                    )
                  }
                  placeholder="Essentielle"
                  required
                />
                <Input
                  label="Prix TTC (€)"
                  inputMode="decimal"
                  value={pkg.price}
                  onChange={(e) =>
                    setPackages(
                      packages.map((p, i) =>
                        i === index ? { ...p, price: e.target.value } : p,
                      ),
                    )
                  }
                  placeholder="7 900"
                  required
                />
              </div>
              <div className="mt-4">
                <Input
                  label="Description courte"
                  value={pkg.description}
                  onChange={(e) =>
                    setPackages(
                      packages.map((p, i) =>
                        i === index ? { ...p, description: e.target.value } : p,
                      ),
                    )
                  }
                />
              </div>
              <div className="mt-4">
                <Textarea
                  label="Prestations incluses (une par ligne)"
                  value={pkg.features}
                  onChange={(e) =>
                    setPackages(
                      packages.map((p, i) =>
                        i === index ? { ...p, features: e.target.value } : p,
                      ),
                    )
                  }
                  rows={4}
                />
              </div>
              <div className="mt-4 flex items-center justify-between">
                <Checkbox
                  checked={pkg.isRecommended}
                  onChange={(e) =>
                    setPackages(
                      packages.map((p, i) => ({
                        ...p,
                        isRecommended:
                          i === index
                            ? e.target.checked
                            : e.target.checked
                              ? false
                              : p.isRecommended,
                      })),
                    )
                  }
                  label="Mettre cette formule en avant (« Recommandée »)"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-600"
                  onClick={() =>
                    setPackages(packages.filter((_, i) => i !== index))
                  }
                >
                  Retirer
                </Button>
              </div>
            </fieldset>
          ))}
          {packages.length < maxPackages && (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setPackages([
                  ...packages,
                  {
                    name: "",
                    description: "",
                    price: "",
                    features: "",
                    isRecommended: packages.length === 0,
                  },
                ])
              }
            >
              + Ajouter une formule
            </Button>
          )}
        </div>
        <div className="mt-4 flex flex-col gap-3">
          <ActionFeedback data={packagesFetcher.data} />
          <Button
            onClick={submitPackages}
            loading={packagesFetcher.state !== "idle"}
          >
            Enregistrer les formules
          </Button>
        </div>
      </section>

      <section aria-labelledby="options-editeur-titre">
        <h2 id="options-editeur-titre" className="text-lg font-semibold">
          Options supplémentaires
        </h2>
        {limits.options ? (
          <>
            <p className="mt-1 text-sm text-slate-500">
              Votre client peut cocher ces options : le total se met à jour
              automatiquement.
            </p>
            <div className="mt-4">
              <ItemListEditor
                items={options}
                onChange={setOptions}
                fields={[
                  { key: "name", label: "Option", required: true },
                  { key: "description", label: "Description (facultatif)" },
                  { key: "price", label: "Prix TTC (€)", required: true },
                ]}
                addLabel="Ajouter une option"
                maxItems={20}
              />
            </div>
            <div className="mt-4 flex flex-col gap-3">
              <ActionFeedback data={optionsFetcher.data} />
              <Button
                onClick={submitOptions}
                loading={optionsFetcher.state !== "idle"}
              >
                Enregistrer les options
              </Button>
            </div>
          </>
        ) : (
          <p className="mt-1 text-sm text-slate-500">
            Les options sélectionnables sont disponibles à partir du plan Solo.{" "}
            <Link
              to="/app/abonnement"
              className="font-medium text-brand-700 underline"
            >
              Voir les plans
            </Link>
          </p>
        )}
      </section>
    </div>
  );
}

// --- Onglet photos ----------------------------------------------------------

function PhotosTab({ loaderData, csrf }: TabProps) {
  const fetcher = useFetcher<{
    ok: boolean;
    error?: string;
    message?: string;
  }>();

  async function upload(file: File) {
    const { optimizeImage } = await import("~/lib/image-optimize.client");
    const optimized = await optimizeImage(file);
    const formData = new FormData();
    formData.set("_csrf", csrf);
    formData.set("intent", "upload_image");
    formData.set("image", optimized, optimized.name);
    fetcher.submit(formData, {
      method: "post",
      encType: "multipart/form-data",
    });
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <p className="text-sm text-slate-500">
        Ajoutez des photos de chantiers similaires, de matériaux ou de
        l'existant : elles rassurent votre client. Formats JPG, PNG, WebP.
      </p>
      <ActionFeedback data={fetcher.data} />
      <ImageUploader
        images={loaderData.images}
        onUpload={upload}
        onDelete={(assetId) =>
          fetcher.submit(
            { intent: "delete_image", _csrf: csrf, assetId },
            { method: "post" },
          )
        }
        maxBytes={FILE_LIMITS.maxImageBytes}
        maxCount={FILE_LIMITS.maxImagesPerProposal}
        disabled={fetcher.state !== "idle"}
      />
    </div>
  );
}
