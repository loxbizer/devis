import { eq } from "drizzle-orm";
import { schema, type Db } from "../db.server";

/**
 * Limitation de débit persistée en D1 — suffisante pour protéger les
 * formulaires sensibles (connexion, inscription, acceptation) sans service
 * externe payant.
 */
export interface RateLimitRule {
  /** Nombre maximal de tentatives dans la fenêtre. */
  limit: number;
  /** Durée de la fenêtre en secondes. */
  windowSeconds: number;
}

export const RATE_LIMITS = {
  login: { limit: 10, windowSeconds: 15 * 60 },
  register: { limit: 5, windowSeconds: 60 * 60 },
  passwordReset: { limit: 5, windowSeconds: 60 * 60 },
  publicForm: { limit: 10, windowSeconds: 10 * 60 },
  accessCode: { limit: 10, windowSeconds: 15 * 60 },
  upload: { limit: 60, windowSeconds: 60 * 60 },
} satisfies Record<string, RateLimitRule>;

export async function checkRateLimit(
  db: Db,
  scope: string,
  identifier: string,
  rule: RateLimitRule,
): Promise<{ allowed: boolean; remaining: number }> {
  const key = `${scope}:${identifier}`;
  const now = Date.now();
  const existing = await db
    .select()
    .from(schema.rateLimits)
    .where(eq(schema.rateLimits.key, key))
    .limit(1);
  const row = existing[0];

  if (!row || row.resetAt.getTime() <= now) {
    await db
      .insert(schema.rateLimits)
      .values({
        key,
        count: 1,
        resetAt: new Date(now + rule.windowSeconds * 1000),
      })
      .onConflictDoUpdate({
        target: schema.rateLimits.key,
        set: { count: 1, resetAt: new Date(now + rule.windowSeconds * 1000) },
      });
    return { allowed: true, remaining: rule.limit - 1 };
  }

  if (row.count >= rule.limit) {
    return { allowed: false, remaining: 0 };
  }

  await db
    .update(schema.rateLimits)
    .set({ count: row.count + 1 })
    .where(eq(schema.rateLimits.key, key));
  return { allowed: true, remaining: rule.limit - (row.count + 1) };
}

export function clientIp(request: Request): string {
  return (
    request.headers.get("CF-Connecting-IP") ??
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export function rateLimitResponse(): Response {
  return new Response(
    "Trop de tentatives. Merci de patienter quelques minutes avant de réessayer.",
    { status: 429 },
  );
}
