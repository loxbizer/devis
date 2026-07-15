# Sécurité — DevisRoom

## Authentification et sessions

- Mots de passe hachés en **PBKDF2-SHA256, 100 000 itérations, sel aléatoire
  de 16 octets** (WebCrypto — compatible Workers). Jamais de stockage en clair.
- Sessions opaques : jeton de 256 bits aléatoires dans un cookie
  `HttpOnly; Secure (prod); SameSite=Lax` ; seul le **SHA-256 du jeton** est
  stocké en base. Expiration 30 jours, nettoyage opportuniste.
- Suspension d'un compte = invalidation immédiate de toutes ses sessions.
- Réinitialisation de mot de passe : jetons à usage unique, hachés, expirant
  en 1 h (envoi via l'adaptateur e-mail).

## CSRF

- Jeton CSRF par session, exigé (`_csrf`) sur toutes les mutations
  authentifiées (`verifyCsrf`).
- Contrôle d'origine (`Origin` vs hôte) sur toutes les mutations, y compris
  publiques (`assertSameOrigin`).
- Cookies en `SameSite=Lax`.

## Contrôle d'accès

- Toutes les routes `/app/*` passent par `requireOrg` : session valide +
  appartenance à l'organisation. **Chaque requête SQL est filtrée par
  `organizationId`** — testé (une organisation ne voit jamais les devis d'une
  autre).
- `/admin/*` exige le rôle `admin` (`requireAdmin`).
- Les pages publiques `/d/:slug` n'exposent qu'un modèle de vue minimal :
  jamais d'identifiants internes, de statistiques ni de données d'autres
  propositions.
- Fichiers R2 servis uniquement via des routes de contrôle : le professionnel
  n'accède qu'aux fichiers de son organisation ; le client final qu'aux
  fichiers de la proposition publiée correspondant au slug.

## URLs non prévisibles

- Slug public : 12 octets aléatoires (hex) ≈ 96 bits d'entropie.
- Clés R2 : `org/kind/<128 bits aléatoires>.<ext>`.
- Code secret facultatif par proposition (haché, insensible à la casse),
  limité à 10 essais / 15 min / IP.

## Limitation de débit

Persistée en D1 (aucun service externe) : connexion (10/15 min par IP **et**
par compte), inscription (5/h), réinitialisation (5/h), formulaires publics
(10/10 min), code d'accès (10/15 min), uploads (60/h).

## Turnstile (anti-bot)

Protection supplémentaire, jamais un verrou : la vérification n'est
appliquée qu'en production **et** avec une configuration complète (site key
et secret key). En développement, en cas de configuration incomplète ou si
l'API Cloudflare est injoignable, elle laisse passer (journalisé) — le rate
limiting et le hachage des mots de passe restent actifs dans tous les cas.
Un utilisateur légitime ne doit jamais être enfermé dehors.

## Fichiers

- Types vérifiés par **signatures binaires** (magic bytes), pas seulement le
  MIME déclaré. Formats : PDF, JPG, PNG, WebP.
- Limites : PDF 15 Mo, image 8 Mo, 20 images/proposition, quota de stockage
  par plan vérifié avant chaque écriture.
- Suppression d'une proposition = suppression de ses fichiers R2
  (anti-orphelins).

## En-têtes HTTP (workers/app.ts)

- `Content-Security-Policy` restrictive (self + Turnstile ; `form-action`
  limité à self + Stripe).
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`
  minimal, COOP `same-origin`.
- Pages privées : `X-Robots-Tag: noindex` + `Cache-Control: private, no-store`.

## Injections

- SQL : uniquement des requêtes paramétrées via Drizzle — aucune concaténation.
- XSS : React échappe par défaut ; le seul `dangerouslySetInnerHTML` sert le
  JSON-LD généré à partir de données statiques internes.
- Zod valide toutes les entrées (formulaires, JSON des sections, webhooks).

## Stripe

- Signature des webhooks vérifiée (`constructEventAsync`) avec
  `STRIPE_WEBHOOK_SECRET` ; événements idempotents et journalisés.
- Aucune activation d'abonnement depuis le navigateur.
- Aucune clé secrète côté client ; secrets uniquement dans les variables
  Wrangler (`wrangler secret put`).
- Les Payment Links saisis par les professionnels sont restreints aux
  domaines Stripe (`buy.stripe.com`, `checkout.stripe.com`).

## Journal d'audit

Actions sensibles tracées dans `audit_logs` (connexions, échecs, publications,
suppressions, actions d'administration) avec IP lorsqu'elle est pertinente.

## Données personnelles

- IP du client final conservée **uniquement** comme élément de preuve d'une
  acceptation (intérêt légitime, documenté dans /confidentialite).
- Comptage de vues par cookie technique aléatoire, non nominatif, sans
  précision trompeuse ni pixel tiers.

## Signalement

Signalez toute vulnérabilité via la page /contact de l'instance. Merci de ne
pas divulguer publiquement avant correction.
