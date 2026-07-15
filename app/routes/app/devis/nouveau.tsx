import { useState } from "react";
import { redirect, useNavigation, useSubmit } from "react-router";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { useAppContext } from "../layout";
import { FileUploader } from "~/components/ui/uploaders";
import { Alert, Button, Input, Textarea } from "~/components/ui/primitives";
import { centsToEurosInput, parseEurosToCents } from "~/lib/format";
import { FILE_LIMITS } from "~/lib/plans";
import type { PdfExtractionResult } from "~/lib/pdf-extract.client";
import { requireOrg } from "~/server/services/org.server";
import { verifyCsrf } from "~/server/auth/session.server";
import { checkRateLimit, RATE_LIMITS } from "~/server/auth/rate-limit.server";
import { getDb, schema } from "~/server/db.server";
import { audit } from "~/server/services/audit.server";
import { createProposal } from "~/server/services/proposals.server";
import { canStoreFile, getQuotaUsage } from "~/server/services/quotas.server";
import { storeAsset } from "~/server/services/storage.server";
import type { Route } from "./+types/nouveau";

export const meta: Route.MetaFunction = () => [
  { title: "Nouvelle DevisRoom — DevisRoom" },
  { name: "robots", content: "noindex" },
];

export async function loader({ request }: Route.LoaderArgs) {
  await requireOrg(request);
  return null;
}

const createSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Le titre doit contenir au moins 3 caractères.")
    .max(200),
  clientName: z.string().trim().min(2, "Indiquez le nom du client.").max(120),
  clientEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email("Adresse e-mail invalide.")
    .max(200)
    .or(z.literal("")),
  amount: z.string().trim().max(20),
  summary: z.string().trim().max(3000),
});

export async function action({ request }: Route.ActionArgs) {
  const ctx = await requireOrg(request);
  const formData = await request.formData();
  await verifyCsrf(request, ctx.session, formData);

  const db = getDb();
  const rl = await checkRateLimit(
    db,
    "upload",
    ctx.session.user.id,
    RATE_LIMITS.upload,
  );
  if (!rl.allowed) {
    return {
      error: "Trop d'imports récents. Merci de patienter.",
      fieldErrors: {} as Record<string, string>,
    };
  }

  const parsed = createSchema.safeParse({
    title: formData.get("title"),
    clientName: formData.get("clientName"),
    clientEmail: formData.get("clientEmail") ?? "",
    amount: formData.get("amount") ?? "",
    summary: formData.get("summary") ?? "",
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: null, fieldErrors };
  }

  const amountCents = parsed.data.amount
    ? parseEurosToCents(parsed.data.amount)
    : 0;
  if (amountCents === null) {
    return {
      error: null,
      fieldErrors: { amount: "Montant invalide (exemple : 7 900 ou 7900,50)." },
    };
  }

  // Import du PDF (facultatif).
  const pdf = formData.get("pdf");
  let pdfAssetError: string | null = null;
  let pdfKey: string | null = null;
  let pdfFilename: string | null = null;

  const proposal = await createProposal({
    organizationId: ctx.organization.id,
    userId: ctx.session.user.id,
    title: parsed.data.title,
    clientName: parsed.data.clientName,
    clientEmail: parsed.data.clientEmail || null,
    totalAmountCents: amountCents,
    summary: parsed.data.summary || null,
  });

  if (pdf instanceof File && pdf.size > 0) {
    const usage = await getQuotaUsage(db, ctx.organization.id, ctx.plan.id);
    const quota = canStoreFile(usage, pdf.size);
    if (!quota.allowed) {
      pdfAssetError = quota.reason;
    } else {
      const stored = await storeAsset({
        organizationId: ctx.organization.id,
        proposalId: proposal.id,
        kind: "pdf",
        file: pdf,
      });
      if (stored.ok) {
        pdfKey = stored.asset.r2Key;
        pdfFilename = stored.asset.filename;
      } else {
        pdfAssetError = stored.error;
      }
    }
    if (pdfKey) {
      await db
        .update(schema.proposals)
        .set({ pdfKey, pdfFilename })
        .where(eq(schema.proposals.id, proposal.id));
    }
  }

  await audit({
    userId: ctx.session.user.id,
    organizationId: ctx.organization.id,
    action: "proposal.create",
    targetType: "proposal",
    targetId: proposal.id,
  });

  const suffix = pdfAssetError
    ? `?pdf_erreur=${encodeURIComponent(pdfAssetError)}`
    : "";
  return redirect(`/app/devis/${proposal.id}/modifier${suffix}`);
}

export default function NouveauDevis({ actionData }: Route.ComponentProps) {
  const { csrf } = useAppContext();
  const submit = useSubmit();
  const navigation = useNavigation();
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [extraction, setExtraction] = useState<PdfExtractionResult | null>(
    null,
  );
  const [extracting, setExtracting] = useState(false);
  const [fields, setFields] = useState({
    title: "",
    clientName: "",
    amount: "",
  });

  async function handlePdf(file: File) {
    setPdfFile(file);
    setExtracting(true);
    try {
      const { extractPdfText } = await import("~/lib/pdf-extract.client");
      const result = await extractPdfText(file);
      setExtraction(result);
      if (result.hasText) {
        setFields((current) => ({
          title: current.title || result.guess.title || "",
          clientName: current.clientName || result.guess.clientName || "",
          amount:
            current.amount ||
            (result.guess.totalAmountCents !== null
              ? centsToEurosInput(result.guess.totalAmountCents)
              : ""),
        }));
      }
    } catch {
      setExtraction({
        hasText: false,
        pageCount: 0,
        text: "",
        guess: {
          title: null,
          clientName: null,
          totalAmountCents: null,
          lines: [],
        },
      });
    } finally {
      setExtracting(false);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (pdfFile) formData.set("pdf", pdfFile, pdfFile.name);
    void submit(formData, { method: "post", encType: "multipart/form-data" });
  }

  const fieldErrors = actionData?.fieldErrors ?? {};

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Nouvelle DevisRoom
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Importez votre devis PDF : nous pré-remplissons ce que nous pouvons,
          vous vérifiez et corrigez avant publication. Vous pouvez aussi tout
          saisir manuellement.
        </p>
      </div>

      <section aria-label="Import du devis PDF">
        <FileUploader
          label={
            pdfFile
              ? `PDF sélectionné : ${pdfFile.name}`
              : "Importer votre devis PDF (facultatif)"
          }
          accept="application/pdf"
          maxBytes={FILE_LIMITS.maxPdfBytes}
          onFile={handlePdf}
        />
        {extracting && (
          <p role="status" className="mt-3 text-sm text-slate-500">
            Lecture du PDF en cours…
          </p>
        )}
        {extraction && !extracting && (
          <div className="mt-3">
            {extraction.hasText ? (
              <Alert tone="success" title="Texte extrait du PDF">
                Nous avons pré-rempli les champs ci-dessous à partir du document
                ({extraction.pageCount} page
                {extraction.pageCount > 1 ? "s" : ""}). Vérifiez et corrigez :
                rien ne sera publié sans votre validation.
              </Alert>
            ) : (
              <Alert tone="warning" title="PDF sans texte détecté">
                Ce PDF semble scanné : aucun texte n'a pu être extrait
                automatiquement. Saisissez les informations manuellement — le
                PDF original restera joint à la page pour votre client.
              </Alert>
            )}
          </div>
        )}
      </section>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <input type="hidden" name="_csrf" value={csrf} />
        <Input
          label="Titre du projet"
          name="title"
          required
          value={fields.title}
          onChange={(e) => setFields({ ...fields, title: e.target.value })}
          placeholder="Rénovation de la toiture — maison Dupont"
          error={fieldErrors.title}
        />
        <Input
          label="Nom du client"
          name="clientName"
          required
          value={fields.clientName}
          onChange={(e) => setFields({ ...fields, clientName: e.target.value })}
          placeholder="M. et Mme Dupont"
          error={fieldErrors.clientName}
        />
        <Input
          label="E-mail du client (facultatif)"
          name="clientEmail"
          type="email"
          error={fieldErrors.clientEmail}
        />
        <Input
          label="Montant TTC de l'offre principale (€)"
          name="amount"
          inputMode="decimal"
          value={fields.amount}
          onChange={(e) => setFields({ ...fields, amount: e.target.value })}
          placeholder="7 900"
          hint="Vous pourrez ajouter des variantes et options à l'étape suivante."
          error={fieldErrors.amount}
        />
        <Textarea
          label="Résumé du projet (facultatif)"
          name="summary"
          maxLength={3000}
          placeholder="Décrivez en quelques phrases ce que couvre ce devis."
          error={fieldErrors.summary}
        />
        {actionData?.error && <Alert tone="error">{actionData.error}</Alert>}
        <Button type="submit" size="lg" loading={navigation.state !== "idle"}>
          Créer et personnaliser la page
        </Button>
      </form>
    </div>
  );
}
