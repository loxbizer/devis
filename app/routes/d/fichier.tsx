import { and, eq, isNull } from "drizzle-orm";
import { getDb, schema } from "~/server/db.server";
import { getAssetBody } from "~/server/services/storage.server";
import { getPublicProposal } from "~/server/services/proposals.server";
import type { Route } from "./+types/fichier";

/**
 * Sert une image d'une proposition publiée. L'accès n'est possible que via
 * le slug non prévisible de la proposition à laquelle le fichier appartient.
 */
export async function loader({ params }: Route.LoaderArgs) {
  const found = await getPublicProposal(params.slug);
  if (!found || found.expired)
    throw new Response("Introuvable", { status: 404 });

  const db = getDb();
  const [asset] = await db
    .select()
    .from(schema.proposalAssets)
    .where(
      and(
        eq(schema.proposalAssets.id, params.assetId),
        eq(schema.proposalAssets.proposalId, found.proposal.id),
        eq(schema.proposalAssets.kind, "image"),
        isNull(schema.proposalAssets.deletedAt),
      ),
    )
    .limit(1);
  if (!asset) throw new Response("Introuvable", { status: 404 });

  const object = await getAssetBody(asset.r2Key);
  if (!object) throw new Response("Introuvable", { status: 404 });

  return new Response(object.body, {
    headers: {
      "Content-Type": asset.mimeType,
      "Cache-Control": "private, max-age=3600",
      "X-Robots-Tag": "noindex",
    },
  });
}
