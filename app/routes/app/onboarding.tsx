import { eq } from "drizzle-orm";
import { Link, redirect, useFetcher } from "react-router";
import { z } from "zod";
import { Alert, Button, Input, Select, cx } from "~/components/ui/primitives";
import { PROFESSIONS } from "~/lib/plans";
import { verifyCsrf } from "~/server/auth/session.server";
import { getDb, schema } from "~/server/db.server";
import {
  createOrganization,
  requireSessionWithOptionalOrg,
} from "~/server/services/org.server";
import {
  createProposal,
  upsertSection,
} from "~/server/services/proposals.server";
import { canStoreFile, getQuotaUsage } from "~/server/services/quotas.server";
import { awardPoints } from "~/server/services/rewards.server";
import { storeAsset } from "~/server/services/storage.server";
import type { Route } from "./+types/onboarding";

export const meta: Route.MetaFunction = () => [
  { title: "Bienvenue — DevisRoom" },
  { name: "robots", content: "noindex" },
];

const STEPS = [
  "Profil de l'entreprise",
  "Logo et couleurs",
  "Premier devis",
  "Personnalisation",
  "Publication",
];

export async function loader({ request }: Route.LoaderArgs) {
  const { session, org } = await requireSessionWithOptionalOrg(request);
  if (org && org.onboardingStep >= 5) throw redirect("/app");
  const db = getDb();
  let lastProposalId: string | null = null;
  if (org) {
    const [proposal] = await db
      .select({ id: schema.proposals.id })
      .from(schema.proposals)
      .where(eq(schema.proposals.organizationId, org.id))
      .limit(1);
    lastProposalId = proposal?.id ?? null;
  }
  return {
    csrf: session.csrfToken,
    step: org ? Math.max(1, org.onboardingStep) : 0,
    orgName: org?.name ?? null,
    primaryColor: org?.primaryColor ?? "#2563eb",
    hasLogo: Boolean(org?.logoKey),
    lastProposalId,
  };
}

const orgSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Indiquez le nom de votre entreprise.")
    .max(150),
  profession: z.string().trim().max(80),
  phone: z.string().trim().max(30),
  city: z.string().trim().max(100),
});

export async function action({ request }: Route.ActionArgs) {
  const { session, org } = await requireSessionWithOptionalOrg(request);
  const formData = await request.formData();
  await verifyCsrf(request, session, formData);
  const intent = String(formData.get("intent") ?? "");
  const db = getDb();

  if (intent === "create_org") {
    if (org) return { ok: false, error: "Votre entreprise existe déjà." };
    const parsed = orgSchema.safeParse({
      name: formData.get("name"),
      profession: formData.get("profession") ?? "",
      phone: formData.get("phone") ?? "",
      city: formData.get("city") ?? "",
    });
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Champs invalides.",
      };
    }
    await createOrganization(session.user.id, {
      name: parsed.data.name,
      profession: parsed.data.profession || undefined,
      phone: parsed.data.phone || undefined,
      city: parsed.data.city || undefined,
    });
    return { ok: true };
  }

  if (!org) return { ok: false, error: "Créez d'abord votre entreprise." };

  switch (intent) {
    case "save_branding": {
      const color = String(formData.get("primaryColor") ?? "#2563eb");
      if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
        return { ok: false, error: "Couleur invalide." };
      }
      const logo = formData.get("logo");
      if (logo instanceof File && logo.size > 0) {
        const usage = await getQuotaUsage(db, org.id, "free");
        const quota = canStoreFile(usage, logo.size);
        if (!quota.allowed) return { ok: false, error: quota.reason };
        const stored = await storeAsset({
          organizationId: org.id,
          kind: "logo",
          file: logo,
        });
        if (!stored.ok) return { ok: false, error: stored.error };
        await db
          .update(schema.organizations)
          .set({ logoKey: stored.asset.r2Key })
          .where(eq(schema.organizations.id, org.id));
      }
      await db
        .update(schema.organizations)
        .set({ primaryColor: color, onboardingStep: 2, updatedAt: new Date() })
        .where(eq(schema.organizations.id, org.id));
      return { ok: true };
    }
    case "create_demo_proposal": {
      // Données d'exemple pour tester rapidement l'outil.
      const proposal = await createProposal({
        organizationId: org.id,
        userId: session.user.id,
        title: "Exemple — Rénovation salle de bain",
        clientName: "Client d'exemple",
        totalAmountCents: 485000,
        summary:
          "Exemple créé automatiquement pour découvrir DevisRoom : remplacement de la baignoire par une douche à l'italienne, faïence et sol.",
      });
      await upsertSection({
        proposalId: proposal.id,
        type: "services",
        title: "Prestations",
        content: {
          items: [
            {
              name: "Dépose de la baignoire existante",
              description: "Évacuation des gravats incluse.",
            },
            {
              name: "Création d'une douche à l'italienne",
              description: "Receveur extra-plat 120×90, paroi verre 8 mm.",
            },
            {
              name: "Faïence murale et sol antidérapant",
              description: "Fourniture et pose, joints époxy.",
            },
          ],
        },
        position: 0,
      });
      await upsertSection({
        proposalId: proposal.id,
        type: "steps",
        title: "Étapes du chantier",
        content: {
          items: [
            { title: "Protection et dépose", description: "Jour 1" },
            { title: "Plomberie et étanchéité", description: "Jours 2-3" },
            { title: "Carrelage et finitions", description: "Jours 4-5" },
          ],
        },
        position: 1,
      });
      await db
        .update(schema.organizations)
        .set({ onboardingStep: 3, updatedAt: new Date() })
        .where(eq(schema.organizations.id, org.id));
      return { ok: true, proposalId: proposal.id };
    }
    case "set_step": {
      const step = Number(formData.get("step"));
      if (!Number.isInteger(step) || step < 0 || step > 5) {
        return { ok: false, error: "Étape invalide." };
      }
      await db
        .update(schema.organizations)
        .set({ onboardingStep: step, updatedAt: new Date() })
        .where(eq(schema.organizations.id, org.id));
      if (step >= 5) {
        // Petit cadeau de bienvenue (une seule fois par organisation).
        await awardPoints(org.id, "onboarding_done", org.id);
        throw redirect("/app");
      }
      return { ok: true };
    }
    default:
      return { ok: false, error: "Action inconnue." };
  }
}

export default function Onboarding({ loaderData }: Route.ComponentProps) {
  const { csrf, step } = loaderData;
  const fetcher = useFetcher<{
    ok: boolean;
    error?: string;
    proposalId?: string;
  }>();
  const error = fetcher.data && !fetcher.data.ok ? fetcher.data.error : null;

  function goToStep(next: number) {
    fetcher.submit(
      { intent: "set_step", step: String(next), _csrf: csrf },
      { method: "post" },
    );
  }

  return (
    <main className="min-h-screen bg-night-950 px-4 py-10">
      <div className="mx-auto max-w-xl">
        <p className="text-center text-2xl font-bold text-white">
          Devis<span className="text-brand-400">Room</span>
        </p>

        {/* Progression */}
        <ol
          aria-label="Progression de la configuration"
          className="mt-8 flex items-center justify-between gap-1"
        >
          {STEPS.map((label, index) => (
            <li
              key={label}
              className="flex flex-1 flex-col items-center gap-1.5 text-center"
            >
              <span
                aria-current={index === step ? "step" : undefined}
                className={cx(
                  "flex size-7 items-center justify-center rounded-full text-xs font-bold",
                  index < step
                    ? "bg-emerald-500 text-white"
                    : index === step
                      ? "bg-brand-500 text-white"
                      : "bg-white/10 text-slate-400",
                )}
              >
                {index < step ? "✓" : index + 1}
              </span>
              <span className="hidden text-[11px] text-slate-400 sm:block">
                {label}
              </span>
            </li>
          ))}
        </ol>

        <div className="mt-8 rounded-2xl bg-white p-8 shadow-xl">
          {error && (
            <div className="mb-4">
              <Alert tone="error">{error}</Alert>
            </div>
          )}

          {step === 0 && (
            <fetcher.Form method="post" className="flex flex-col gap-5">
              <input type="hidden" name="_csrf" value={csrf} />
              <input type="hidden" name="intent" value="create_org" />
              <div>
                <h1 className="text-xl font-bold">Votre entreprise</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Ces informations apparaîtront sur les pages envoyées à vos
                  clients. Tout reste modifiable ensuite.
                </p>
              </div>
              <Input label="Nom de l'entreprise" name="name" required />
              <Select label="Métier" name="profession">
                <option value="">— Choisir —</option>
                {PROFESSIONS.map((profession) => (
                  <option key={profession} value={profession}>
                    {profession}
                  </option>
                ))}
              </Select>
              <div className="grid gap-5 sm:grid-cols-2">
                <Input label="Téléphone (facultatif)" name="phone" />
                <Input label="Ville (facultatif)" name="city" />
              </div>
              <Button
                type="submit"
                size="lg"
                loading={fetcher.state !== "idle"}
              >
                Continuer
              </Button>
            </fetcher.Form>
          )}

          {step === 1 && (
            <BrandingStep
              csrf={csrf}
              defaultColor={loaderData.primaryColor}
              hasLogo={loaderData.hasLogo}
              onSkip={() => goToStep(2)}
            />
          )}

          {step === 2 && (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="text-xl font-bold">Votre premier devis</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Importez un vrai devis PDF, ou créez un exemple pré-rempli
                  pour découvrir l'outil sans risque.
                </p>
              </div>
              <Link
                to="/app/devis/nouveau"
                className="rounded-(--radius-button) bg-brand-600 px-4 py-3 text-center font-medium text-white hover:bg-brand-700"
              >
                Importer mon devis PDF
              </Link>
              <fetcher.Form method="post">
                <input type="hidden" name="_csrf" value={csrf} />
                <input
                  type="hidden"
                  name="intent"
                  value="create_demo_proposal"
                />
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full"
                  loading={fetcher.state !== "idle"}
                >
                  Créer un devis d'exemple pré-rempli
                </Button>
              </fetcher.Form>
              {fetcher.data?.ok && fetcher.data.proposalId && (
                <Alert tone="success">
                  Devis d'exemple créé !{" "}
                  <Link
                    to={`/app/devis/${fetcher.data.proposalId}/modifier`}
                    className="font-medium underline"
                  >
                    L'ouvrir dans l'éditeur
                  </Link>
                </Alert>
              )}
              <button
                type="button"
                onClick={() => goToStep(3)}
                className="text-sm text-slate-500 underline"
              >
                Passer cette étape
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="text-xl font-bold">Personnalisation</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Dans l'éditeur, ajoutez photos, étapes du chantier, garanties
                  et FAQ : c'est ce qui rassure vos clients et fait la
                  différence avec un PDF.
                </p>
              </div>
              <ul className="flex flex-col gap-2 text-sm text-slate-700">
                <li>
                  • Onglet <strong>Contenu</strong> : prestations, étapes,
                  délais, garanties, FAQ.
                </li>
                <li>
                  • Onglet <strong>Offres</strong> : jusqu'à 3 formules et des
                  options à cocher.
                </li>
                <li>
                  • Onglet <strong>Photos</strong> : chantiers similaires,
                  matériaux.
                </li>
              </ul>
              {loaderData.lastProposalId && (
                <Link
                  to={`/app/devis/${loaderData.lastProposalId}/modifier`}
                  className="rounded-(--radius-button) bg-brand-600 px-4 py-3 text-center font-medium text-white hover:bg-brand-700"
                >
                  Ouvrir l'éditeur
                </Link>
              )}
              <Button variant="outline" onClick={() => goToStep(4)}>
                Continuer
              </Button>
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="text-xl font-bold">Publication</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Depuis la page d'un devis, cliquez sur{" "}
                  <strong>Publier</strong> puis <strong>Copier le lien</strong>{" "}
                  : envoyez ce lien privé à votre client par e-mail ou SMS. Vous
                  serez notifié à chaque consultation, question ou acceptation.
                </p>
              </div>
              <Button
                size="lg"
                onClick={() => goToStep(5)}
                loading={fetcher.state !== "idle"}
              >
                Terminer et accéder à mon tableau de bord
              </Button>
            </div>
          )}
        </div>

        {step > 0 && step < 5 && (
          <p className="mt-4 text-center text-sm text-slate-400">
            Vous pouvez quitter à tout moment :{" "}
            <Link to="/app" className="underline">
              reprendre plus tard depuis le tableau de bord
            </Link>
            .
          </p>
        )}
      </div>
    </main>
  );
}

function BrandingStep({
  csrf,
  defaultColor,
  hasLogo,
  onSkip,
}: {
  csrf: string;
  defaultColor: string;
  hasLogo: boolean;
  onSkip: () => void;
}) {
  const fetcher = useFetcher<{ ok: boolean; error?: string }>();
  return (
    <fetcher.Form
      method="post"
      encType="multipart/form-data"
      className="flex flex-col gap-5"
    >
      <input type="hidden" name="_csrf" value={csrf} />
      <input type="hidden" name="intent" value="save_branding" />
      <div>
        <h1 className="text-xl font-bold">Logo et couleurs</h1>
        <p className="mt-1 text-sm text-slate-500">
          Vos pages porteront vos couleurs.{" "}
          {hasLogo && "Un logo est déjà en place."}
        </p>
      </div>
      <LogoField />
      <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
        Couleur principale
        <input
          type="color"
          name="primaryColor"
          defaultValue={defaultColor}
          className="h-9 w-16 cursor-pointer rounded border border-slate-300"
        />
      </label>
      {fetcher.data && !fetcher.data.ok && (
        <Alert tone="error">{fetcher.data.error}</Alert>
      )}
      <Button type="submit" size="lg" loading={fetcher.state !== "idle"}>
        Continuer
      </Button>
      <button
        type="button"
        onClick={onSkip}
        className="text-sm text-slate-500 underline"
      >
        Passer cette étape
      </button>
    </fetcher.Form>
  );
}

/** Champ fichier natif stylé (le fichier part avec le formulaire multipart). */
function LogoField() {
  return (
    <label className="flex cursor-pointer flex-col gap-1.5">
      <span className="text-sm font-medium text-slate-700">
        Logo (JPG, PNG ou WebP — facultatif)
      </span>
      <input
        type="file"
        name="logo"
        accept="image/jpeg,image/png,image/webp"
        className="rounded-(--radius-button) border border-slate-300 bg-white px-3.5 py-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-700"
      />
    </label>
  );
}
