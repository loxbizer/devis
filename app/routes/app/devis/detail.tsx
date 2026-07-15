import { useState } from "react";
import { Form, Link, redirect, useFetcher } from "react-router";
import { and, desc, eq } from "drizzle-orm";
import { useAppContext } from "../layout";
import { proposalStatusBadge } from "~/components/ui/cards";
import { useToast } from "~/components/ui/overlays";
import { Alert, Badge, Button, Input } from "~/components/ui/primitives";
import { formatDateTime, formatEuros } from "~/lib/format";
import { verifyCsrf } from "~/server/auth/session.server";
import { getDb, schema } from "~/server/db.server";
import { getAppUrl } from "~/server/env.server";
import { audit } from "~/server/services/audit.server";
import {
  duplicateProposal,
  getProposalForOrg,
  publishProposal,
  recordEvent,
  setAccessCode,
} from "~/server/services/proposals.server";
import { requireOrg } from "~/server/services/org.server";
import {
  canPublishProposal,
  clampExpiry,
  getQuotaUsage,
} from "~/server/services/quotas.server";
import { deleteProposalFiles } from "~/server/services/storage.server";
import type { Route } from "./+types/detail";

export const meta: Route.MetaFunction = ({ loaderData }) => [
  {
    title: loaderData
      ? `${loaderData.proposal.title} — DevisRoom`
      : "Devis — DevisRoom",
  },
  { name: "robots", content: "noindex" },
];

export async function loader({ request, params }: Route.LoaderArgs) {
  const ctx = await requireOrg(request);
  const proposal = await getProposalForOrg(params.id, ctx.organization.id);
  if (!proposal) throw new Response("Devis introuvable", { status: 404 });

  const db = getDb();
  const [questions, changeRequests, acceptances, usage] = await Promise.all([
    db
      .select()
      .from(schema.proposalQuestions)
      .where(eq(schema.proposalQuestions.proposalId, proposal.id))
      .orderBy(desc(schema.proposalQuestions.createdAt)),
    db
      .select()
      .from(schema.proposalChangeRequests)
      .where(eq(schema.proposalChangeRequests.proposalId, proposal.id))
      .orderBy(desc(schema.proposalChangeRequests.createdAt)),
    db
      .select()
      .from(schema.proposalAcceptances)
      .where(eq(schema.proposalAcceptances.proposalId, proposal.id))
      .orderBy(desc(schema.proposalAcceptances.createdAt)),
    getQuotaUsage(db, ctx.organization.id, ctx.plan.id),
  ]);

  const publishCheck =
    proposal.status === "draft"
      ? canPublishProposal(usage)
      : { allowed: true as const };

  return {
    proposal,
    questions,
    changeRequests,
    acceptances,
    publicUrl: `${getAppUrl()}/d/${proposal.slug}`,
    canPublish: publishCheck.allowed,
    publishBlockedReason: publishCheck.allowed ? null : publishCheck.reason,
    canDuplicate: ctx.plan.limits.duplicate,
    maxExpiryDays: ctx.plan.limits.maxExpiryDays,
    hasAccessCode: Boolean(proposal.accessCodeHash),
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const ctx = await requireOrg(request);
  const proposal = await getProposalForOrg(params.id, ctx.organization.id);
  if (!proposal) throw new Response("Devis introuvable", { status: 404 });

  const formData = await request.formData();
  await verifyCsrf(request, ctx.session, formData);
  const intent = String(formData.get("intent") ?? "");
  const db = getDb();

  const auditAction = (action: string, data?: unknown) =>
    audit({
      userId: ctx.session.user.id,
      organizationId: ctx.organization.id,
      action,
      targetType: "proposal",
      targetId: proposal.id,
      data,
    });

  switch (intent) {
    case "publish": {
      const usage = await getQuotaUsage(db, ctx.organization.id, ctx.plan.id);
      if (proposal.status === "draft") {
        const check = canPublishProposal(usage);
        if (!check.allowed) return { ok: false, error: check.reason };
      }
      // Expiration plafonnée selon le plan (30 jours en gratuit).
      const clamped = clampExpiry(ctx.plan.limits, proposal.expiresAt);
      if (clamped?.getTime() !== proposal.expiresAt?.getTime()) {
        await db
          .update(schema.proposals)
          .set({ expiresAt: clamped })
          .where(eq(schema.proposals.id, proposal.id));
      }
      await publishProposal(proposal, ctx.session.user.id);
      await auditAction("proposal.publish", { version: proposal.version });
      return { ok: true, message: "Proposition publiée." };
    }
    case "unpublish": {
      await db
        .update(schema.proposals)
        .set({ status: "draft", updatedAt: new Date() })
        .where(eq(schema.proposals.id, proposal.id));
      await recordEvent(proposal.id, "unpublished");
      await auditAction("proposal.unpublish");
      return { ok: true, message: "Proposition repassée en brouillon." };
    }
    case "archive": {
      await db
        .update(schema.proposals)
        .set({ archivedAt: new Date(), updatedAt: new Date() })
        .where(eq(schema.proposals.id, proposal.id));
      await recordEvent(proposal.id, "archived");
      await auditAction("proposal.archive");
      return { ok: true, message: "Proposition archivée." };
    }
    case "unarchive": {
      await db
        .update(schema.proposals)
        .set({ archivedAt: null, updatedAt: new Date() })
        .where(eq(schema.proposals.id, proposal.id));
      await auditAction("proposal.unarchive");
      return { ok: true, message: "Proposition désarchivée." };
    }
    case "set_outcome": {
      const outcome = String(formData.get("outcome") ?? "");
      if (!["pending", "won", "lost", "expired"].includes(outcome)) {
        return { ok: false, error: "Statut invalide." };
      }
      await db
        .update(schema.proposals)
        .set({
          outcome: outcome as "pending" | "won" | "lost" | "expired",
          updatedAt: new Date(),
        })
        .where(eq(schema.proposals.id, proposal.id));
      await recordEvent(proposal.id, "outcome_changed", { outcome });
      await auditAction("proposal.outcome", { outcome });
      return { ok: true, message: "Statut mis à jour." };
    }
    case "set_expiry": {
      const raw = String(formData.get("expiresAt") ?? "");
      let expiresAt: Date | null = null;
      if (raw) {
        const date = new Date(`${raw}T23:59:59`);
        if (Number.isNaN(date.getTime())) {
          return { ok: false, error: "Date invalide." };
        }
        expiresAt = date;
      }
      const clamped = clampExpiry(ctx.plan.limits, expiresAt);
      await db
        .update(schema.proposals)
        .set({ expiresAt: clamped, updatedAt: new Date() })
        .where(eq(schema.proposals.id, proposal.id));
      return {
        ok: true,
        message:
          clamped && expiresAt && clamped.getTime() < expiresAt.getTime()
            ? `Date limitée au maximum de votre plan (${ctx.plan.limits.maxExpiryDays} jours).`
            : "Date d'expiration enregistrée.",
      };
    }
    case "set_access_code": {
      const code = String(formData.get("code") ?? "").trim();
      if (code && code.length < 4) {
        return {
          ok: false,
          error: "Le code doit contenir au moins 4 caractères.",
        };
      }
      await setAccessCode(proposal.id, code || null);
      await auditAction("proposal.access_code", { enabled: Boolean(code) });
      return {
        ok: true,
        message: code ? "Code secret activé." : "Code secret retiré.",
      };
    }
    case "duplicate": {
      if (!ctx.plan.limits.duplicate) {
        return {
          ok: false,
          error: "La duplication est disponible à partir du plan Solo.",
        };
      }
      const copy = await duplicateProposal(proposal, ctx.session.user.id);
      await auditAction("proposal.duplicate", { copyId: copy.id });
      throw redirect(`/app/devis/${copy.id}/modifier`);
    }
    case "delete": {
      await deleteProposalFiles(proposal.id);
      await db
        .update(schema.proposals)
        .set({ deletedAt: new Date(), status: "draft", updatedAt: new Date() })
        .where(eq(schema.proposals.id, proposal.id));
      await auditAction("proposal.delete");
      throw redirect("/app/devis");
    }
    case "answer_question": {
      const questionId = String(formData.get("questionId") ?? "");
      const answer = String(formData.get("answer") ?? "").trim();
      if (!answer) return { ok: false, error: "Réponse vide." };
      await db
        .update(schema.proposalQuestions)
        .set({ answer, answeredAt: new Date() })
        .where(
          and(
            eq(schema.proposalQuestions.id, questionId),
            eq(schema.proposalQuestions.proposalId, proposal.id),
          ),
        );
      return {
        ok: true,
        message:
          "Réponse enregistrée. Transmettez-la à votre client par votre canal habituel (téléphone ou e-mail).",
      };
    }
    case "resolve_change": {
      const changeId = String(formData.get("changeId") ?? "");
      await db
        .update(schema.proposalChangeRequests)
        .set({ status: "resolved", resolvedAt: new Date() })
        .where(
          and(
            eq(schema.proposalChangeRequests.id, changeId),
            eq(schema.proposalChangeRequests.proposalId, proposal.id),
          ),
        );
      return { ok: true, message: "Demande marquée comme traitée." };
    }
    default:
      return { ok: false, error: "Action inconnue." };
  }
}

export default function DetailDevis({ loaderData }: Route.ComponentProps) {
  const { csrf } = useAppContext();
  const { proposal } = loaderData;
  const { toast } = useToast();
  const actionFetcher = useFetcher<{
    ok: boolean;
    error?: string;
    message?: string;
  }>();
  const [copied, setCopied] = useState(false);

  const feedback = actionFetcher.data;

  function submitIntent(intent: string, extra?: Record<string, string>) {
    actionFetcher.submit({ intent, _csrf: csrf, ...extra }, { method: "post" });
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(loaderData.publicUrl);
      setCopied(true);
      toast("Lien copié dans le presse-papiers.");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast(
        "Impossible de copier automatiquement — sélectionnez le lien.",
        "error",
      );
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {proposal.title}
            </h1>
            {proposalStatusBadge(proposal)}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {proposal.clientName} · {formatEuros(proposal.totalAmountCents)} ·
            version {proposal.version}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/app/devis/${proposal.id}/modifier`}
            className="rounded-(--radius-button) border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Modifier
          </Link>
          <Link
            to={`/app/devis/${proposal.id}/statistiques`}
            className="rounded-(--radius-button) border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Statistiques
          </Link>
          {proposal.status === "draft" ? (
            <Button
              onClick={() => submitIntent("publish")}
              disabled={!loaderData.canPublish}
              loading={actionFetcher.state !== "idle"}
            >
              Publier
            </Button>
          ) : (
            <Button variant="outline" onClick={() => submitIntent("unpublish")}>
              Repasser en brouillon
            </Button>
          )}
        </div>
      </div>

      {!loaderData.canPublish && loaderData.publishBlockedReason && (
        <Alert tone="warning" title="Limite du plan atteinte">
          {loaderData.publishBlockedReason}{" "}
          <Link to="/app/abonnement" className="font-medium underline">
            Voir les plans
          </Link>
        </Alert>
      )}
      {feedback && !feedback.ok && feedback.error && (
        <Alert tone="error">{feedback.error}</Alert>
      )}
      {feedback?.ok && feedback.message && (
        <Alert tone="success">{feedback.message}</Alert>
      )}

      {/* Lien privé */}
      {proposal.status === "published" && (
        <section
          aria-labelledby="lien-titre"
          className="rounded-2xl border border-slate-200 bg-white p-6"
        >
          <h2 id="lien-titre" className="text-lg font-semibold">
            Lien privé à envoyer à votre client
          </h2>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              readOnly
              value={loaderData.publicUrl}
              aria-label="Lien privé de la proposition"
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 rounded-(--radius-button) border border-slate-300 bg-slate-50 px-3.5 py-2.5 font-mono text-sm"
            />
            <Button
              onClick={copyLink}
              variant={copied ? "secondary" : "primary"}
            >
              {copied ? "Copié !" : "Copier le lien"}
            </Button>
            <a
              href={loaderData.publicUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-(--radius-button) border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Ouvrir
            </a>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Ce lien est non répertorié et non indexé : seules les personnes à
            qui vous l'envoyez peuvent y accéder
            {loaderData.hasAccessCode ? " (code secret activé)" : ""}.
          </p>
        </section>
      )}

      {/* Acceptations */}
      {loaderData.acceptances.length > 0 && (
        <section
          aria-labelledby="acceptations-titre"
          className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6"
        >
          <h2
            id="acceptations-titre"
            className="text-lg font-semibold text-emerald-900"
          >
            Acceptation enregistrée
          </h2>
          {loaderData.acceptances.map((acceptance) => (
            <div key={acceptance.id} className="mt-3 text-sm text-emerald-900">
              <p>
                <strong>{acceptance.name}</strong> ({acceptance.email}) a
                accepté la formule <strong>{acceptance.packageName}</strong>{" "}
                pour <strong>{formatEuros(acceptance.totalCents)}</strong> le{" "}
                {formatDateTime(acceptance.createdAt)} (version{" "}
                {acceptance.proposalVersion} de la proposition).
              </p>
            </div>
          ))}
          <p className="mt-3 text-xs text-emerald-800">
            Rappel : cette acceptation ne constitue pas une signature
            électronique qualifiée.
          </p>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Statut commercial */}
        <section
          aria-labelledby="statut-titre"
          className="rounded-2xl border border-slate-200 bg-white p-6"
        >
          <h2 id="statut-titre" className="text-lg font-semibold">
            Classement du devis
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Classez ce devis pour garder un tableau de bord fiable.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(
              [
                ["pending", "En attente"],
                ["won", "Gagné"],
                ["lost", "Perdu"],
                ["expired", "Expiré"],
              ] as const
            ).map(([value, label]) => (
              <Button
                key={value}
                size="sm"
                variant={proposal.outcome === value ? "secondary" : "outline"}
                onClick={() => submitIntent("set_outcome", { outcome: value })}
              >
                {label}
              </Button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            {proposal.archivedAt ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => submitIntent("unarchive")}
              >
                Désarchiver
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => submitIntent("archive")}
              >
                Archiver
              </Button>
            )}
            {loaderData.canDuplicate && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => submitIntent("duplicate")}
              >
                Dupliquer
              </Button>
            )}
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                if (
                  window.confirm(
                    "Supprimer définitivement ce devis et ses fichiers ? Cette action est irréversible.",
                  )
                ) {
                  submitIntent("delete");
                }
              }}
            >
              Supprimer
            </Button>
          </div>
        </section>

        {/* Paramètres d'accès */}
        <section
          aria-labelledby="acces-titre"
          className="rounded-2xl border border-slate-200 bg-white p-6"
        >
          <h2 id="acces-titre" className="text-lg font-semibold">
            Accès et validité
          </h2>
          <actionFetcher.Form
            method="post"
            className="mt-4 flex items-end gap-3"
          >
            <input type="hidden" name="_csrf" value={csrf} />
            <input type="hidden" name="intent" value="set_expiry" />
            <div className="flex-1">
              <Input
                label="Date d'expiration"
                name="expiresAt"
                type="date"
                defaultValue={
                  proposal.expiresAt
                    ? proposal.expiresAt.toISOString().slice(0, 10)
                    : ""
                }
                hint={
                  loaderData.maxExpiryDays
                    ? `Plan gratuit : ${loaderData.maxExpiryDays} jours maximum.`
                    : "Laissez vide pour une validité illimitée."
                }
              />
            </div>
            <Button type="submit" variant="outline">
              Enregistrer
            </Button>
          </actionFetcher.Form>
          <actionFetcher.Form
            method="post"
            className="mt-4 flex items-end gap-3"
          >
            <input type="hidden" name="_csrf" value={csrf} />
            <input type="hidden" name="intent" value="set_access_code" />
            <div className="flex-1">
              <Input
                label="Code secret (facultatif)"
                name="code"
                autoComplete="off"
                placeholder={
                  loaderData.hasAccessCode
                    ? "Code actif — saisir pour changer"
                    : "Ex. : martin2026"
                }
                hint="Laissez vide et enregistrez pour retirer le code."
              />
            </div>
            <Button type="submit" variant="outline">
              Enregistrer
            </Button>
          </actionFetcher.Form>
        </section>
      </div>

      {/* Questions */}
      <section
        aria-labelledby="questions-titre"
        className="rounded-2xl border border-slate-200 bg-white p-6"
      >
        <h2 id="questions-titre" className="text-lg font-semibold">
          Questions du client{" "}
          {loaderData.questions.length > 0 && (
            <Badge tone="blue">{loaderData.questions.length}</Badge>
          )}
        </h2>
        {loaderData.questions.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            Aucune question pour le moment.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-4">
            {loaderData.questions.map((question) => (
              <li
                key={question.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <p className="text-sm">
                  <strong>{question.name}</strong>{" "}
                  <span className="text-slate-500">({question.email})</span> —{" "}
                  {formatDateTime(question.createdAt)}
                </p>
                <p className="mt-2 text-sm whitespace-pre-line text-slate-700">
                  {question.message}
                </p>
                {question.answeredAt ? (
                  <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                    <strong>Votre réponse :</strong> {question.answer}
                  </p>
                ) : (
                  <Form
                    method="post"
                    className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end"
                  >
                    <input type="hidden" name="_csrf" value={csrf} />
                    <input
                      type="hidden"
                      name="intent"
                      value="answer_question"
                    />
                    <input
                      type="hidden"
                      name="questionId"
                      value={question.id}
                    />
                    <div className="flex-1">
                      <Input label="Votre réponse" name="answer" required />
                    </div>
                    <Button type="submit" size="sm" variant="outline">
                      Répondre
                    </Button>
                  </Form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Demandes de modification */}
      <section
        aria-labelledby="modifications-titre"
        className="rounded-2xl border border-slate-200 bg-white p-6"
      >
        <h2 id="modifications-titre" className="text-lg font-semibold">
          Demandes de modification{" "}
          {loaderData.changeRequests.length > 0 && (
            <Badge tone="amber">{loaderData.changeRequests.length}</Badge>
          )}
        </h2>
        {loaderData.changeRequests.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            Aucune demande de modification.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-4">
            {loaderData.changeRequests.map((changeRequest) => (
              <li
                key={changeRequest.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm">
                    <strong>{changeRequest.name}</strong>{" "}
                    <span className="text-slate-500">
                      ({changeRequest.email})
                    </span>{" "}
                    — {formatDateTime(changeRequest.createdAt)}
                  </p>
                  {changeRequest.status === "resolved" ? (
                    <Badge tone="green">Traitée</Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        submitIntent("resolve_change", {
                          changeId: changeRequest.id,
                        })
                      }
                    >
                      Marquer comme traitée
                    </Button>
                  )}
                </div>
                <p className="mt-2 text-sm whitespace-pre-line text-slate-700">
                  {changeRequest.message}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
