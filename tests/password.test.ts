import { describe, expect, it } from "vitest";
import {
  hashPassword,
  randomToken,
  sha256Hex,
  timingSafeEqualHex,
  verifyPassword,
} from "~/server/auth/password.server";

describe("hashPassword / verifyPassword", () => {
  it("vérifie un mot de passe correct", async () => {
    const hash = await hashPassword("mon-mot-de-passe-solide");
    expect(hash.startsWith("pbkdf2$100000$")).toBe(true);
    expect(hash).not.toContain("mon-mot-de-passe-solide");
    expect(await verifyPassword("mon-mot-de-passe-solide", hash)).toBe(true);
  });

  it("rejette un mot de passe incorrect", async () => {
    const hash = await hashPassword("bon-mot-de-passe");
    expect(await verifyPassword("mauvais-mot-de-passe", hash)).toBe(false);
  });

  it("génère un sel différent à chaque hachage", async () => {
    const a = await hashPassword("identique");
    const b = await hashPassword("identique");
    expect(a).not.toBe(b);
  });

  it("rejette les formats de hash corrompus", async () => {
    expect(await verifyPassword("x", "format-invalide")).toBe(false);
    expect(await verifyPassword("x", "pbkdf2$abc$00$00")).toBe(false);
  });
});

describe("timingSafeEqualHex", () => {
  it("compare correctement", () => {
    expect(timingSafeEqualHex("abcd", "abcd")).toBe(true);
    expect(timingSafeEqualHex("abcd", "abce")).toBe(false);
    expect(timingSafeEqualHex("abcd", "abcde")).toBe(false);
  });
});

describe("randomToken", () => {
  it("produit des jetons hexadécimaux uniques de la bonne taille", () => {
    const token = randomToken(16);
    expect(token).toMatch(/^[0-9a-f]{32}$/);
    expect(randomToken(16)).not.toBe(token);
  });
});

describe("sha256Hex", () => {
  it("est stable et au bon format", async () => {
    const a = await sha256Hex("devisroom");
    const b = await sha256Hex("devisroom");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});
