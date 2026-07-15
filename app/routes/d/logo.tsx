import { and, eq } from "drizzle-orm";
import { getDb, schema } from "~/server/db.server";
import { getAssetBody } from "~/server/services/storage.server";
import { getPublicProposal } from "~/server/services/proposals.server";
import type { Route } from "./+types/logo";

/** Logo de l'entreprise sur la page publique d'une proposition. */
export async function loader({ params }: Route.LoaderArgs) {
  const found = await getPublicProposal(params.slug);
  if (!found || found.expired)
    throw new Response("Introuvable", { status: 404 });

  const db = getDb();
  const [org] = await db
    .select({ logoKey: schema.organizations.logoKey })
    .from(schema.organizations)
    .where(and(eq(schema.organizations.id, found.organization.id)))
    .limit(1);
  if (!org?.logoKey) throw new Response("Introuvable", { status: 404 });

  const object = await getAssetBody(org.logoKey);
  if (!object) throw new Response("Introuvable", { status: 404 });

  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType ?? "image/png",
      "Cache-Control": "private, max-age=3600",
      "X-Robots-Tag": "noindex",
    },
  });
}
