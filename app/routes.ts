import {
  type RouteConfig,
  index,
  layout,
  prefix,
  route,
} from "@react-router/dev/routes";

export default [
  // ------------------------------------------------------------------
  // Site public (marketing)
  // ------------------------------------------------------------------
  layout("routes/marketing/layout.tsx", [
    index("routes/marketing/home.tsx"),
    route("fonctionnalites", "routes/marketing/fonctionnalites.tsx"),
    route("tarifs", "routes/marketing/tarifs.tsx"),
    route("contact", "routes/marketing/contact.tsx"),
    route("mentions-legales", "routes/marketing/mentions-legales.tsx"),
    route("confidentialite", "routes/marketing/confidentialite.tsx"),
    route(
      "conditions-utilisation",
      "routes/marketing/conditions-utilisation.tsx",
    ),
    // Pages de référencement naturel
    route(
      "devis-interactif-artisan",
      "routes/marketing/seo/devis-interactif-artisan.tsx",
    ),
    route(
      "presentation-devis-renovation",
      "routes/marketing/seo/presentation-devis-renovation.tsx",
    ),
    route(
      "suivi-ouverture-devis",
      "routes/marketing/seo/suivi-ouverture-devis.tsx",
    ),
    route(
      "devis-en-ligne-couvreur",
      "routes/marketing/seo/devis-en-ligne-couvreur.tsx",
    ),
    route(
      "devis-interactif-climatisation",
      "routes/marketing/seo/devis-interactif-climatisation.tsx",
    ),
    route(
      "devis-interactif-menuisier",
      "routes/marketing/seo/devis-interactif-menuisier.tsx",
    ),
    route(
      "comment-presenter-un-devis",
      "routes/marketing/seo/comment-presenter-un-devis.tsx",
    ),
    route(
      "client-ne-repond-pas-au-devis",
      "routes/marketing/seo/client-ne-repond-pas-au-devis.tsx",
    ),
  ]),

  // Démonstration publique (page DevisRoom fictive, sans navigation marketing)
  route("demonstration", "routes/demonstration.tsx"),

  // ------------------------------------------------------------------
  // Authentification
  // ------------------------------------------------------------------
  route("connexion", "routes/auth/connexion.tsx"),
  route("inscription", "routes/auth/inscription.tsx"),
  route("mot-de-passe-oublie", "routes/auth/mot-de-passe-oublie.tsx"),
  route("deconnexion", "routes/auth/deconnexion.tsx"),

  // ------------------------------------------------------------------
  // Espace professionnel
  // ------------------------------------------------------------------
  route("app/onboarding", "routes/app/onboarding.tsx"),
  layout("routes/app/layout.tsx", [
    route("app", "routes/app/dashboard.tsx"),
    route("app/devis", "routes/app/devis/liste.tsx"),
    route("app/devis/nouveau", "routes/app/devis/nouveau.tsx"),
    route("app/devis/:id", "routes/app/devis/detail.tsx"),
    route("app/devis/:id/modifier", "routes/app/devis/modifier.tsx"),
    route("app/devis/:id/statistiques", "routes/app/devis/statistiques.tsx"),
    route("app/recompenses", "routes/app/recompenses.tsx"),
    route("app/entreprise", "routes/app/entreprise.tsx"),
    route("app/abonnement", "routes/app/abonnement.tsx"),
    route("app/parametres", "routes/app/parametres.tsx"),
    route("app/notifications", "routes/app/notifications.tsx"),
    route("app/activite", "routes/app/activite.tsx"),
  ]),

  // ------------------------------------------------------------------
  // Administration
  // ------------------------------------------------------------------
  layout("routes/admin/layout.tsx", [
    route("admin", "routes/admin/dashboard.tsx"),
    route("admin/organisations", "routes/admin/organisations.tsx"),
    route("admin/utilisateurs", "routes/admin/utilisateurs.tsx"),
    route("admin/webhooks", "routes/admin/webhooks.tsx"),
    route("admin/audit", "routes/admin/audit.tsx"),
  ]),

  // ------------------------------------------------------------------
  // Page privée du client final
  // ------------------------------------------------------------------
  route("d/:slug", "routes/d/page.tsx"),
  route("d/:slug/fichier/:assetId", "routes/d/fichier.tsx"),
  route("d/:slug/pdf", "routes/d/pdf.tsx"),
  route("d/:slug/logo", "routes/d/logo.tsx"),

  // ------------------------------------------------------------------
  // API & ressources techniques
  // ------------------------------------------------------------------
  ...prefix("api", [
    route("stripe/webhook", "routes/api/stripe-webhook.tsx"),
    route("fichiers/:assetId", "routes/api/fichier.tsx"),
  ]),
  route("sitemap.xml", "routes/sitemap.tsx"),
  route("robots.txt", "routes/robots.tsx"),
] satisfies RouteConfig;
