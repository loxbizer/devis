import { afterEach, describe, expect, it } from "vitest";
import { env } from "cloudflare:workers";
import { verifyTurnstile } from "~/server/auth/turnstile.server";

/**
 * La règle d'or testée ici : Turnstile ne doit jamais enfermer un
 * utilisateur légitime dehors (voir turnstile.server.ts).
 */

const stub = env as Record<string, unknown>;

afterEach(() => {
  stub.ENVIRONMENT = "test";
  delete stub.TURNSTILE_SITE_KEY;
  delete stub.TURNSTILE_SECRET_KEY;
});

describe("verifyTurnstile", () => {
  it("laisse toujours passer en développement, même sans jeton", async () => {
    stub.ENVIRONMENT = "development";
    stub.TURNSTILE_SITE_KEY = "site";
    stub.TURNSTILE_SECRET_KEY = "secret";
    expect(await verifyTurnstile(null, "1.2.3.4")).toBe(true);
    expect(await verifyTurnstile("", "1.2.3.4")).toBe(true);
  });

  it("laisse passer en production quand la configuration est absente", async () => {
    stub.ENVIRONMENT = "production";
    expect(await verifyTurnstile(null, "1.2.3.4")).toBe(true);
  });

  it("laisse passer en production quand la configuration est incomplète", async () => {
    stub.ENVIRONMENT = "production";
    stub.TURNSTILE_SECRET_KEY = "secret"; // pas de site key → pas de widget
    expect(await verifyTurnstile(null, "1.2.3.4")).toBe(true);
  });

  it("exige un jeton en production quand la configuration est complète", async () => {
    stub.ENVIRONMENT = "production";
    stub.TURNSTILE_SITE_KEY = "site";
    stub.TURNSTILE_SECRET_KEY = "secret";
    expect(await verifyTurnstile(null, "1.2.3.4")).toBe(false);
    expect(await verifyTurnstile("", "1.2.3.4")).toBe(false);
  });
});
