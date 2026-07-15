import { useMemo, useState } from "react";
import { useFetcher } from "react-router";
import { formatDate, formatEuros } from "~/lib/format";
import { computeTotal } from "~/lib/pricing";
import type { PublicProposalVM } from "~/lib/proposal-vm";
import type {
  CustomContent,
  FaqContent,
  GuaranteesContent,
  ServicesContent,
  StepsContent,
  TimelineContent,
} from "~/lib/sections";
import { Modal } from "../ui/overlays";
import { Alert, Button, Checkbox, Input, Textarea } from "../ui/primitives";
import { OptionsSelector, PackageSelector } from "./selectors";

/**
 * Page publique d'une DevisRoom — utilisée par /d/[slug] et par la
 * démonstration. Rapide, sobre, adaptée au mobile, sans navigation inutile.
 */
export function ProposalPublicPage({ vm }: { vm: PublicProposalVM }) {
  const accent = vm.organization.primaryColor || "#2563eb";
  const hasPackages = vm.packages.length > 0;
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(
    hasPackages
      ? (vm.packages.find((p) => p.isRecommended)?.id ?? vm.packages[0].id)
      : null,
  );
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [modal, setModal] = useState<null | "accept" | "question" | "change">(
    null,
  );
  const [demoAccepted, setDemoAccepted] = useState(false);

  const eventFetcher = useFetcher();

  const pricing = useMemo(
    () =>
      computeTotal(
        hasPackages
          ? vm.packages
          : [{ id: "__base__", priceCents: vm.proposal.totalAmountCents }],
        vm.options,
        {
          packageId: hasPackages ? selectedPackageId : "__base__",
          optionIds: selectedOptionIds,
        },
      ),
    [vm, hasPackages, selectedPackageId, selectedOptionIds],
  );

  const accepted = Boolean(vm.proposal.acceptedAt) || demoAccepted;
  const selectedPackage = vm.packages.find((p) => p.id === selectedPackageId);

  function trackEvent(intent: string, data: Record<string, string>) {
    if (vm.isDemo) return;
    eventFetcher.submit(
      { intent, ...data },
      { method: "post", action: `/d/${vm.slug}` },
    );
  }

  function selectPackage(id: string) {
    setSelectedPackageId(id);
    const pkg = vm.packages.find((p) => p.id === id);
    if (pkg) trackEvent("select_package", { name: pkg.name });
  }

  function toggleOption(id: string) {
    const willSelect = !selectedOptionIds.includes(id);
    setSelectedOptionIds((current) =>
      willSelect ? [...current, id] : current.filter((x) => x !== id),
    );
    const option = vm.options.find((o) => o.id === id);
    if (willSelect && option)
      trackEvent("select_option", { name: option.name });
  }

  const org = vm.organization;
  const contactLine = [
    org.address,
    [org.postalCode, org.city].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="min-h-screen bg-slate-50 pb-28 text-slate-900">
      {vm.isDemo && (
        <div
          role="status"
          className="bg-amber-400 px-4 py-2 text-center text-sm font-semibold text-amber-950"
        >
          Démonstration fictive — l'entreprise « {org.name} » et ce devis
          n'existent pas. Aucune action n'est réelle.
        </div>
      )}

      {/* En-tête entreprise */}
      <header className="border-b-4 bg-white" style={{ borderColor: accent }}>
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-6 sm:px-6">
          {org.logoUrl ? (
            <img
              src={org.logoUrl}
              alt={`Logo de ${org.name}`}
              className="size-14 rounded-xl border border-slate-200 object-contain"
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex size-14 items-center justify-center rounded-xl text-xl font-bold text-white"
              style={{ backgroundColor: accent }}
            >
              {org.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-lg font-bold">{org.name}</p>
            {org.profession && (
              <p className="text-sm text-slate-500">{org.profession}</p>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-10 sm:px-6">
        {/* Titre + résumé */}
        <section aria-labelledby="titre-projet">
          <p className="text-sm font-medium text-slate-500">
            Proposition pour {vm.proposal.clientName}
          </p>
          <h1
            id="titre-projet"
            className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl"
          >
            {vm.proposal.title}
          </h1>
          {vm.proposal.expiresAt && !accepted && (
            <p className="mt-2 text-sm text-slate-500">
              Proposition valable jusqu'au {formatDate(vm.proposal.expiresAt)}.
            </p>
          )}
          {vm.proposal.message && (
            <div
              className="mt-5 rounded-2xl border-l-4 bg-white p-5 text-slate-700 shadow-sm"
              style={{ borderColor: accent }}
            >
              <p className="whitespace-pre-line">{vm.proposal.message}</p>
            </div>
          )}
          {vm.proposal.summary && (
            <div className="mt-5">
              <h2 className="text-lg font-semibold">Résumé du projet</h2>
              <p className="mt-2 whitespace-pre-line text-slate-700">
                {vm.proposal.summary}
              </p>
            </div>
          )}
        </section>

        {accepted && (
          <Alert tone="success" title="Proposition acceptée">
            Merci ! Votre acceptation a bien été enregistrée. {org.name} vous
            recontacte rapidement pour la suite.
          </Alert>
        )}

        {/* Sections structurées */}
        {vm.sections.map((section) => (
          <SectionBlock key={section.id} section={section} accent={accent} />
        ))}

        {/* Photos */}
        {vm.images.length > 0 && (
          <section aria-labelledby="photos-titre">
            <h2 id="photos-titre" className="text-lg font-semibold">
              Photos
            </h2>
            <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {vm.images.map((image) => (
                <li key={image.id}>
                  <img
                    src={image.url}
                    alt={image.filename}
                    loading="lazy"
                    className="aspect-4/3 w-full rounded-xl border border-slate-200 object-cover"
                  />
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Choix de la formule */}
        {vm.packages.length > 0 && (
          <section aria-labelledby="formules-titre">
            <h2 id="formules-titre" className="text-lg font-semibold">
              {vm.packages.length > 1
                ? "Choisissez votre formule"
                : "Votre offre"}
            </h2>
            <div className="mt-4">
              <PackageSelector
                packages={vm.packages}
                selectedId={selectedPackageId}
                onSelect={selectPackage}
                accentColor={accent}
              />
            </div>
          </section>
        )}

        {/* Options */}
        {vm.options.length > 0 && (
          <section aria-labelledby="options-titre">
            <h2 id="options-titre" className="text-lg font-semibold">
              Options supplémentaires
            </h2>
            <div className="mt-4">
              <OptionsSelector
                options={vm.options}
                selectedIds={selectedOptionIds}
                onToggle={toggleOption}
                accentColor={accent}
              />
            </div>
          </section>
        )}

        {/* Prix final */}
        <section
          aria-labelledby="total-titre"
          className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
        >
          <h2 id="total-titre" className="text-lg font-semibold">
            Votre sélection
          </h2>
          <dl className="mt-3 flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600">
                {selectedPackage ? selectedPackage.name : "Offre principale"}
              </dt>
              <dd className="font-medium">
                {formatEuros(pricing.packageCents)}
              </dd>
            </div>
            {selectedOptionIds.map((id) => {
              const option = vm.options.find((o) => o.id === id);
              if (!option) return null;
              return (
                <div key={id} className="flex justify-between">
                  <dt className="text-slate-600">{option.name}</dt>
                  <dd className="font-medium">
                    + {formatEuros(option.priceCents)}
                  </dd>
                </div>
              );
            })}
            <div className="mt-2 flex justify-between border-t border-slate-200 pt-3 text-base font-bold">
              <dt>Total TTC</dt>
              <dd style={{ color: accent }}>
                {formatEuros(pricing.totalCents)}
              </dd>
            </div>
          </dl>
          {!accepted && (
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                className="flex-1"
                style={{ backgroundColor: accent }}
                onClick={() => setModal("accept")}
              >
                J'accepte cette proposition
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="flex-1"
                onClick={() => setModal("change")}
              >
                Demander une modification
              </Button>
            </div>
          )}
        </section>

        {/* Acompte */}
        {vm.proposal.depositEnabled && (
          <DepositSection vm={vm} accent={accent} accepted={accepted} />
        )}

        {/* Contact + documents */}
        <section
          aria-labelledby="contact-titre"
          className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
        >
          <h2 id="contact-titre" className="text-lg font-semibold">
            Vos interlocuteurs
          </h2>
          <div className="mt-3 flex flex-col gap-1.5 text-sm text-slate-700">
            <p className="font-medium">{org.name}</p>
            {contactLine && <p>{contactLine}</p>}
            {org.phone && (
              <p>
                Téléphone :{" "}
                <a
                  href={`tel:${org.phone.replace(/\s/g, "")}`}
                  className="underline"
                >
                  {org.phone}
                </a>
              </p>
            )}
            {org.email && (
              <p>
                E-mail :{" "}
                <a href={`mailto:${org.email}`} className="underline">
                  {org.email}
                </a>
              </p>
            )}
            {org.website && (
              <p>
                Site :{" "}
                <a href={org.website} rel="noreferrer" className="underline">
                  {org.website}
                </a>
              </p>
            )}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => setModal("question")}>
              Poser une question
            </Button>
            {vm.proposal.pdfUrl && (
              <a
                href={vm.proposal.pdfUrl}
                className="inline-flex items-center justify-center rounded-(--radius-button) border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
                download
              >
                Télécharger le devis PDF original
              </a>
            )}
          </div>
        </section>

        {vm.branding !== "none" && (
          <p className="text-center text-xs text-slate-400">
            {vm.branding === "full" ? (
              <>
                Page créée avec{" "}
                <a href="/" className="font-medium underline">
                  DevisRoom
                </a>{" "}
                — transformez vos devis PDF en pages claires.
              </>
            ) : (
              <a href="/" className="underline">
                DevisRoom
              </a>
            )}
          </p>
        )}
      </main>

      {/* Barre totale fixe sur mobile */}
      {!accepted && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500">Total TTC</p>
              <p className="text-lg font-bold" style={{ color: accent }}>
                {formatEuros(pricing.totalCents)}
              </p>
            </div>
            <Button
              style={{ backgroundColor: accent }}
              onClick={() => setModal("accept")}
            >
              J'accepte
            </Button>
          </div>
        </div>
      )}

      <AcceptModal
        vm={vm}
        open={modal === "accept"}
        onClose={() => setModal(null)}
        packageId={selectedPackage?.id ?? null}
        packageName={selectedPackage?.name ?? "Offre principale"}
        optionIds={selectedOptionIds}
        totalCents={pricing.totalCents}
        onDemoAccept={() => {
          setDemoAccepted(true);
          setModal(null);
        }}
      />
      <MessageModal
        vm={vm}
        kind="question"
        open={modal === "question"}
        onClose={() => setModal(null)}
      />
      <MessageModal
        vm={vm}
        kind="change"
        open={modal === "change"}
        onClose={() => setModal(null)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rendu des sections
// ---------------------------------------------------------------------------

function SectionBlock({
  section,
  accent,
}: {
  section: PublicProposalVM["sections"][number];
  accent: string;
}) {
  const content = section.content;
  return (
    <section aria-label={section.title}>
      <h2 className="text-lg font-semibold">{section.title}</h2>
      <div className="mt-3">
        {section.type === "services" && (
          <ul className="flex flex-col gap-3">
            {(content as ServicesContent).items.map((item, i) => (
              <li
                key={i}
                className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
              >
                <p className="font-medium">{item.name}</p>
                {item.description && (
                  <p className="mt-1 text-sm whitespace-pre-line text-slate-600">
                    {item.description}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
        {section.type === "steps" && (
          <ol
            className="relative flex flex-col gap-5 border-l-2 pl-6"
            style={{ borderColor: accent }}
          >
            {(content as StepsContent).items.map((item, i) => (
              <li key={i} className="relative">
                <span
                  aria-hidden="true"
                  className="absolute top-0 -left-[31px] flex size-6 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: accent }}
                >
                  {i + 1}
                </span>
                <p className="font-medium">{item.title}</p>
                {item.description && (
                  <p className="mt-0.5 text-sm text-slate-600">
                    {item.description}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
        {section.type === "timeline" && (
          <dl className="grid gap-3 sm:grid-cols-2">
            {(content as TimelineContent).items.map((item, i) => (
              <div
                key={i}
                className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
              >
                <dt className="text-sm text-slate-500">{item.label}</dt>
                <dd className="mt-0.5 font-semibold">{item.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {section.type === "guarantees" && (
          <ul className="grid gap-3 sm:grid-cols-2">
            {(content as GuaranteesContent).items.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="mt-0.5 size-5 shrink-0"
                  style={{ color: accent }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                  />
                </svg>
                <span>
                  <span className="font-medium">{item.title}</span>
                  {item.description && (
                    <span className="mt-0.5 block text-sm text-slate-600">
                      {item.description}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
        {section.type === "faq" && (
          <div className="flex flex-col gap-2">
            {(content as FaqContent).items.map((item, i) => (
              <details
                key={i}
                className="group rounded-xl bg-white shadow-sm ring-1 ring-slate-200"
              >
                <summary className="cursor-pointer list-none px-4 py-3 font-medium marker:hidden">
                  <span className="flex items-center justify-between gap-2">
                    {item.question}
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="size-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                </summary>
                <p className="px-4 pb-4 text-sm whitespace-pre-line text-slate-600">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        )}
        {section.type === "custom" && (
          <p className="whitespace-pre-line text-slate-700">
            {(content as CustomContent).text}
          </p>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Acompte
// ---------------------------------------------------------------------------

function DepositSection({
  vm,
  accent,
  accepted,
}: {
  vm: PublicProposalVM;
  accent: string;
  accepted: boolean;
}) {
  const fetcher = useFetcher();
  const amount = vm.proposal.depositAmountCents;
  return (
    <section
      aria-labelledby="acompte-titre"
      className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
    >
      <h2 id="acompte-titre" className="text-lg font-semibold">
        Acompte
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        {amount
          ? `Pour lancer le projet, un acompte de ${formatEuros(amount)} est demandé.`
          : "Pour lancer le projet, un acompte est demandé."}
        {!accepted &&
          " Vous pourrez le régler après avoir accepté la proposition."}
      </p>
      {vm.proposal.depositMode === "stripe_link" &&
        vm.deposit.stripePaymentLink && (
          <fetcher.Form
            method="post"
            action={vm.slug ? `/d/${vm.slug}` : undefined}
            onSubmit={(event) => {
              if (vm.isDemo) {
                event.preventDefault();
                window.alert(
                  "Démonstration : vous seriez redirigé vers la page de paiement Stripe de l'entreprise.",
                );
              }
            }}
          >
            <input type="hidden" name="intent" value="deposit_start" />
            <Button
              type="submit"
              size="lg"
              className="mt-4"
              style={{ backgroundColor: accent }}
              disabled={!accepted}
            >
              Payer l'acompte en ligne
            </Button>
            {!accepted && (
              <p className="mt-2 text-xs text-slate-500">
                Disponible après acceptation de la proposition.
              </p>
            )}
          </fetcher.Form>
        )}
      {vm.proposal.depositMode === "bank_transfer" &&
        vm.deposit.bankTransferDetails && (
          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm whitespace-pre-line text-slate-700">
            {vm.deposit.bankTransferDetails}
          </div>
        )}
      <p className="mt-3 text-xs text-slate-400">
        Le paiement est encaissé directement par {vm.organization.name}.
        DevisRoom ne détient jamais vos fonds.
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Modale d'acceptation
// ---------------------------------------------------------------------------

function AcceptModal({
  vm,
  open,
  onClose,
  packageId,
  packageName,
  optionIds,
  totalCents,
  onDemoAccept,
}: {
  vm: PublicProposalVM;
  open: boolean;
  onClose: () => void;
  packageId: string | null;
  packageName: string;
  optionIds: string[];
  totalCents: number;
  onDemoAccept: () => void;
}) {
  const fetcher = useFetcher<{ ok: boolean; error?: string }>();
  const submitting = fetcher.state !== "idle";
  const error = fetcher.data && !fetcher.data.ok ? fetcher.data.error : null;

  return (
    <Modal open={open} onClose={onClose} title="Accepter la proposition">
      <fetcher.Form
        method="post"
        action={vm.slug ? `/d/${vm.slug}` : undefined}
        onSubmit={(event) => {
          if (vm.isDemo) {
            event.preventDefault();
            onDemoAccept();
          }
        }}
        className="flex flex-col gap-4"
      >
        <input type="hidden" name="intent" value="accept" />
        <input type="hidden" name="packageId" value={packageId ?? ""} />
        <input type="hidden" name="optionIds" value={optionIds.join(",")} />
        <input type="hidden" name="confirmedTotalCents" value={totalCents} />

        <div className="rounded-xl bg-slate-50 p-4 text-sm">
          <p>
            Formule : <strong>{packageName}</strong>
          </p>
          <p className="mt-1">
            Montant total TTC : <strong>{formatEuros(totalCents)}</strong>
          </p>
        </div>

        <Input
          label="Votre nom complet"
          name="name"
          required
          maxLength={120}
          autoComplete="name"
        />
        <Input
          label="Votre adresse e-mail"
          name="email"
          type="email"
          required
          maxLength={200}
          autoComplete="email"
        />
        <Checkbox
          name="confirmSelection"
          value="yes"
          required
          label={
            <>
              Je confirme accepter la proposition « {packageName} » pour un
              montant total de {formatEuros(totalCents)} TTC.
            </>
          }
        />
        {vm.proposal.terms && (
          <div className="max-h-32 overflow-y-auto rounded-xl border border-slate-200 p-3 text-xs whitespace-pre-line text-slate-600">
            {vm.proposal.terms}
          </div>
        )}
        <Checkbox
          name="termsAccepted"
          value="yes"
          required
          label="J'accepte les conditions présentées par l'entreprise."
        />

        {error && <Alert tone="error">{error}</Alert>}

        <Button type="submit" size="lg" loading={submitting}>
          Confirmer mon acceptation
        </Button>
        <p className="text-xs text-slate-500">
          Cette acceptation ne constitue pas une signature électronique
          qualifiée. L'entreprise reste responsable de ses obligations
          contractuelles.
        </p>
      </fetcher.Form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Modales question / demande de modification
// ---------------------------------------------------------------------------

function MessageModal({
  vm,
  kind,
  open,
  onClose,
}: {
  vm: PublicProposalVM;
  kind: "question" | "change";
  open: boolean;
  onClose: () => void;
}) {
  const fetcher = useFetcher<{ ok: boolean; error?: string }>();
  const [demoSent, setDemoSent] = useState(false);
  const submitting = fetcher.state !== "idle";
  const sent = demoSent || fetcher.data?.ok === true;
  const error = fetcher.data && !fetcher.data.ok ? fetcher.data.error : null;

  const title =
    kind === "question" ? "Poser une question" : "Demander une modification";

  return (
    <Modal open={open} onClose={onClose} title={title}>
      {sent ? (
        <div className="flex flex-col gap-4">
          <Alert tone="success">
            Votre message a bien été transmis à {vm.organization.name}. Vous
            recevrez une réponse à l'adresse indiquée.
          </Alert>
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      ) : (
        <fetcher.Form
          method="post"
          action={vm.slug ? `/d/${vm.slug}` : undefined}
          onSubmit={(event) => {
            if (vm.isDemo) {
              event.preventDefault();
              setDemoSent(true);
            }
          }}
          className="flex flex-col gap-4"
        >
          <input
            type="hidden"
            name="intent"
            value={kind === "question" ? "question" : "change_request"}
          />
          <Input
            label="Votre nom"
            name="name"
            required
            maxLength={120}
            autoComplete="name"
          />
          <Input
            label="Votre adresse e-mail"
            name="email"
            type="email"
            required
            maxLength={200}
            autoComplete="email"
          />
          <Textarea
            label={
              kind === "question"
                ? "Votre question"
                : "Décrivez la modification souhaitée"
            }
            name="message"
            required
            minLength={5}
            maxLength={3000}
          />
          {error && <Alert tone="error">{error}</Alert>}
          <Button type="submit" loading={submitting}>
            Envoyer
          </Button>
        </fetcher.Form>
      )}
    </Modal>
  );
}
