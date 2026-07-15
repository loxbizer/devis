import { eq } from "drizzle-orm";
import { useFetcher } from "react-router";
import { z } from "zod";
import { useAppContext } from "./layout";
import {
  Alert,
  Button,
  Input,
  Select,
  Textarea,
} from "~/components/ui/primitives";
import { FileUploader } from "~/components/ui/uploaders";
import { FILE_LIMITS, PROFESSIONS } from "~/lib/plans";
import { verifyCsrf } from "~/server/auth/session.server";
import { getDb, schema } from "~/server/db.server";
import { audit } from "~/server/services/audit.server";
import { requireOrg } from "~/server/services/org.server";
import { canStoreFile, getQuotaUsage } from "~/server/services/quotas.server";
import { storeAsset } from "~/server/services/storage.server";
import type { Route } from "./+types/entreprise";

export const meta: Route.MetaFunction = () => [
  { title: "Mon entreprise — DevisRoom" },
  { name: "robots", content: "noindex" },
];

export async function loader({ request }: Route.LoaderArgs) {
  const ctx = await requireOrg(request);
  return {
    organization: {
      name: ctx.organization.name,
      profession: ctx.organization.profession,
      siret: ctx.organization.siret,
      email: ctx.organization.email,
      phone: ctx.organization.phone,
      address: ctx.organization.address,
      postalCode: ctx.organization.postalCode,
      city: ctx.organization.city,
      website: ctx.organization.website,
      primaryColor: ctx.organization.primaryColor,
      hasLogo: Boolean(ctx.organization.logoKey),
      stripePaymentLink: ctx.organization.stripePaymentLink,
      bankTransferDetails: ctx.organization.bankTransferDetails,
    },
    depositAllowed: ctx.plan.limits.deposit,
  };
}

const orgSchema = z.object({
  name: z.string().trim().min(2).max(150),
  profession: z.string().trim().max(80),
  siret: z.string().trim().max(20),
  email: z.string().trim().toLowerCase().email().max(200).or(z.literal("")),
  phone: z.string().trim().max(30),
  address: z.string().trim().max(200),
  postalCode: z.string().trim().max(10),
  city: z.string().trim().max(100),
  website: z.string().trim().url().max(300).or(z.literal("")),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide."),
});

export async function action({ request }: Route.ActionArgs) {
  const ctx = await requireOrg(request);
  const formData = await request.formData();
  await verifyCsrf(request, ctx.session, formData);
  const intent = String(formData.get("intent") ?? "");
  const db = getDb();

  if (intent === "save_profile") {
    const parsed = orgSchema.safeParse({
      name: formData.get("name"),
      profession: formData.get("profession") ?? "",
      siret: formData.get("siret") ?? "",
      email: formData.get("email") ?? "",
      phone: formData.get("phone") ?? "",
      address: formData.get("address") ?? "",
      postalCode: formData.get("postalCode") ?? "",
      city: formData.get("city") ?? "",
      website: formData.get("website") ?? "",
      primaryColor: formData.get("primaryColor") ?? "#2563eb",
    });
    if (!parsed.success) {
      return {
        ok: false,
        error:
          "Certains champs sont invalides (le site web doit commencer par https://, la couleur être au format #rrggbb).",
      };
    }
    await db
      .update(schema.organizations)
      .set({
        name: parsed.data.name,
        profession: parsed.data.profession || null,
        siret: parsed.data.siret || null,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        address: parsed.data.address || null,
        postalCode: parsed.data.postalCode || null,
        city: parsed.data.city || null,
        website: parsed.data.website || null,
        primaryColor: parsed.data.primaryColor,
        updatedAt: new Date(),
      })
      .where(eq(schema.organizations.id, ctx.organization.id));
    await audit({
      userId: ctx.session.user.id,
      organizationId: ctx.organization.id,
      action: "organization.update",
    });
    return { ok: true, message: "Profil de l'entreprise enregistré." };
  }

  if (intent === "save_payment") {
    if (!ctx.plan.limits.deposit) {
      return {
        ok: false,
        error: "Le paiement d'acompte est disponible à partir du plan Solo.",
      };
    }
    const link = String(formData.get("stripePaymentLink") ?? "").trim();
    if (
      link &&
      !/^https:\/\/(buy\.stripe\.com|checkout\.stripe\.com)\//.test(link)
    ) {
      return {
        ok: false,
        error:
          "Le lien doit être un Payment Link Stripe (https://buy.stripe.com/…).",
      };
    }
    const bank = String(formData.get("bankTransferDetails") ?? "")
      .trim()
      .slice(0, 2000);
    await db
      .update(schema.organizations)
      .set({
        stripePaymentLink: link || null,
        bankTransferDetails: bank || null,
        updatedAt: new Date(),
      })
      .where(eq(schema.organizations.id, ctx.organization.id));
    return { ok: true, message: "Paramètres d'acompte enregistrés." };
  }

  if (intent === "upload_logo") {
    const file = formData.get("logo");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "Aucun fichier reçu." };
    }
    const usage = await getQuotaUsage(db, ctx.organization.id, ctx.plan.id);
    const quota = canStoreFile(usage, file.size);
    if (!quota.allowed) return { ok: false, error: quota.reason };
    const stored = await storeAsset({
      organizationId: ctx.organization.id,
      kind: "logo",
      file,
    });
    if (!stored.ok) return { ok: false, error: stored.error };
    await db
      .update(schema.organizations)
      .set({ logoKey: stored.asset.r2Key, updatedAt: new Date() })
      .where(eq(schema.organizations.id, ctx.organization.id));
    return { ok: true, message: "Logo mis à jour." };
  }

  return { ok: false, error: "Action inconnue." };
}

export default function Entreprise({ loaderData }: Route.ComponentProps) {
  const { csrf } = useAppContext();
  const profileFetcher = useFetcher<{
    ok: boolean;
    error?: string;
    message?: string;
  }>();
  const paymentFetcher = useFetcher<{
    ok: boolean;
    error?: string;
    message?: string;
  }>();
  const logoFetcher = useFetcher<{
    ok: boolean;
    error?: string;
    message?: string;
  }>();
  const { organization } = loaderData;

  return (
    <div className="flex max-w-2xl flex-col gap-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mon entreprise</h1>
        <p className="mt-1 text-sm text-slate-500">
          Ces informations apparaissent sur les pages envoyées à vos clients.
        </p>
      </div>

      <profileFetcher.Form method="post" className="flex flex-col gap-5">
        <input type="hidden" name="_csrf" value={csrf} />
        <input type="hidden" name="intent" value="save_profile" />
        <Input
          label="Nom de l'entreprise"
          name="name"
          required
          defaultValue={organization.name}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Select
            label="Métier"
            name="profession"
            defaultValue={organization.profession ?? ""}
          >
            <option value="">— Choisir —</option>
            {PROFESSIONS.map((profession) => (
              <option key={profession} value={profession}>
                {profession}
              </option>
            ))}
          </Select>
          <Input
            label="SIRET (facultatif)"
            name="siret"
            defaultValue={organization.siret ?? ""}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="E-mail de contact"
            name="email"
            type="email"
            defaultValue={organization.email ?? ""}
          />
          <Input
            label="Téléphone"
            name="phone"
            defaultValue={organization.phone ?? ""}
          />
        </div>
        <Input
          label="Adresse"
          name="address"
          defaultValue={organization.address ?? ""}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Code postal"
            name="postalCode"
            defaultValue={organization.postalCode ?? ""}
          />
          <Input
            label="Ville"
            name="city"
            defaultValue={organization.city ?? ""}
          />
        </div>
        <Input
          label="Site web (facultatif)"
          name="website"
          placeholder="https://…"
          defaultValue={organization.website ?? ""}
        />
        <div>
          <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
            Couleur principale des pages
            <input
              type="color"
              name="primaryColor"
              defaultValue={organization.primaryColor}
              className="h-9 w-16 cursor-pointer rounded border border-slate-300"
            />
          </label>
        </div>
        {profileFetcher.data && !profileFetcher.data.ok && (
          <Alert tone="error">{profileFetcher.data.error}</Alert>
        )}
        {profileFetcher.data?.ok && (
          <Alert tone="success">{profileFetcher.data.message}</Alert>
        )}
        <Button type="submit" loading={profileFetcher.state !== "idle"}>
          Enregistrer le profil
        </Button>
      </profileFetcher.Form>

      <section aria-labelledby="logo-titre" className="flex flex-col gap-3">
        <h2 id="logo-titre" className="text-lg font-semibold">
          Logo
        </h2>
        {organization.hasLogo && (
          <p className="text-sm text-slate-500">
            Un logo est déjà en place — importer un nouveau fichier le remplace.
          </p>
        )}
        <FileUploader
          label="Importer votre logo (JPG, PNG ou WebP)"
          accept="image/jpeg,image/png,image/webp"
          maxBytes={FILE_LIMITS.maxImageBytes}
          onFile={async (file) => {
            const { optimizeImage } =
              await import("~/lib/image-optimize.client");
            const optimized = await optimizeImage(file);
            const formData = new FormData();
            formData.set("_csrf", csrf);
            formData.set("intent", "upload_logo");
            formData.set("logo", optimized, optimized.name);
            logoFetcher.submit(formData, {
              method: "post",
              encType: "multipart/form-data",
            });
          }}
        />
        {logoFetcher.data && !logoFetcher.data.ok && (
          <Alert tone="error">{logoFetcher.data.error}</Alert>
        )}
        {logoFetcher.data?.ok && (
          <Alert tone="success">{logoFetcher.data.message}</Alert>
        )}
      </section>

      <section aria-labelledby="acompte-config-titre">
        <h2 id="acompte-config-titre" className="text-lg font-semibold">
          Acompte du client final
        </h2>
        {loaderData.depositAllowed ? (
          <paymentFetcher.Form
            method="post"
            className="mt-3 flex flex-col gap-5"
          >
            <input type="hidden" name="_csrf" value={csrf} />
            <input type="hidden" name="intent" value="save_payment" />
            <Input
              label="Votre lien de paiement Stripe (Payment Link)"
              name="stripePaymentLink"
              placeholder="https://buy.stripe.com/…"
              defaultValue={organization.stripePaymentLink ?? ""}
              hint="Créez un Payment Link dans votre propre compte Stripe : l'acompte est encaissé directement par vous. DevisRoom ne touche jamais l'argent de vos clients."
            />
            <Textarea
              label="Instructions de virement (mode virement)"
              name="bankTransferDetails"
              defaultValue={organization.bankTransferDetails ?? ""}
              placeholder={
                "Titulaire : …\nIBAN : …\nBIC : …\nRéférence à indiquer : numéro du devis"
              }
            />
            {paymentFetcher.data && !paymentFetcher.data.ok && (
              <Alert tone="error">{paymentFetcher.data.error}</Alert>
            )}
            {paymentFetcher.data?.ok && (
              <Alert tone="success">{paymentFetcher.data.message}</Alert>
            )}
            <Button type="submit" loading={paymentFetcher.state !== "idle"}>
              Enregistrer les paramètres d'acompte
            </Button>
          </paymentFetcher.Form>
        ) : (
          <Alert tone="info">
            Le paiement d'acompte (lien Stripe ou virement) est disponible à
            partir du plan Solo.
          </Alert>
        )}
      </section>
    </div>
  );
}
