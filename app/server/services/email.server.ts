/**
 * Interface d'adaptateur e-mail.
 *
 * DevisRoom fonctionne sans aucun service d'e-mail payant : par défaut,
 * l'adaptateur « console » écrit les e-mails dans les logs (mode
 * développement). Pour brancher plus tard Resend, MailChannels ou un autre
 * fournisseur, il suffit d'implémenter `EmailAdapter` et de remplacer
 * l'adaptateur retourné par `getEmailAdapter()` — aucune autre partie du
 * code n'est à modifier.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailAdapter {
  name: string;
  send(message: EmailMessage): Promise<{ ok: boolean; error?: string }>;
}

/** Adaptateur par défaut : journalise l'e-mail sans l'envoyer. */
export const consoleEmailAdapter: EmailAdapter = {
  name: "console",
  async send(message) {
    console.log(
      `[email:console] À: ${message.to} | Sujet: ${message.subject}\n${message.text}`,
    );
    return { ok: true };
  },
};

/**
 * Exemple d'implémentation prête à brancher (non activée) :
 *
 * export function createResendAdapter(apiKey: string, from: string): EmailAdapter {
 *   return {
 *     name: "resend",
 *     async send(message) {
 *       const response = await fetch("https://api.resend.com/emails", {
 *         method: "POST",
 *         headers: {
 *           Authorization: `Bearer ${apiKey}`,
 *           "Content-Type": "application/json",
 *         },
 *         body: JSON.stringify({ from, ...message }),
 *       });
 *       return response.ok
 *         ? { ok: true }
 *         : { ok: false, error: await response.text() };
 *     },
 *   };
 * }
 */
export function getEmailAdapter(): EmailAdapter {
  return consoleEmailAdapter;
}

export async function sendEmail(message: EmailMessage) {
  return getEmailAdapter().send(message);
}
