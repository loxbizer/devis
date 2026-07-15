import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb, seedOrg, type TestDb } from "./helpers/db";
import {
  assertSameOrigin,
  createSession,
  getSession,
  verifyCsrf,
} from "~/server/auth/session.server";

let db: TestDb;

beforeEach(() => {
  ({ db } = createTestDb());
});

describe("sessions", () => {
  it("crée une session et la retrouve via le cookie", async () => {
    const { userId } = await seedOrg(db);
    const { setCookie, csrfToken } = await createSession(userId, "vitest");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");

    const cookie = setCookie.split(";")[0];
    const request = new Request("http://test.local/app", {
      headers: { Cookie: cookie },
    });
    const session = await getSession(request);
    expect(session).not.toBeNull();
    expect(session!.user.id).toBe(userId);
    expect(session!.csrfToken).toBe(csrfToken);
  });

  it("refuse un jeton inconnu", async () => {
    await seedOrg(db);
    const request = new Request("http://test.local/app", {
      headers: { Cookie: "dr_session=jeton-bidon" },
    });
    expect(await getSession(request)).toBeNull();
  });

  it("refuse l'absence de cookie", async () => {
    const request = new Request("http://test.local/app");
    expect(await getSession(request)).toBeNull();
  });
});

describe("CSRF", () => {
  it("rejette un jeton CSRF invalide", async () => {
    const { userId } = await seedOrg(db);
    const { setCookie } = await createSession(userId, "vitest");
    const request = new Request("http://test.local/app", {
      method: "POST",
      headers: { Cookie: setCookie.split(";")[0] },
    });
    const session = (await getSession(request))!;
    const formData = new FormData();
    formData.set("_csrf", "faux-jeton");
    await expect(verifyCsrf(request, session, formData)).rejects.toBeInstanceOf(
      Response,
    );
  });

  it("accepte le bon jeton CSRF", async () => {
    const { userId } = await seedOrg(db);
    const { setCookie, csrfToken } = await createSession(userId, "vitest");
    const request = new Request("http://test.local/app", {
      method: "POST",
      headers: { Cookie: setCookie.split(";")[0] },
    });
    const session = (await getSession(request))!;
    const formData = new FormData();
    formData.set("_csrf", csrfToken);
    await expect(
      verifyCsrf(request, session, formData),
    ).resolves.toBeUndefined();
  });

  it("rejette une origine étrangère", () => {
    const request = new Request("http://test.local/app", {
      method: "POST",
      headers: { Origin: "https://attaquant.example" },
    });
    expect(() => assertSameOrigin(request)).toThrow();
  });

  it("accepte la même origine", () => {
    const request = new Request("http://test.local/app", {
      method: "POST",
      headers: { Origin: "http://test.local" },
    });
    expect(() => assertSameOrigin(request)).not.toThrow();
  });
});
