# Déploiement Cloudflare — DevisRoom

Le projet se déploie comme un **Worker Cloudflare** (SSR complet) avec D1 et
R2. Tout tient dans le palier gratuit au lancement.

## 1. Prérequis

- Compte Cloudflare (gratuit) ;
- `npx wrangler login` effectué.

## 2. Créer les ressources

```bash
# Base D1
npx wrangler d1 create devisroom
# → copier le database_id retourné dans wrangler.jsonc (d1_databases[0].database_id)

# Bucket R2 (activer R2 une fois dans le dashboard si nécessaire)
npx wrangler r2 bucket create devisroom-files
```

## 3. Variables et secrets

Variables non secrètes (dans `wrangler.jsonc` → `vars`, ou dashboard) :

```jsonc
"vars": {
  "ENVIRONMENT": "production",
  "APP_URL": "https://devisroom.<votre-compte>.workers.dev",
  "TURNSTILE_SITE_KEY": "<site key>"
}
```

Secrets (jamais dans le code ni dans wrangler.jsonc) :

```bash
openssl rand -hex 32 | npx wrangler secret put SESSION_SECRET
npx wrangler secret put TURNSTILE_SECRET_KEY
npx wrangler secret put ADMIN_EMAIL          # e-mail qui recevra le rôle admin
# Si Stripe est activé :
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npx wrangler secret put STRIPE_PRICE_SOLO_MONTHLY
npx wrangler secret put STRIPE_PRICE_SOLO_YEARLY
npx wrangler secret put STRIPE_PRICE_PRO_MONTHLY
npx wrangler secret put STRIPE_PRICE_PRO_YEARLY
npx wrangler secret put STRIPE_PRICE_TEAM_MONTHLY
npx wrangler secret put STRIPE_PRICE_TEAM_YEARLY
```

## 4. Migrations

```bash
npm run db:migrate:remote
```

## 5. Déployer

```bash
npm run deploy
```

L'application est servie sur `https://devisroom.<compte>.workers.dev`.

## 6. Domaine personnalisé (plus tard)

Dashboard Cloudflare → Workers & Pages → devisroom → Settings → Domains &
Routes → **Add custom domain**. Puis :

1. mettre à jour `APP_URL` ;
2. mettre à jour l'URL du webhook Stripe ;
3. ajouter le domaine au widget Turnstile.

Aucun changement de code n'est nécessaire.

## 7. Vérifications post-déploiement

- `/` , `/tarifs`, `/demonstration` répondent ;
- inscription + création d'entreprise fonctionnent ;
- une DevisRoom publiée s'ouvre via son lien privé ;
- `/api/stripe/webhook` répond 400 à un POST non signé (comportement normal) ;
- `robots.txt` et `sitemap.xml` pointent sur le bon domaine ;
- le compte inscrit avec `ADMIN_EMAIL` voit le lien « Admin ».

## Notes de quota (palier gratuit Cloudflare)

- Workers : 100 000 requêtes/jour — largement suffisant pour démarrer ;
- D1 : 5 M lectures/jour, 100 k écritures/jour ;
- R2 : 10 Go de stockage, opérations gratuites classe B généreuses ;
- En cas de dépassement durable, le passage aux paliers payants Cloudflare
  est progressif et sans refonte.
