import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./helpers/db";
import { checkRateLimit } from "~/server/auth/rate-limit.server";
import type { Db } from "~/server/db.server";

let db: TestDb;

beforeEach(() => {
  ({ db } = createTestDb());
});

describe("checkRateLimit", () => {
  const rule = { limit: 3, windowSeconds: 60 };

  it("autorise jusqu'à la limite puis bloque", async () => {
    const d = db as unknown as Db;
    expect((await checkRateLimit(d, "test", "ip1", rule)).allowed).toBe(true);
    expect((await checkRateLimit(d, "test", "ip1", rule)).allowed).toBe(true);
    expect((await checkRateLimit(d, "test", "ip1", rule)).allowed).toBe(true);
    const blocked = await checkRateLimit(d, "test", "ip1", rule);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("isole les identifiants et les scopes", async () => {
    const d = db as unknown as Db;
    for (let i = 0; i < 3; i++) await checkRateLimit(d, "test", "ip1", rule);
    expect((await checkRateLimit(d, "test", "ip2", rule)).allowed).toBe(true);
    expect((await checkRateLimit(d, "autre", "ip1", rule)).allowed).toBe(true);
  });

  it("réinitialise après expiration de la fenêtre", async () => {
    const d = db as unknown as Db;
    const shortRule = { limit: 1, windowSeconds: -1 }; // fenêtre déjà expirée
    expect((await checkRateLimit(d, "t", "ip", shortRule)).allowed).toBe(true);
    expect((await checkRateLimit(d, "t", "ip", shortRule)).allowed).toBe(true);
  });
});
