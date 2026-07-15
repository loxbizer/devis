import { getAppUrl } from "~/server/env.server";

const PUBLIC_PATHS = [
  "/",
  "/fonctionnalites",
  "/tarifs",
  "/demonstration",
  "/contact",
  "/confidentialite",
  "/devis-interactif-artisan",
  "/presentation-devis-renovation",
  "/suivi-ouverture-devis",
  "/devis-en-ligne-couvreur",
  "/devis-interactif-climatisation",
  "/devis-interactif-menuisier",
  "/comment-presenter-un-devis",
  "/client-ne-repond-pas-au-devis",
];

export async function loader() {
  const base = getAppUrl();
  const urls = PUBLIC_PATHS.map(
    (path) => `  <url><loc>${base}${path === "/" ? "" : path}</loc></url>`,
  ).join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
