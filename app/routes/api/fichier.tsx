import { and, eq, isNull } from "drizzle-orm";
import { requireOrg } from "~/server/services/org.server";
import { getDb, schema } from "~/server/db.server";
import { getAssetBody } from "~/server/services/storage.server";
import type { Route } from "./+types/fichier";

/**
 * Sert un fichier à son propriétaire (professionnel authentifié).
 * Le contrôle d'accès vérifie que le fichier appartient à l'organisation.
 */
export async function loader({ request, params }: Route.LoaderArgs) {
  const { organization } = await requireOrg(request);
  const db = getDb();
  const [asset] = await db
    .select()
    .from(schema.proposalAssets)
    .where(
      and(
        eq(schema.proposalAssets.id, params.assetId),
        eq(schema.proposalAssets.organizationId, organization.id),
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
      "Cache-Control": "private, max-age=600",
      "X-Robots-Tag": "noindex",
    },
  });
}
