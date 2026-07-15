import { and, eq, gt, lt } from "drizzle-orm";
import { redirect } from "react-router";
import { getDb, schema } from "../db.server";
import { isProduction } from "../env.server";
import { newId, randomToken, sha256Hex } from "./password.server";

const SESSION_COOKIE = "dr_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30; // 30 jours

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
}

export interface SessionInfo {
  sessionId: string;
  csrfToken: string;
  user: AuthenticatedUser;
}

function cookieAttributes(maxAgeSeconds: number): string {
  const secure = isProduction() ? "; Secure" : "";
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}

export async function createSession(
  userId: string,
  userAgent: string | null,
): Promise<{ setCookie: string; csrfToken: string }> {
  const db = getDb();
  const token = randomToken(32);
  const csrfToken = randomToken(32);
  await db.insert(schema.sessions).values({
    id: newId(),
    userId,
    tokenHash: await sha256Hex(token),
    csrfToken,
    userAgent: userAgent?.slice(0, 255) ?? null,
    expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
  });
  // Nettoyage opportuniste des sessions expirées de l'utilisateur.
  await db
    .delete(schema.sessions)
    .where(
      and(
        eq(schema.sessions.userId, userId),
        lt(schema.sessions.expiresAt, new Date()),
      ),
    );
  return {
    setCookie: `${SESSION_COOKIE}=${token}; ${cookieAttributes(SESSION_DURATION_MS / 1000)}`,
    csrfToken,
  };
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; ${cookieAttributes(0)}`;
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("Cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=") || null;
  }
  return null;
}

export { readCookie };

export async function getSession(
  request: Request,
): Promise<SessionInfo | null> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const db = getDb();
  const tokenHash = await sha256Hex(token);
  const rows = await db
    .select({
      sessionId: schema.sessions.id,
      csrfToken: schema.sessions.csrfToken,
      expiresAt: schema.sessions.expiresAt,
      userId: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      role: schema.users.role,
      suspendedAt: schema.users.suspendedAt,
      deletedAt: schema.users.deletedAt,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
    .where(
      and(
        eq(schema.sessions.tokenHash, tokenHash),
        gt(schema.sessions.expiresAt, new Date()),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row || row.suspendedAt || row.deletedAt) return null;
  return {
    sessionId: row.sessionId,
    csrfToken: row.csrfToken,
    user: { id: row.userId, email: row.email, name: row.name, role: row.role },
  };
}

export async function destroySession(request: Request): Promise<void> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return;
  const db = getDb();
  await db
    .delete(schema.sessions)
    .where(eq(schema.sessions.tokenHash, await sha256Hex(token)));
}

/** Redirige vers /connexion si l'utilisateur n'est pas authentifié. */
export async function requireSession(request: Request): Promise<SessionInfo> {
  const session = await getSession(request);
  if (!session) {
    const url = new URL(request.url);
    const next = encodeURIComponent(url.pathname + url.search);
    throw redirect(`/connexion?next=${next}`);
  }
  return session;
}

export async function requireAdmin(request: Request): Promise<SessionInfo> {
  const session = await requireSession(request);
  if (session.user.role !== "admin") {
    throw new Response("Accès refusé", { status: 403 });
  }
  return session;
}

/**
 * Protection CSRF : vérifie le jeton soumis (champ `_csrf`) et l'origine de
 * la requête pour toute mutation authentifiée.
 */
export async function verifyCsrf(
  request: Request,
  session: SessionInfo,
  formData: FormData,
): Promise<void> {
  const submitted = formData.get("_csrf");
  if (typeof submitted !== "string" || submitted !== session.csrfToken) {
    throw new Response("Jeton CSRF invalide. Rechargez la page et réessayez.", {
      status: 403,
    });
  }
  assertSameOrigin(request);
}

/** Vérifie que la mutation provient bien de notre propre origine. */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("Origin");
  if (!origin) return; // formulaires same-origin sans header Origin (rare)
  const requestUrl = new URL(request.url);
  const originUrl = new URL(origin);
  if (originUrl.host !== requestUrl.host) {
    throw new Response("Origine de la requête invalide.", { status: 403 });
  }
}
