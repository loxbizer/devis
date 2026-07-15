/**
 * Stub du module `cloudflare:workers` pour Vitest (environnement Node).
 * Les tests injectent leur base via setDbForTests() ; les bindings réels
 * (D1, R2) ne sont jamais utilisés ici.
 */
export const env: Record<string, unknown> = {
  ENVIRONMENT: "test",
  APP_URL: "http://test.local",
};
