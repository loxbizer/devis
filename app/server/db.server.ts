import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import { env } from "cloudflare:workers";
import * as schema from "./db/schema";

export type Db = DrizzleD1Database<typeof schema>;

let cached: Db | undefined;

export function getDb(): Db {
  cached ??= drizzle(env.DB, { schema });
  return cached;
}

/**
 * Injection d'une base de test (better-sqlite3 via Drizzle) pour les tests
 * d'intégration Vitest. Jamais utilisé en production.
 */
export function setDbForTests(db: unknown): void {
  cached = db as Db;
}

export { schema };
