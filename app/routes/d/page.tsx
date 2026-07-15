import { data, redirect } from "react-router";
import { ProposalPublicPage } from "~/components/proposal/public-page";
import { Alert, Button, Input } from "~/components/ui/primitives";
import { getPlan } from "~/lib/plans";
import type { PublicProposalVM } from "~/lib/proposal-vm";
import { getSession, readCookie } from "~/server/auth/session.server";
import {
  checkRateLimit,
  clientIp,
  RATE_LIMITS,
  rateLimitResponse,
} from "~/server/auth/rate-limit.server";
import { randomToken, sha256Hex } from "~/server/auth/password.server";
import { getDb, schema } from "~/server/db.server";
import { notifyOrganization } from "~/server/services/notifications.server";
import {
  acceptProposal,
  getProposalDetails,
  getPublicProposal,
  recordEvent,
  recordView,
} from "~/server/services/proposals.server";
import { and, eq } from "drizzle-orm";
import { newId } from "~/server/auth/password.server";
import type { Route } from "./+types/page";

export const meta: Route.MetaFunction = ({ loaderData }) => [
  {
    title: loaderData?.vm
      ? `${loaderData.vm.proposal.title} — ${loaderData.vm.organization.name}`
      : "Proposition privée",
  },
  { name: "robots", content: "noindex, nofollow" },
];

export function headers({ loaderHeaders }: Route.HeadersArgs) {
  const headers = new Headers(loaderHeaders);
  headers.set("X-Robots-Tag", "noindex, nofollow");
  headers.set("Cache-Control", "private, no-store");
  return headers;
}

type LoaderData =
  | { state: "code_required"; error: string | null; vm?: undefined }
  | { state: "expired"; organizationName: string; vm?: undefined }
  | { state: "ok"; vm: PublicProposalVM; preview?: boolean };

/**
 * Aperçu propriétaire : une proposition en brouillon reste consultable par
 * les membres de son organisation (et uniquement eux).
 */
async function getOwnerPreview(request: Request, slug: string) {
  const db = getDb();
  const rows = await db
    .select({ proposal: schema.proposals, organization: schema.organizations })
    .from(schema.proposals)
    .innerJoin(
      schema.organizations,
      eq(schema.proposals.organizationId, schema.organizations.id),
    )
    .where(eq(schema.proposals.slug, slug))
    .limit(1);
  const row = rows[0];
  if (!row || row.proposal.deletedAt) return null;
  const session = await getSession(request);
  if (!session) return null;
  const membership = await db
    .select({ id: schema.organizationMembers.id })
    .from(schema.organizationMembers)
    .where(
      and(
        eq(schema.organizationMembers.userId, session.user.id),
        eq(schema.organizationMembers.organizationId, row.organization.id),
      ),
    )
    .limit(1);
  if (!membership[0]) return null;
  return row;
}

export async function loader({ request, params }: Route.LoaderArgs) {
  let preview = false;
  let found = await getPublicProposal(params.slug);
  if (!found) {
    const owned = await getOwnerPreview(request, params.slug);
    if (owned) {
      found = { ...owned, expired: false };
      preview = true;
    }
  }
  if (!found) {
    throw new Response(
      "Cette proposition n'existe pas ou n'est plus disponible.",
      { status: 404 },
    );
  }
  const { proposal, organization, expired } = found;

  if (expired) {
    return data<LoaderData>({
      state: "expired",
      organizationName: organization.name,
    });
  }

  // Code secret facultatif : vérifie le cookie de déverrouillage.
  if (proposal.accessCodeHash && !preview) {
    const unlocked = readCookie(request, `dr_code_${proposal.slug}`);
    const expected = await sha256Hex(proposal.accessCodeHash);
    if (unlocked !== expected) {
      const url = new URL(request.url);
      return data<LoaderData>({
        state: "code_required",
        error: url.searchParams.get("erreur") ? "Code incorrect." : null,
      });
    }
  }

  // Enregistrement de la vue (cookie de visite aléatoire, non nominatif).
  // Les aperçus du propriétaire ne comptent jamais comme des consultations.
  const responseHeaders = new Headers();
  if (!preview) {
    let visitorId = readCookie(request, `dr_v_${proposal.slug}`);
    if (!visitorId) {
      visitorId = randomToken(8);
      responseHeaders.append(
        "Set-Cookie",
        `dr_v_${proposal.slug}=${visitorId}; Path=/d/${proposal.slug}; Max-Age=${60 * 60 * 24 * 90}; SameSite=Lax; HttpOnly`,
      );
    }
    await recordView({
      proposalId: proposal.id,
      organizationId: organization.id,
      visitorId,
      userAgent: request.headers.get("User-Agent"),
      proposalTitle: proposal.title,
    });
  }

  const details = await getProposalDetails(proposal);
  const db = getDb();
  const [subscription] = await db
    .select()
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.organizationId, organization.id))
    .limit(1);
  const plan = getPlan(subscription?.plan);

  const base = `/d/${proposal.slug}`;
  const vm: PublicProposalVM = {
    slug: proposal.slug,
    isDemo: false,
    branding: plan.limits.branding,
    organization: {
      name: organization.name,
      profession: organization.profession,
      phone: organization.phone,
      email: organization.email,
      address: organization.address,
      postalCode: organization.postalCode,
      city: organization.city,
      website: organization.website,
      logoUrl: organization.logoKey ? `${base}/logo` : null,
      primaryColor: organization.primaryColor,
    },
    proposal: {
      title: proposal.title,
      clientName: proposal.clientName,
      message: proposal.message,
      summary: proposal.summary,
      terms: proposal.terms,
      totalAmountCents: proposal.totalAmountCents,
      version: proposal.version,
      expiresAt: proposal.expiresAt?.toISOString() ?? null,
      acceptedAt: proposal.acceptedAt?.toISOString() ?? null,
      depositEnabled: proposal.depositEnabled && plan.limits.deposit,
      depositMode: proposal.depositMode,
      depositAmountCents: proposal.depositAmountCents,
      pdfUrl: proposal.pdfKey ? `${base}/pdf` : null,
    },
    deposit: {
      stripePaymentLink: organization.stripePaymentLink,
      bankTransferDetails: organization.bankTransferDetails,
    },
    sections: details.sections.map((section) => ({
      id: section.id,
      type: section.type,
      title: section.title,
      content:
        typeof section.content === "string"
          ? JSON.parse(section.content)
          : section.content,
    })),
    packages: plan.limits.variants
      ? details.packages.map(toPublicPackage)
      : details.packages.slice(0, 1).map(toPublicPackage),
    options: plan.limits.options
      ? details.options.map((option) => ({
          id: option.id,
          name: option.name,
          description: option.description,
          priceCents: option.priceCents,
        }))
      : [],
    images: details.images.map((image) => ({
      id: image.id,
      url: `${base}/fichier/${image.id}`,
      filename: image.filename,
    })),
  };

  return data<LoaderData>(
    { state: "ok", vm, preview },
    { headers: responseHeaders },
  );
}

function toPublicPackage(pkg: {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  features: unknown;
  isRecommended: boolean;
}) {
  let features: string[] = [];
  try {
    const parsed =
      typeof pkg.features === "string"
        ? JSON.parse(pkg.features)
        : pkg.features;
    if (Array.isArray(parsed)) features = parsed.map(String);
  } catch {
    features = [];
  }
  return {
    id: pkg.id,
    name: pkg.name,
    description: pkg.description,
    priceCents: pkg.priceCents,
    features,
    isRecommended: pkg.isRecommended,
  };
}

// ---------------------------------------------------------------------------
// Actions du client final
// ---------------------------------------------------------------------------

export async function action({ request, params }: Route.ActionArgs) {
  const found = await getPublicProposal(params.slug);
  if (!found || found.expired) {
    throw new Response("Proposition indisponible.", { status: 404 });
  }
  const { proposal, organization } = found;
  const db = getDb();
  const ip = clientIp(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  // Déverrouillage par code secret.
  if (intent === "access_code") {
    const rl = await checkRateLimit(
      db,
      "access_code",
      `${ip}:${proposal.slug}`,
      RATE_LIMITS.accessCode,
    );
    if (!rl.allowed) throw rateLimitResponse();
    const code = String(formData.get("code") ?? "");
    const hash = await sha256Hex(code.trim().toLowerCase());
    if (proposal.accessCodeHash && hash === proposal.accessCodeHash) {
      const cookieValue = await sha256Hex(proposal.accessCodeHash);
      return redirect(`/d/${proposal.slug}`, {
        headers: {
          "Set-Cookie": `dr_code_${proposal.slug}=${cookieValue}; Path=/d/${proposal.slug}; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax; HttpOnly`,
        },
      });
    }
    return redirect(`/d/${proposal.slug}?erreur=code`);
  }

  // Vérification du code pour toutes les autres actions.
  if (proposal.accessCodeHash) {
    const unlocked = readCookie(request, `dr_code_${proposal.slug}`);
    const expected = await sha256Hex(proposal.accessCodeHash);
    if (unlocked !== expected) {
      throw new Response("Accès non autorisé.", { status: 403 });
    }
  }

  switch (intent) {
    case "select_package": {
      await recordEvent(proposal.id, "package_selected", {
        name: String(formData.get("name") ?? "").slice(0, 120),
      });
      return { ok: true };
    }
    case "select_option": {
      await recordEvent(proposal.id, "option_selected", {
        name: String(formData.get("name") ?? "").slice(0, 120),
      });
      return { ok: true };
    }
    case "question":
    case "change_request": {
      const rl = await checkRateLimit(
        db,
        "public_form",
        `${ip}:${proposal.slug}`,
        RATE_LIMITS.publicForm,
      );
      if (!rl.allowed) {
        return {
          ok: false,
          error:
            "Trop de messages envoyés. Merci de patienter quelques minutes.",
        };
      }
      const name = String(formData.get("name") ?? "").trim();
      const email = String(formData.get("email") ?? "").trim();
      const message = String(formData.get("message") ?? "").trim();
      if (!name || !email.includes("@") || message.length < 5) {
        return {
          ok: false,
          error:
            "Merci de renseigner votre nom, un e-mail valide et votre message.",
        };
      }
      if (intent === "question") {
        await db.insert(schema.proposalQuestions).values({
          id: newId(),
          proposalId: proposal.id,
          name: name.slice(0, 120),
          email: email.slice(0, 200),
          message: message.slice(0, 3000),
        });
        await recordEvent(proposal.id, "question_asked");
        await notifyOrganization({
          organizationId: organization.id,
          type: "question",
          title: `Nouvelle question : ${proposal.title}`,
          body: `${name} : « ${message.slice(0, 160)}${message.length > 160 ? "…" : ""} »`,
          linkTo: `/app/devis/${proposal.id}`,
          emailTo: organization.email,
        });
      } else {
        await db.insert(schema.proposalChangeRequests).values({
          id: newId(),
          proposalId: proposal.id,
          name: name.slice(0, 120),
          email: email.slice(0, 200),
          message: message.slice(0, 3000),
        });
        await recordEvent(proposal.id, "change_requested");
        await notifyOrganization({
          organizationId: organization.id,
          type: "change_request",
          title: `Demande de modification : ${proposal.title}`,
          body: `${name} : « ${message.slice(0, 160)}${message.length > 160 ? "…" : ""} »`,
          linkTo: `/app/devis/${proposal.id}`,
          emailTo: organization.email,
        });
      }
      return { ok: true };
    }
    case "accept": {
      const rl = await checkRateLimit(
        db,
        "accept",
        `${ip}:${proposal.slug}`,
        RATE_LIMITS.publicForm,
      );
      if (!rl.allowed) {
        return {
          ok: false,
          error: "Trop de tentatives. Merci de patienter quelques minutes.",
        };
      }
      const name = String(formData.get("name") ?? "").trim();
      const email = String(formData.get("email") ?? "").trim();
      if (!name || !email.includes("@")) {
        return {
          ok: false,
          error: "Merci de renseigner votre nom et un e-mail valide.",
        };
      }
      const confirmSelection = formData.get("confirmSelection") === "yes";
      const termsAccepted = formData.get("termsAccepted") === "yes";
      if (!confirmSelection || !termsAccepted) {
        return {
          ok: false,
          error: "Merci de cocher les deux cases de confirmation.",
        };
      }
      const packageIdRaw = String(formData.get("packageId") ?? "");
      const optionIds = String(formData.get("optionIds") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const confirmedTotalCents = Number(formData.get("confirmedTotalCents"));
      if (!Number.isInteger(confirmedTotalCents) || confirmedTotalCents < 0) {
        return { ok: false, error: "Montant invalide." };
      }
      const result = await acceptProposal(proposal, organization.name, {
        name: name.slice(0, 120),
        email: email.slice(0, 200),
        packageId: packageIdRaw || null,
        optionIds,
        confirmedTotalCents,
        termsAccepted,
        userAgent: request.headers.get("User-Agent"),
        // IP conservée comme élément de preuve de l'acceptation uniquement.
        ipAddress: ip === "unknown" ? null : ip,
      });
      if (!result.ok) return { ok: false, error: result.error };
      return { ok: true };
    }
    case "deposit_start": {
      if (!proposal.depositEnabled || !organization.stripePaymentLink) {
        return {
          ok: false,
          error: "Le paiement en ligne n'est pas disponible.",
        };
      }
      await recordEvent(proposal.id, "deposit_started");
      await notifyOrganization({
        organizationId: organization.id,
        type: "deposit_started",
        title: `Acompte déclenché : ${proposal.title}`,
        body: "Votre client a ouvert la page de paiement de l'acompte.",
        linkTo: `/app/devis/${proposal.id}`,
      });
      return redirect(organization.stripePaymentLink);
    }
    default:
      return { ok: false, error: "Action inconnue." };
  }
}

// ---------------------------------------------------------------------------
// Composant
// ---------------------------------------------------------------------------

export default function ProposalRoute({ loaderData }: Route.ComponentProps) {
  if (loaderData.state === "expired") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
          <h1 className="text-xl font-bold">Proposition expirée</h1>
          <p className="mt-3 text-sm text-slate-600">
            Cette proposition de {loaderData.organizationName} n'est plus
            valable. Contactez directement l'entreprise pour obtenir une
            proposition à jour.
          </p>
        </div>
      </main>
    );
  }

  if (loaderData.state === "code_required") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <h1 className="text-xl font-bold">Proposition protégée</h1>
          <p className="mt-2 text-sm text-slate-600">
            Cette page est protégée par un code. Il figure dans le message que
            l'entreprise vous a envoyé.
          </p>
          <form method="post" className="mt-5 flex flex-col gap-4">
            <input type="hidden" name="intent" value="access_code" />
            <Input
              label="Code d'accès"
              name="code"
              required
              autoComplete="off"
              autoFocus
            />
            {loaderData.error && <Alert tone="error">{loaderData.error}</Alert>}
            <Button type="submit">Ouvrir la proposition</Button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <>
      {loaderData.preview && (
        <p
          role="status"
          className="bg-slate-900 px-4 py-2 text-center text-sm font-medium text-white"
        >
          Aperçu — cette proposition est en brouillon, seuls les membres de
          votre entreprise peuvent la voir.
        </p>
      )}
      <ProposalPublicPage vm={loaderData.vm} />
    </>
  );
}
