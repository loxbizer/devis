# Base de données — DevisRoom

Cloudflare **D1** (SQLite) piloté par **Drizzle ORM**. Schéma :
`app/server/db/schema.ts`. Migrations SQL générées :
`drizzle/migrations/`.

## Tables

| Table                      | Rôle                                                                                                                                                |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`                    | Comptes (email unique, hash PBKDF2, rôle `user`/`admin`, suspension, soft delete)                                                                   |
| `sessions`                 | Sessions opaques (hash SHA-256 du jeton, jeton CSRF, expiration)                                                                                    |
| `password_reset_tokens`    | Jetons de réinitialisation à usage unique (hachés, 1 h)                                                                                             |
| `rate_limits`              | Compteurs de limitation de débit (clé scope:identifiant, fenêtre)                                                                                   |
| `organizations`            | Entreprises (profil, logo, couleur, Payment Link, virement, étape d'onboarding, suspension, soft delete)                                            |
| `organization_members`     | Appartenance + rôle (`owner`/`admin`/`member`), unique (org, user)                                                                                  |
| `subscriptions`            | Plan (`free`/`solo`/`pro`/`team`), intervalle, statut, IDs Stripe, fin de période                                                                   |
| `proposals`                | Devis : slug public aléatoire, statut `draft`/`published`, résultat `pending`/`won`/`lost`/`expired`, archivage, soft delete, version, acompte, PDF |
| `proposal_versions`        | Instantané JSON complet à chaque publication (preuve de la version acceptée)                                                                        |
| `proposal_sections`        | Sections typées (`services`, `steps`, `timeline`, `guarantees`, `faq`, `custom`) — contenu JSON validé Zod                                          |
| `proposal_packages`        | Formules (max 3) : prix, prestations, « recommandée »                                                                                               |
| `proposal_options`         | Options supplémentaires cochables                                                                                                                   |
| `proposal_assets`          | Fichiers R2 (pdf/image/logo/document) : clé unique, MIME vérifié, taille, soft delete                                                               |
| `proposal_views`           | Consultations (visiteur anonyme aléatoire, appareil)                                                                                                |
| `proposal_events`          | Journal typé (publication, vues, sélections, questions, acceptation, acompte…)                                                                      |
| `proposal_questions`       | Questions du client final (+ réponse du professionnel)                                                                                              |
| `proposal_change_requests` | Demandes de modification (statut open/resolved)                                                                                                     |
| `proposal_acceptances`     | Acceptations : identité déclarée, formule, options, total, version, user-agent, IP (preuve)                                                         |
| `notifications`            | Centre de notifications interne par organisation                                                                                                    |
| `audit_logs`               | Journal d'audit des actions sensibles                                                                                                               |
| `reward_transactions`      | Points de récompense : gains (+) / dépenses (−), idempotents via (org, raison, réf) — le solde est la somme des deltas                              |
| `stripe_webhook_events`    | Webhooks reçus (idempotence + affichage admin)                                                                                                      |

## Conventions

- **IDs** : UUID v4 (`crypto.randomUUID()`), en `TEXT`.
- **Horodatages** : entiers en millisecondes (`timestamp_ms`), `created_at`
  / `updated_at` par défaut à l'insertion.
- **Soft delete** : `deleted_at` sur `users`, `organizations`, `proposals`,
  `proposal_assets` — les requêtes filtrent systématiquement `IS NULL`.
- **Clés étrangères** : `ON DELETE CASCADE` sur toutes les tables enfants.
- **Index** : e-mail unique, slug unique, hash de session unique, index sur
  les colonnes de jointure et de tri (organisation, proposition, dates).
- **Cloisonnement** : toute lecture/écriture côté professionnel est filtrée
  par `organization_id` (testé dans `tests/quotas.test.ts`).

## Migrations

```bash
npm run db:generate        # après modification de schema.ts
npm run db:migrate:local   # applique en local (Miniflare)
npm run db:migrate:remote  # applique en production
```

Ne jamais modifier une migration déjà appliquée : en créer une nouvelle.

## Seed local

`npm run db:seed:local` charge `drizzle/seed.sql` : utilisateur
`demo@devisroom.fr` (mot de passe `demo1234demo!`), entreprise « Horizon
Toiture (démo) » en plan Pro, une DevisRoom publiée
(`/d/demo-toiture-martin`) avec 3 formules, 2 options, sections complètes,
événements et notifications factices.

## Tests

Les tests d'intégration rejouent les **mêmes migrations SQL** dans une base
better-sqlite3 en mémoire (`tests/helpers/db.ts`) — le schéma testé est donc
strictement celui de production.
