import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "~/server/db/schema";
import { setDbForTests } from "~/server/db.server";

/**
 * Crée une base SQLite en mémoire avec le schéma réel (migrations Drizzle)
 * et l'injecte comme base courante de l'application.
 */
export function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");

  const migrationsDir = join(process.cwd(), "drizzle", "migrations");
  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    for (const statement of sql.split("--> statement-breakpoint")) {
      const trimmed = statement.trim();
      if (trimmed) sqlite.exec(trimmed);
    }
  }

  const db = drizzle(sqlite, { schema });
  setDbForTests(db);
  return { db, sqlite, schema };
}

export type TestDb = ReturnType<typeof createTestDb>["db"];

/** Fixture : utilisateur + organisation + abonnement. */
export async function seedOrg(
  db: TestDb,
  overrides: { plan?: "free" | "solo" | "pro" | "team" } = {},
) {
  const userId = crypto.randomUUID();
  const orgId = crypto.randomUUID();
  await db.insert(schema.users).values({
    id: userId,
    email: `user-${userId}@test.local`,
    name: "Utilisateur Test",
    passwordHash: "pbkdf2$100000$00$00",
  });
  await db.insert(schema.organizations).values({
    id: orgId,
    name: "Entreprise Test",
  });
  await db.insert(schema.organizationMembers).values({
    id: crypto.randomUUID(),
    organizationId: orgId,
    userId,
    role: "owner",
  });
  await db.insert(schema.subscriptions).values({
    id: crypto.randomUUID(),
    organizationId: orgId,
    plan: overrides.plan ?? "free",
    status: "active",
  });
  return { userId, orgId };
}
