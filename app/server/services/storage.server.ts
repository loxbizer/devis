import { and, eq, isNull } from "drizzle-orm";
import { FILE_LIMITS } from "~/lib/plans";
import { newId, randomToken } from "../auth/password.server";
import { getDb, schema } from "../db.server";
import { getEnv } from "../env.server";

/**
 * Stockage R2 : validation MIME, limites de taille, clés non prévisibles.
 * Les fichiers ne sont jamais servis directement — ils passent par
 * /api/fichiers/* qui applique le contrôle d'accès.
 */

export type AssetKind = "pdf" | "image" | "logo" | "document";

const MIME_BY_KIND: Record<AssetKind, readonly string[]> = {
  pdf: ["application/pdf"],
  image: ["image/jpeg", "image/png", "image/webp"],
  logo: ["image/jpeg", "image/png", "image/webp"],
  document: [...FILE_LIMITS.allowedMimeTypes],
};

const MAX_BYTES_BY_KIND: Record<AssetKind, number> = {
  pdf: FILE_LIMITS.maxPdfBytes,
  image: FILE_LIMITS.maxImageBytes,
  logo: FILE_LIMITS.maxImageBytes,
  document: FILE_LIMITS.maxPdfBytes,
};

/** Signatures binaires (magic bytes) pour vérifier le type réel du fichier. */
function sniffMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 5) {
    const ascii = String.fromCharCode(...bytes.slice(0, 5));
    if (ascii === "%PDF-") return "application/pdf";
  }
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  )
    return "image/jpeg";
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  )
    return "image/png";
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  )
    return "image/webp";
  return null;
}

export type UploadResult =
  | { ok: true; asset: typeof schema.proposalAssets.$inferSelect }
  | { ok: false; error: string };

export async function storeAsset(params: {
  organizationId: string;
  proposalId?: string | null;
  kind: AssetKind;
  file: File;
}): Promise<UploadResult> {
  const { organizationId, proposalId, kind, file } = params;
  const maxBytes = MAX_BYTES_BY_KIND[kind];
  if (file.size === 0) return { ok: false, error: "Fichier vide." };
  if (file.size > maxBytes) {
    return {
      ok: false,
      error: `Fichier trop volumineux (maximum ${Math.round(maxBytes / (1024 * 1024))} Mo).`,
    };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const sniffed = sniffMime(bytes);
  if (!sniffed || !MIME_BY_KIND[kind].includes(sniffed)) {
    return {
      ok: false,
      error: "Format de fichier non autorisé (PDF, JPG, PNG ou WebP).",
    };
  }

  const extension =
    sniffed === "application/pdf"
      ? "pdf"
      : sniffed === "image/jpeg"
        ? "jpg"
        : sniffed === "image/png"
          ? "png"
          : "webp";
  // Clé non prévisible : org / kind / jeton aléatoire.
  const r2Key = `${organizationId}/${kind}/${randomToken(16)}.${extension}`;

  await getEnv().FILES.put(r2Key, bytes, {
    httpMetadata: { contentType: sniffed },
  });

  const db = getDb();
  const [asset] = await db
    .insert(schema.proposalAssets)
    .values({
      id: newId(),
      organizationId,
      proposalId: proposalId ?? null,
      kind,
      r2Key,
      filename: sanitizeFilename(file.name),
      mimeType: sniffed,
      sizeBytes: bytes.length,
    })
    .returning();
  return { ok: true, asset };
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[^\p{L}\p{N}._ -]/gu, "_").slice(0, 120) || "fichier";
}

export async function deleteAsset(assetId: string, organizationId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.proposalAssets)
    .where(
      and(
        eq(schema.proposalAssets.id, assetId),
        eq(schema.proposalAssets.organizationId, organizationId),
        isNull(schema.proposalAssets.deletedAt),
      ),
    )
    .limit(1);
  const asset = rows[0];
  if (!asset) return false;
  await getEnv().FILES.delete(asset.r2Key);
  await db
    .delete(schema.proposalAssets)
    .where(eq(schema.proposalAssets.id, assetId));
  return true;
}

/** Supprime de R2 les fichiers d'une proposition supprimée (anti-orphelins). */
export async function deleteProposalFiles(proposalId: string) {
  const db = getDb();
  const assets = await db
    .select()
    .from(schema.proposalAssets)
    .where(eq(schema.proposalAssets.proposalId, proposalId));
  for (const asset of assets) {
    await getEnv().FILES.delete(asset.r2Key);
  }
  if (assets.length > 0) {
    await db
      .delete(schema.proposalAssets)
      .where(eq(schema.proposalAssets.proposalId, proposalId));
  }
}

export async function getAssetBody(r2Key: string) {
  return getEnv().FILES.get(r2Key);
}
