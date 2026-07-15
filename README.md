# DevisRoom

**Transformez vos devis PDF en pages claires qui rassurent vos clients et
facilitent leur décision.**

Gardez votre logiciel habituel. Importez votre devis, personnalisez sa
présentation et envoyez un lien privé à votre client.

DevisRoom est un SaaS français pour artisans et entreprises de services
(couvreurs, rénovation, climatisation, menuisiers, paysagistes, piscinistes,
cuisinistes, peintres, électriciens, plombiers…). Il ne remplace pas un
logiciel de facturation et ne fournit pas de signature électronique qualifiée.

## Sommaire

- [Architecture](#architecture)
- [Installation](#installation)
- [Lancement local](#lancement-local)
- [Commandes](#commandes)
- [Base de données (D1)](#base-de-données-d1)
- [Stockage (R2)](#stockage-r2)
- [Turnstile](#turnstile)
- [Stripe](#stripe)
- [Tests](#tests)
- [Déploiement Cloudflare](#déploiement-cloudflare)
- [Limites du plan gratuit](#limites-du-plan-gratuit)
- [Problèmes connus](#problèmes-connus)
- [Checklist de production](#checklist-de-production)

## Architecture

- **Framework** : React Router v8 (mode framework, successeur de Remix) —
  choisi pour sa compatibilité de premier ordre avec Cloudflare via le plugin
  Vite officiel `@cloudflare/vite-plugin` (Next.js + OpenNext a été écarté :
  intégration moins stable sur Workers).
- **Runtime** : Cloudflare Workers (SSR), coût fixe nul au lancement.
- **Base de données** : Cloudflare D1 (SQLite) + Drizzle ORM.
- **Fichiers** : Cloudflare R2 (PDF, photos, logos), servis via des routes
  contrôlées — jamais d'accès public direct au bucket.
- **UI** : React 19, TypeScript strict, Tailwind CSS v4, Motion (animations).
- **Paiements** : Stripe Checkout + webhooks (abonnements uniquement — les
  acomptes des clients finaux vont directement au professionnel).
- **Anti-bot** : Cloudflare Turnstile. **Validation** : Zod partout.
- **Tests** : Vitest (unitaires + intégration) et Playwright (bout en bout).
- **PDF** : extraction de texte côté navigateur avec PDF.js (gratuit, aucun
  OCR payant, aucune IA appelée en production).

Voir [ARCHITECTURE.md](./ARCHITECTURE.md) pour le détail, et aussi :
[SECURITY.md](./SECURITY.md) · [DEPLOYMENT.md](./DEPLOYMENT.md) ·
[STRIPE.md](./STRIPE.md) · [DATABASE.md](./DATABASE.md) ·
[CONTRIBUTING.md](./CONTRIBUTING.md).

## Installation

Prérequis : Node.js ≥ 20, npm.

```bash
git clone <votre-fork>
cd devisroom
npm install
cp .dev.vars.example .dev.vars   # puis ajustez les valeurs
```

## Lancement local

```bash
npm run db:migrate:local   # crée le schéma dans la D1 locale (Miniflare)
npm run db:seed:local      # (facultatif) données de démonstration
npm run dev                # http://localhost:5173
```

En local, **tout fonctionne sans compte Stripe ni R2 distant** : Miniflare
simule D1 et R2, une bannière « mode démonstration » s'affiche tant que
Stripe n'est pas configuré, et les e-mails sont écrits dans les logs.

Compte de démonstration après seed : `demo@devisroom.fr` /
`demo1234demo!` — avec une DevisRoom publiée sur
`http://localhost:5173/d/demo-toiture-martin`.

## Commandes

| Commande                    | Rôle                                          |
| --------------------------- | --------------------------------------------- |
| `npm run dev`               | Serveur de développement (Workers + Vite)     |
| `npm run build`             | Build de production                           |
| `npm run deploy`            | Build + déploiement Cloudflare                |
| `npm run typecheck`         | Types Wrangler + typegen React Router + `tsc` |
| `npm run lint`              | ESLint                                        |
| `npm run format`            | Prettier                                      |
| `npm test`                  | Tests Vitest                                  |
| `npm run test:e2e`          | Parcours Playwright complet                   |
| `npm run db:generate`       | Génère les migrations Drizzle                 |
| `npm run db:migrate:local`  | Applique les migrations en local              |
| `npm run db:migrate:remote` | Applique les migrations en production         |
| `npm run db:seed:local`     | Données de démonstration locales              |

## Base de données (D1)

```bash
npx wrangler d1 create devisroom
# Reporter le database_id retourné dans wrangler.jsonc
npm run db:migrate:remote
```

Schéma complet et conventions : [DATABASE.md](./DATABASE.md).

## Stockage (R2)

```bash
npx wrangler r2 bucket create devisroom-files
```

Le binding `FILES` est déjà déclaré dans `wrangler.jsonc`. Les fichiers sont
validés (signatures binaires, tailles, quotas par plan), stockés sous des clés
non prévisibles et servis uniquement via des routes autorisées
(`/api/fichiers/*` pour le professionnel, `/d/:slug/*` pour le client final).

## Turnstile

1. Créez un widget sur https://dash.cloudflare.com → Turnstile.
2. `TURNSTILE_SITE_KEY` dans les variables (wrangler.jsonc ou dashboard),
   `TURNSTILE_SECRET_KEY` en secret (`wrangler secret put TURNSTILE_SECRET_KEY`).

Sans clé en développement, la vérification est neutralisée ; en production
elle est obligatoire sur l'inscription et la connexion.

## Stripe

Configuration détaillée (produits, prix, webhooks, tests) :
[STRIPE.md](./STRIPE.md). Points clés :

- Stripe Checkout pour les abonnements (Solo 9,90 €, Pro 19,90 €,
  Équipe 39,90 € TTC/mois — 99 €, 199 €, 399 €/an).
- L'activation d'un plan ne se fait **que** via le webhook vérifié
  (`/api/stripe/webhook`), jamais depuis le retour navigateur.
- Acompte du client final : le professionnel renseigne **son propre**
  Payment Link Stripe ou ses coordonnées de virement. DevisRoom n'encaisse
  jamais l'argent des clients finaux (pas de Stripe Connect dans le MVP).

## Tests

```bash
npm test          # 55 tests unitaires et d'intégration (Vitest)
npm run test:e2e  # parcours complet : inscription → publication → acceptation
```

Couverture : calcul de prix, quotas, permissions inter-organisations,
sessions/CSRF, rate limiting, webhooks Stripe (activation, annulation,
idempotence), création/publication/acceptation de proposition, validation des
sections, hachage des mots de passe.

## Déploiement Cloudflare

Guide pas à pas : [DEPLOYMENT.md](./DEPLOYMENT.md). Résumé :

```bash
npx wrangler d1 create devisroom          # puis reporter l'ID dans wrangler.jsonc
npx wrangler r2 bucket create devisroom-files
npx wrangler secret put SESSION_SECRET    # openssl rand -hex 32
npx wrangler secret put TURNSTILE_SECRET_KEY
npx wrangler secret put STRIPE_SECRET_KEY         # si Stripe activé
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npm run db:migrate:remote
npm run deploy
```

L'application fonctionne sur l'adresse gratuite `*.workers.dev` ; un domaine
personnalisé peut être ajouté ensuite dans le dashboard Cloudflare
(Workers → Domains & Routes) sans changement de code — pensez à mettre à
jour la variable `APP_URL`.

## Limites du plan gratuit

- 3 DevisRooms actives (publiées, non archivées) ;
- 500 Mo de fichiers ;
- marque DevisRoom visible sur les pages clients ;
- pas de paiement d'acompte, pas d'options, pas de variantes ;
- statistiques limitées aux consultations ;
- expiration maximale de 30 jours (appliquée côté serveur).

Quand une limite est atteinte : **aucune donnée n'est supprimée**. La limite
est expliquée, les plans sont proposés, l'archivage ou la suppression restent
possibles.

## Problèmes connus

- L'extraction PDF est heuristique : titres/montants proposés à titre
  indicatif, toujours validés manuellement (les scans sans texte sont
  détectés et signalés).
- La réinitialisation de mot de passe est « préparée » : le jeton est généré
  et transmis via l'adaptateur e-mail (journalisé en local). Le formulaire de
  saisie du nouveau mot de passe sera activé avec un fournisseur d'e-mail.
- Les notifications navigateur (Web Push) ne sont pas incluses dans le MVP —
  le centre de notifications interne les remplace.
- Le plan Équipe accepte les paiements mais l'invitation multi-utilisateurs
  arrive dans une itération suivante (la table `organization_members` et les
  rôles sont déjà en place).
- `d1-http` est déclaré dans `drizzle.config.ts` uniquement pour la
  génération de migrations ; l'application n'utilise que le binding D1.

## Checklist de production

- [ ] `database_id` réel dans `wrangler.jsonc`
- [ ] `ENVIRONMENT=production` et `APP_URL` définitif dans les variables
- [ ] `SESSION_SECRET` fort (`openssl rand -hex 32`) en secret Wrangler
- [ ] Turnstile : site key + secret key de production
- [ ] Stripe : clés live, prix créés, webhook pointé sur
      `https://<domaine>/api/stripe/webhook` (voir STRIPE.md)
- [ ] `ADMIN_EMAIL` défini avant la création du compte administrateur
- [ ] Migrations appliquées : `npm run db:migrate:remote`
- [ ] Mentions légales complétées (éditeur, SIRET) dans
      `app/routes/marketing/mentions-legales.tsx`
- [ ] `npm run typecheck && npm test && npm run build` verts
- [ ] Test manuel du parcours complet en production (inscription → devis →
      publication → acceptation)
