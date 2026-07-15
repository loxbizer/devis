# Contribuer à DevisRoom

## Mise en route

```bash
npm install
cp .dev.vars.example .dev.vars
npm run db:migrate:local
npm run db:seed:local   # facultatif
npm run dev
```

## Qualité — à exécuter avant tout commit

```bash
npm run typecheck   # aucun `any` implicite, TypeScript strict
npm run lint
npm run format:check
npm test
npm run test:e2e    # pour les changements touchant un parcours utilisateur
```

## Règles du projet

- **Français partout** dans l'interface (libellés, erreurs, e-mails).
- **Sécurité d'abord** : toute nouvelle route `/app/*` passe par
  `requireOrg`, toute mutation authentifiée par `verifyCsrf`, toute entrée
  par un schéma Zod. Les requêtes SQL sont filtrées par `organization_id`.
- **Pas de service payant** ni d'appel IA côté production. Les intégrations
  optionnelles (e-mail) passent par une interface d'adaptateur.
- **Honnêteté produit** : pas de statistiques inventées, pas de précision
  trompeuse, pas de promesse de taux d'acceptation.
- **Accessibilité** : composants utilisables au clavier, labels explicites,
  `prefers-reduced-motion` respecté, jamais une information portée par la
  seule couleur.
- Pas de bouton sans action, pas de route vide, pas de « à compléter ».

## Base de données

Modifiez `app/server/db/schema.ts`, puis :

```bash
npm run db:generate && npm run db:migrate:local && npm test
```

N'éditez jamais une migration existante.

## Tests

- Logique pure → `tests/*.test.ts` (Vitest).
- Logique avec base → utilisez `createTestDb()`/`seedOrg()` de
  `tests/helpers/db.ts` (SQLite en mémoire avec les vraies migrations).
- Parcours utilisateur → `e2e/*.spec.ts` (Playwright).

## Commits et PR

- Commits en français, à l'impératif : « Ajoute la duplication de devis ».
- Une PR = un sujet ; description avec contexte, captures d'écran pour l'UI.
