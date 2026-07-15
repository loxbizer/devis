/**
 * Widget Cloudflare Turnstile en rendu implicite : le script officiel
 * détecte la div .cf-turnstile et ajoute le jeton `cf-turnstile-response`
 * au formulaire parent. Sans clé configurée, rien n'est rendu (mode dev).
 */
export function TurnstileWidget({ siteKey }: { siteKey: string | null }) {
  if (!siteKey) return null;
  return (
    <>
      <script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        async
        defer
      />
      <div className="cf-turnstile" data-sitekey={siteKey} data-language="fr" />
    </>
  );
}
