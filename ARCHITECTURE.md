# Architecture de DevisRoom

## Choix structurants

| Décision                         | Motif                                                                                                                                        |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| React Router v8 (mode framework) | Successeur direct de Remix, plugin Vite Cloudflare officiel, SSR natif sur Workers. Plus stable que Next.js + OpenNext sur cette plateforme. |
| Cloudflare Workers + D1 + R2     | Zéro coût fixe au lancement, bindings locaux simulés par Miniflare (dev sans dépendance réseau).                                             |
| Drizzle ORM                      | Pilote D1 officiel, migrations SQL générées, schéma typé partagé avec les tests.                                                             |
| Extraction PDF côté navigateur   | PDF.js dans le client : aucun service payant, aucun appel IA, le Worker ne traite jamais le PDF.                                             |
| Pas de Stripe Connect            | Le MVP n'encaisse jamais l'argent des clients finaux — Payment Link du professionnel ou virement.                                            |
| E-mail = adaptateur              | Aucune dépendance à un service payant : `console` par défaut, interface prête pour Resend/MailChannels.                                      |

## Arborescence

```
devisroom/
├── app/
│   ├── root.tsx, routes.ts, app.css, entry.server.tsx
│   ├── components/
│   │   ├── ui/            # design system (Button, Input, Modal, Toast, …)
│   │   ├── proposal/      # page publique + sélecteurs de formules/options
│   │   ├── editor/        # éditeur générique de listes (sections)
│   │   ├── marketing/     # gabarits guides SEO et pages légales
│   │   └── auth/          # gabarit auth + widget Turnstile
│   ├── lib/               # code partagé client/serveur (pur)
│   │   ├── plans.ts       # plans, limites, quotas
│   │   ├── pricing.ts     # calcul du total (testé, utilisé des 2 côtés)
│   │   ├── sections.ts    # schémas Zod du contenu des sections
│   │   ├── format.ts      # formatage fr-FR (€, dates, tailles)
│   │   ├── proposal-vm.ts # modèle de vue public (données minimales)
│   │   ├── demo-data.ts   # démonstration « Horizon Toiture »
│   │   ├── pdf-extract.client.ts    # PDF.js (navigateur uniquement)
│   │   └── image-optimize.client.ts # redimensionnement/WebP avant envoi
│   ├── server/            # code serveur uniquement (suffixe .server)
│   │   ├── db.server.ts, env.server.ts
│   │   ├── db/schema.ts   # 20 tables Drizzle
│   │   ├── auth/          # mots de passe, sessions, CSRF, rate limit, Turnstile
│   │   └── services/      # org, proposals, quotas, storage, stats,
│   │                      # notifications, email, stripe, audit
│   └── routes/
│       ├── marketing/     # landing, tarifs, fonctionnalités, légal, 8 guides SEO
│       ├── auth/          # inscription, connexion, mot de passe, déconnexion
│       ├── app/           # espace pro (layout + 11 pages + onboarding)
│       ├── admin/         # administration (rôle admin requis)
│       ├── d/             # page privée client + fichiers/pdf/logo
│       └── api/           # webhook Stripe, fichiers du professionnel
├── workers/app.ts         # entrée Worker + headers de sécurité (CSP…)
├── drizzle/               # migrations SQL + seed local
├── tests/                 # Vitest (+ stub cloudflare:workers, base sqlite mémoire)
├── e2e/                   # Playwright (parcours principal)
└── wrangler.jsonc         # bindings D1/R2, variables
```

## Flux principaux

### Création d'une proposition

1. Le professionnel dépose un PDF → PDF.js extrait le texte **dans le
   navigateur** → heuristiques (titre, client, montant TTC) pré-remplissent le
   formulaire → validation humaine obligatoire.
2. L'action serveur valide (Zod), vérifie les quotas, stocke le PDF dans R2
   (clé aléatoire) et crée la ligne `proposals` (statut `draft`).
3. L'éditeur enregistre sections (JSON validé par type), formules, options et
   photos (optimisées côté client avant envoi).
4. La publication crée un instantané `proposal_versions` et passe le statut à
   `published` — après contrôle du quota de DevisRooms actives.

### Consultation par le client final

1. `/d/:slug` (slug = 96 bits aléatoires) → chargement filtré : seules les
   données nécessaires sont exposées (`PublicProposalVM`), jamais les
   statistiques ni les identifiants internes.
2. Code secret facultatif (haché) + date d'expiration vérifiés côté serveur.
3. Une « vue » = un cookie de visite aléatoire + fenêtre de 30 min ;
   les aperçus du propriétaire ne comptent pas.
4. Les intentions (`select_package`, `question`, `change_request`, `accept`,
   `deposit_start`) sont des actions POST rate-limitées ; l'acceptation
   **recalcule le total côté serveur** et exige la correspondance exacte avec
   le montant confirmé.

### Abonnements

`/app/abonnement` → Stripe Checkout (metadata `organizationId`) →
`/api/stripe/webhook` (signature vérifiée, événements journalisés dans
`stripe_webhook_events`, idempotents) → mise à jour de `subscriptions`.
Le retour navigateur n'accorde jamais de droits.

## Contexte Cloudflare

Les bindings sont consommés via `import { env } from "cloudflare:workers"`
(pattern recommandé du plugin Vite), encapsulé dans `env.server.ts` et
`db.server.ts`. Les tests Vitest substituent ce module par un stub et
injectent une base better-sqlite3 en mémoire (même schéma, mêmes migrations).
