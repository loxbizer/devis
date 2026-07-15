import { getEnv, isProduction } from "../env.server";

/**
 * Vérification serveur du jeton Cloudflare Turnstile.
 * Sans clé secrète configurée en développement, la vérification est
 * considérée réussie (les clés de test Cloudflare fonctionnent aussi).
 */
export async function verifyTurnstile(
  token: FormDataEntryValue | null,
  remoteIp: string,
): Promise<boolean> {
  const secret = getEnv().TURNSTILE_SECRET_KEY;
  if (!secret) {
    // En production, exiger la configuration ; en dev, laisser passer.
    return !isProduction();
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
  } catch {
    return false;
  }
}

export function getTurnstileSiteKey(): string | null {
  return getEnv().TURNSTILE_SITE_KEY ?? null;
}
