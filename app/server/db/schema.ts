import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/** Horodatage en millisecondes, rempli automatiquement à l'insertion. */
const createdAt = integer("created_at", { mode: "timestamp_ms" })
  .notNull()
  .default(sql`(unixepoch() * 1000)`);

const updatedAt = integer("updated_at", { mode: "timestamp_ms" })
  .notNull()
  .default(sql`(unixepoch() * 1000)`);

// ---------------------------------------------------------------------------
// Utilisateurs et sessions
// ---------------------------------------------------------------------------

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    role: text("role", { enum: ["user", "admin"] })
      .notNull()
      .default("user"),
    suspendedAt: integer("suspended_at", { mode: "timestamp_ms" }),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
    createdAt,
    updatedAt,
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** SHA-256 du jeton de session — le jeton en clair ne vit que dans le cookie. */
    tokenHash: text("token_hash").notNull(),
    csrfToken: text("csrf_token").notNull(),
    userAgent: text("user_agent"),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }),
    createdAt,
  },
  (t) => [
    uniqueIndex("sessions_token_hash_idx").on(t.tokenHash),
    index("sessions_user_id_idx").on(t.userId),
    index("sessions_expires_at_idx").on(t.expiresAt),
  ],
);

export const passwordResetTokens = sqliteTable(
  "password_reset_tokens",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    usedAt: integer("used_at", { mode: "timestamp_ms" }),
    createdAt,
  },
  (t) => [
    uniqueIndex("password_reset_tokens_hash_idx").on(t.tokenHash),
    index("password_reset_tokens_user_idx").on(t.userId),
  ],
);

/** Limitation de débit persistée en D1 (compatible Workers sans état). */
export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  resetAt: integer("reset_at", { mode: "timestamp_ms" }).notNull(),
});

// ---------------------------------------------------------------------------
// Organisations et abonnements
// ---------------------------------------------------------------------------

export const organizations = sqliteTable(
  "organizations",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    profession: text("profession"),
    siret: text("siret"),
    email: text("email"),
    phone: text("phone"),
    address: text("address"),
    postalCode: text("postal_code"),
    city: text("city"),
    website: text("website"),
    logoKey: text("logo_key"),
    primaryColor: text("primary_color").notNull().default("#2563eb"),
    /** Lien Stripe Payment Link du professionnel pour l'acompte (mode simple). */
    stripePaymentLink: text("stripe_payment_link"),
    /** Instructions de virement affichées au client final (mode virement). */
    bankTransferDetails: text("bank_transfer_details"),
    /** Étape d'onboarding atteinte (0 à 5, 5 = terminé). */
    onboardingStep: integer("onboarding_step").notNull().default(0),
    suspendedAt: integer("suspended_at", { mode: "timestamp_ms" }),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
    createdAt,
    updatedAt,
  },
  (t) => [index("organizations_name_idx").on(t.name)],
);

export const organizationMembers = sqliteTable(
  "organization_members",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["owner", "admin", "member"] })
      .notNull()
      .default("member"),
    createdAt,
  },
  (t) => [
    uniqueIndex("organization_members_unique_idx").on(
      t.organizationId,
      t.userId,
    ),
    index("organization_members_user_idx").on(t.userId),
  ],
);

export const subscriptions = sqliteTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    plan: text("plan", { enum: ["free", "solo", "pro", "team"] })
      .notNull()
      .default("free"),
    interval: text("interval", { enum: ["monthly", "yearly"] }),
    status: text("status", {
      enum: ["active", "trialing", "past_due", "canceled"],
    })
      .notNull()
      .default("active"),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    currentPeriodEnd: integer("current_period_end", { mode: "timestamp_ms" }),
    cancelAtPeriodEnd: integer("cancel_at_period_end", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt,
    updatedAt,
  },
  (t) => [
    uniqueIndex("subscriptions_org_idx").on(t.organizationId),
    index("subscriptions_stripe_customer_idx").on(t.stripeCustomerId),
  ],
);

// ---------------------------------------------------------------------------
// Propositions (DevisRooms)
// ---------------------------------------------------------------------------

export const proposals = sqliteTable(
  "proposals",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id),
    /** Identifiant public non prévisible utilisé dans /d/[slug]. */
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    clientName: text("client_name").notNull(),
    clientEmail: text("client_email"),
    /** Message personnalisé affiché en tête de page. */
    message: text("message"),
    summary: text("summary"),
    /** Conditions affichées au client au moment de l'acceptation. */
    terms: text("terms"),
    currency: text("currency").notNull().default("EUR"),
    /** Montant de l'offre principale, en centimes. */
    totalAmountCents: integer("total_amount_cents").notNull().default(0),
    status: text("status", { enum: ["draft", "published"] })
      .notNull()
      .default("draft"),
    outcome: text("outcome", {
      enum: ["pending", "won", "lost", "expired"],
    })
      .notNull()
      .default("pending"),
    /** Code secret facultatif (haché) exigé avant d'ouvrir la page. */
    accessCodeHash: text("access_code_hash"),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
    acceptedAt: integer("accepted_at", { mode: "timestamp_ms" }),
    archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
    /** Version courante de la proposition (incrémentée à chaque publication). */
    version: integer("version").notNull().default(1),
    depositEnabled: integer("deposit_enabled", { mode: "boolean" })
      .notNull()
      .default(false),
    depositMode: text("deposit_mode", {
      enum: ["stripe_link", "bank_transfer"],
    }),
    depositAmountCents: integer("deposit_amount_cents"),
    /** PDF original importé, conservé en pièce jointe (clé R2). */
    pdfKey: text("pdf_key"),
    pdfFilename: text("pdf_filename"),
    createdAt,
    updatedAt,
  },
  (t) => [
    uniqueIndex("proposals_slug_idx").on(t.slug),
    index("proposals_org_idx").on(t.organizationId),
    index("proposals_status_idx").on(t.status),
  ],
);

export const proposalVersions = sqliteTable(
  "proposal_versions",
  {
    id: text("id").primaryKey(),
    proposalId: text("proposal_id")
      .notNull()
      .references(() => proposals.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    /** Instantané JSON complet de la proposition au moment de la publication. */
    snapshot: text("snapshot", { mode: "json" }).notNull(),
    createdByUserId: text("created_by_user_id").references(() => users.id),
    createdAt,
  },
  (t) => [
    uniqueIndex("proposal_versions_unique_idx").on(t.proposalId, t.version),
  ],
);

export const proposalSections = sqliteTable(
  "proposal_sections",
  {
    id: text("id").primaryKey(),
    proposalId: text("proposal_id")
      .notNull()
      .references(() => proposals.id, { onDelete: "cascade" }),
    type: text("type", {
      enum: ["services", "steps", "timeline", "guarantees", "faq", "custom"],
    }).notNull(),
    title: text("title").notNull(),
    /** Contenu structuré, validé par Zod selon le type de section. */
    content: text("content", { mode: "json" }).notNull(),
    position: integer("position").notNull().default(0),
    createdAt,
    updatedAt,
  },
  (t) => [index("proposal_sections_proposal_idx").on(t.proposalId)],
);

export const proposalPackages = sqliteTable(
  "proposal_packages",
  {
    id: text("id").primaryKey(),
    proposalId: text("proposal_id")
      .notNull()
      .references(() => proposals.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    priceCents: integer("price_cents").notNull(),
    /** Liste des prestations incluses (tableau JSON de chaînes). */
    features: text("features", { mode: "json" }).notNull().default("[]"),
    isRecommended: integer("is_recommended", { mode: "boolean" })
      .notNull()
      .default(false),
    position: integer("position").notNull().default(0),
    createdAt,
    updatedAt,
  },
  (t) => [index("proposal_packages_proposal_idx").on(t.proposalId)],
);

export const proposalOptions = sqliteTable(
  "proposal_options",
  {
    id: text("id").primaryKey(),
    proposalId: text("proposal_id")
      .notNull()
      .references(() => proposals.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    priceCents: integer("price_cents").notNull(),
    position: integer("position").notNull().default(0),
    createdAt,
    updatedAt,
  },
  (t) => [index("proposal_options_proposal_idx").on(t.proposalId)],
);

export const proposalAssets = sqliteTable(
  "proposal_assets",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    proposalId: text("proposal_id").references(() => proposals.id, {
      onDelete: "cascade",
    }),
    kind: text("kind", {
      enum: ["pdf", "image", "logo", "document"],
    }).notNull(),
    r2Key: text("r2_key").notNull(),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    position: integer("position").notNull().default(0),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
    createdAt,
  },
  (t) => [
    uniqueIndex("proposal_assets_r2_key_idx").on(t.r2Key),
    index("proposal_assets_proposal_idx").on(t.proposalId),
    index("proposal_assets_org_idx").on(t.organizationId),
  ],
);

// ---------------------------------------------------------------------------
// Activité côté client final
// ---------------------------------------------------------------------------

export const proposalViews = sqliteTable(
  "proposal_views",
  {
    id: text("id").primaryKey(),
    proposalId: text("proposal_id")
      .notNull()
      .references(() => proposals.id, { onDelete: "cascade" }),
    /** Identifiant de session de visite (cookie aléatoire, non nominatif). */
    visitorId: text("visitor_id").notNull(),
    device: text("device", { enum: ["mobile", "tablet", "desktop", "unknown"] })
      .notNull()
      .default("unknown"),
    createdAt,
  },
  (t) => [
    index("proposal_views_proposal_idx").on(t.proposalId),
    index("proposal_views_visitor_idx").on(t.proposalId, t.visitorId),
  ],
);

export const proposalEvents = sqliteTable(
  "proposal_events",
  {
    id: text("id").primaryKey(),
    proposalId: text("proposal_id")
      .notNull()
      .references(() => proposals.id, { onDelete: "cascade" }),
    type: text("type", {
      enum: [
        "published",
        "unpublished",
        "first_view",
        "view",
        "package_selected",
        "option_selected",
        "question_asked",
        "change_requested",
        "accepted",
        "deposit_started",
        "expired",
        "outcome_changed",
        "archived",
      ],
    }).notNull(),
    data: text("data", { mode: "json" }),
    createdAt,
  },
  (t) => [
    index("proposal_events_proposal_idx").on(t.proposalId),
    index("proposal_events_created_idx").on(t.createdAt),
  ],
);

export const proposalQuestions = sqliteTable(
  "proposal_questions",
  {
    id: text("id").primaryKey(),
    proposalId: text("proposal_id")
      .notNull()
      .references(() => proposals.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    message: text("message").notNull(),
    answer: text("answer"),
    answeredAt: integer("answered_at", { mode: "timestamp_ms" }),
    createdAt,
  },
  (t) => [index("proposal_questions_proposal_idx").on(t.proposalId)],
);

export const proposalChangeRequests = sqliteTable(
  "proposal_change_requests",
  {
    id: text("id").primaryKey(),
    proposalId: text("proposal_id")
      .notNull()
      .references(() => proposals.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    message: text("message").notNull(),
    status: text("status", { enum: ["open", "resolved"] })
      .notNull()
      .default("open"),
    resolvedAt: integer("resolved_at", { mode: "timestamp_ms" }),
    createdAt,
  },
  (t) => [index("proposal_change_requests_proposal_idx").on(t.proposalId)],
);

export const proposalAcceptances = sqliteTable(
  "proposal_acceptances",
  {
    id: text("id").primaryKey(),
    proposalId: text("proposal_id")
      .notNull()
      .references(() => proposals.id, { onDelete: "cascade" }),
    /** Version de la proposition effectivement acceptée. */
    proposalVersion: integer("proposal_version").notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    packageId: text("package_id"),
    packageName: text("package_name").notNull(),
    /** Options sélectionnées : tableau JSON `{ id, name, priceCents }`. */
    selectedOptions: text("selected_options", { mode: "json" })
      .notNull()
      .default("[]"),
    totalCents: integer("total_cents").notNull(),
    termsAccepted: integer("terms_accepted", { mode: "boolean" }).notNull(),
    userAgent: text("user_agent"),
    /**
     * Adresse IP — enregistrée uniquement comme élément de preuve de
     * l'acceptation (intérêt légitime, voir /confidentialite).
     */
    ipAddress: text("ip_address"),
    createdAt,
  },
  (t) => [index("proposal_acceptances_proposal_idx").on(t.proposalId)],
);

// ---------------------------------------------------------------------------
// Notifications et audit
// ---------------------------------------------------------------------------

export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    /** Null = notification visible par tous les membres de l'organisation. */
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    /** Chemin interne vers la ressource concernée (ex. /app/devis/xxx). */
    linkTo: text("link_to"),
    readAt: integer("read_at", { mode: "timestamp_ms" }),
    createdAt,
  },
  (t) => [
    index("notifications_org_idx").on(t.organizationId, t.createdAt),
    index("notifications_read_idx").on(t.organizationId, t.readAt),
  ],
);

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id),
    organizationId: text("organization_id").references(() => organizations.id),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    data: text("data", { mode: "json" }),
    ipAddress: text("ip_address"),
    createdAt,
  },
  (t) => [
    index("audit_logs_org_idx").on(t.organizationId, t.createdAt),
    index("audit_logs_action_idx").on(t.action),
  ],
);

/** Webhooks Stripe reçus — idempotence et affichage dans l'administration. */
export const stripeWebhookEvents = sqliteTable(
  "stripe_webhook_events",
  {
    /** ID de l'événement Stripe (evt_...). */
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    payload: text("payload", { mode: "json" }),
    processedAt: integer("processed_at", { mode: "timestamp_ms" }),
    error: text("error"),
    createdAt,
  },
  (t) => [index("stripe_webhook_events_type_idx").on(t.type)],
);
