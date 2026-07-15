import { getAppUrl } from "~/server/env.server";

export async function loader() {
  const body = [
    "User-agent: *",
    "Allow: /",
    // Espaces privés : jamais indexés.
    "Disallow: /app",
    "Disallow: /admin",
    "Disallow: /d/",
    "Disallow: /api/",
    "Disallow: /connexion",
    "Disallow: /inscription",
    "Disallow: /mot-de-passe-oublie",
    "",
    `Sitemap: ${getAppUrl()}/sitemap.xml`,
    "",
  ].join("\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
