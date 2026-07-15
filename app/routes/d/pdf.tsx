import { getAssetBody } from "~/server/services/storage.server";
import { getPublicProposal } from "~/server/services/proposals.server";
import type { Route } from "./+types/pdf";

/** Téléchargement du PDF original d'une proposition publiée. */
export async function loader({ params }: Route.LoaderArgs) {
  const found = await getPublicProposal(params.slug);
  if (!found || found.expired || !found.proposal.pdfKey) {
    throw new Response("Introuvable", { status: 404 });
  }
  const object = await getAssetBody(found.proposal.pdfKey);
  if (!object) throw new Response("Introuvable", { status: 404 });

  const filename = (found.proposal.pdfFilename ?? "devis.pdf").replace(
    /"/g,
    "",
  );
  return new Response(object.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
