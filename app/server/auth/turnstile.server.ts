import { getEnv, isProduction } from "../env.server";

/**
 * Vérification serveur du jeton Cloudflare Turnstile.
 *
 * Principe : Turnstile est une protection supplémentaire, jamais un
 * verrou. La vérification ne doit JAMAIS enfermer un utilisateur légitime
 * dehors (le rate limiting et le hachage des mots de passe restent actifs
 * dans tous les cas) :
 *
 * - en développement, elle est toujours considérée réussie ;
 * - elle n'est appliquée que si la configuration est complète
 *   (site key + secret key) — sans site key, le widget ne peut pas
 *   produire de jeton et exiger un jeton bloquerait tout le monde ;
 * - si l'API Cloudflare est injoignable, on laisse passer en journalisant.
 */
export async function verifyTurnstile(
  token: FormDataEntryValue | null,
  remoteIp: string,
): Promise<boolean> {
  // En local / développement : jamais bloquant.
  if (!isProduction()) return true;

  const env = getEnv();
  const secret = env.TURNSTILE_SECRET_KEY;
  const siteKey = env.TURNSTILE_SITE_KEY;
  if (!secret || !siteKey) {
    console.warn(
      "[turnstile] configuration incomplète (site key + secret key requis) — vérification ignorée",
    );
    return true;
  }

  if (typeof token !== "string" || token.length === 0) return false;
  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, response: token, remoteip: remoteIp }),
      },
    );
    const result = (await response.json()) as { success: boolean };
    return result.success === true;
  } catch (error) {
    // Indisponibilité de l'API : ne pas bloquer les utilisateurs légitimes.
    console.error("[turnstile] API de vérification injoignable", error);
    return true;
  }
}

export function getTurnstileSiteKey(): string | null {
  return getEnv().TURNSTILE_SITE_KEY ?? null;
}
