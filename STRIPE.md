# Stripe — DevisRoom

Stripe est utilisé pour **une seule chose** : l'abonnement DevisRoom du
professionnel. Les acomptes des clients finaux ne transitent **jamais** par
DevisRoom (pas de Stripe Connect dans le MVP).

## 1. Produits et prix à créer

Dashboard Stripe → Produits. Créer un produit par plan avec deux prix
récurrents (TTC) :

| Plan   | Mensuel | Annuel |
| ------ | ------- | ------ |
| Solo   | 9,90 €  | 99 €   |
| Pro    | 19,90 € | 199 €  |
| Équipe | 39,90 € | 399 €  |

Copier chaque `price_...` dans le secret correspondant :

```bash
npx wrangler secret put STRIPE_PRICE_SOLO_MONTHLY   # price_...
npx wrangler secret put STRIPE_PRICE_SOLO_YEARLY
npx wrangler secret put STRIPE_PRICE_PRO_MONTHLY
npx wrangler secret put STRIPE_PRICE_PRO_YEARLY
npx wrangler secret put STRIPE_PRICE_TEAM_MONTHLY
npx wrangler secret put STRIPE_PRICE_TEAM_YEARLY
npx wrangler secret put STRIPE_SECRET_KEY           # sk_live_... ou sk_test_...
```

En local : mêmes clés en mode **test** dans `.dev.vars`. Sans clé, le mode
démonstration s'active (paiements désactivés, bannière affichée).

## 2. Webhook

Dashboard Stripe → Developers → Webhooks → **Add endpoint** :

- URL : `https://<votre-domaine>/api/stripe/webhook`
- Événements :
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

Copier le secret de signature :

```bash
npx wrangler secret put STRIPE_WEBHOOK_SECRET   # whsec_...
```

**Principe non négociable** : l'activation/le changement de plan ne se fait
que dans `handleStripeEvent` après vérification de la signature. Le retour
navigateur (`?checkout=succes`) n'est qu'un message d'attente. Les événements
sont idempotents et journalisés dans `stripe_webhook_events` (visibles dans
/admin/webhooks).

En local :

```bash
stripe listen --forward-to localhost:5173/api/stripe/webhook
```

## 3. Portail client

Le bouton « Gérer mon abonnement » ouvre le Billing Portal Stripe (factures,
moyen de paiement, résiliation). Activer le portail dans
Dashboard → Settings → Billing → Customer portal.

## 4. Acompte du client final (rappel)

Deux modes, configurés par le professionnel dans /app/entreprise :

- **Lien Stripe** : le professionnel colle son propre Payment Link
  (`https://buy.stripe.com/...` — vérifié côté serveur). Le bouton de la page
  publique enregistre l'événement `deposit_started` puis redirige. L'argent
  arrive directement sur le compte Stripe du professionnel.
- **Virement** : les instructions saisies (IBAN, référence) sont affichées au
  client après acceptation.

DevisRoom ne détient jamais les fonds et n'émet aucun document de facturation
pour ces acomptes.

## 5. Tester

- Carte de test : `4242 4242 4242 4242`, date future, CVC quelconque.
- Tests automatisés des webhooks : `npm test` (activation, passage annuel,
  annulation → retour au plan gratuit, idempotence, journalisation).
