import { env as workerEnv } from "cloudflare:workers";

/**
 * Variables d'environnement typées. Les secrets sont optionnels : sans
 * configuration Stripe/Turnstile, l'application bascule sur des
 * comportements de démonstration explicites.
 */
export interface AppEnv {
  DB: D1Database;
  FILES: R2Bucket;
  ENVIRONMENT: string;
  APP_URL: string;
  SESSION_SECRET?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_SOLO_MONTHLY?: string;
  STRIPE_PRICE_SOLO_YEARLY?: string;
  STRIPE_PRICE_PRO_MONTHLY?: string;
  STRIPE_PRICE_PRO_YEARLY?: string;
  STRIPE_PRICE_TEAM_MONTHLY?: string;
  STRIPE_PRICE_TEAM_YEARLY?: string;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  ADMIN_EMAIL?: string;
}

export function getEnv(): AppEnv {
  return workerEnv as unknown as AppEnv;
}

export function isProduction(): boolean {
  return getEnv().ENVIRONMENT === "production";
}

/** Secret de session — obligatoire en production, valeur de repli en dev. */
export function getSessionSecret(): string {
  const env = getEnv();
  if (env.SESSION_SECRET) return env.SESSION_SECRET;
  if (isProduction()) {
    throw new Error("SESSION_SECRET est obligatoire en production.");
  }
  return "devisroom-dev-secret-ne-pas-utiliser-en-production";
}

export function isStripeConfigured(): boolean {
  return Boolean(getEnv().STRIPE_SECRET_KEY);
}

export function getAppUrl(): string {
  return getEnv().APP_URL?.replace(/\/$/, "") || "http://localhost:5173";
}
