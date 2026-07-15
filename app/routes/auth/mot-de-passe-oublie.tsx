import { eq } from "drizzle-orm";
import { Form, Link } from "react-router";
import { AuthShell } from "~/components/auth/auth-shell";
import { Alert, Button, Input } from "~/components/ui/primitives";
import { newId, randomToken, sha256Hex } from "~/server/auth/password.server";
import {
  checkRateLimit,
  clientIp,
  RATE_LIMITS,
} from "~/server/auth/rate-limit.server";
import { assertSameOrigin } from "~/server/auth/session.server";
import { getDb, schema } from "~/server/db.server";
import { getAppUrl } from "~/server/env.server";
import { sendEmail } from "~/server/services/email.server";
import type { Route } from "./+types/mot-de-passe-oublie";

export const meta: Route.MetaFunction = () => [
  { title: "Mot de passe oublié — DevisRoom" },
  { name: "robots", content: "noindex" },
];

/**
 * Réinitialisation « préparée » : le jeton est créé et transmis via
 * l'adaptateur e-mail (journalisé en mode développement). Le formulaire de
 * saisie du nouveau mot de passe sera branché lorsque un fournisseur
 * d'e-mail sera configuré — la table et les jetons sont déjà en place.
 */
export async function action({ request }: Route.ActionArgs) {
  assertSameOrigin(request);
  const db = getDb();
  const ip = clientIp(request);
  const rl = await checkRateLimit(
    db,
    "pwd_reset",
    ip,
    RATE_LIMITS.passwordReset,
  );
  if (!rl.allowed) {
    return { done: true }; // réponse identique pour ne rien divulguer
  }

  const formData = await request.formData();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (email.includes("@")) {
    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);
    if (user && !user.deletedAt) {
      const token = randomToken(32);
      await db.insert(schema.passwordResetTokens).values({
        id: newId(),
        userId: user.id,
        tokenHash: await sha256Hex(token),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
      await sendEmail({
        to: email,
        subject: "Réinitialisation de votre mot de passe DevisRoom",
        text: `Bonjour,\n\nUne réinitialisation de mot de passe a été demandée pour votre compte DevisRoom.\nLien (valable 1 heure) : ${getAppUrl()}/mot-de-passe-oublie?token=${token}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message.`,
      });
    }
  }
  // Toujours la même réponse, que le compte existe ou non.
  return { done: true };
}

export default function MotDePasseOublie({ actionData }: Route.ComponentProps) {
  return (
    <AuthShell
      title="Mot de passe oublié"
      subtitle="Indiquez votre adresse e-mail : si un compte existe, un lien de réinitialisation est généré."
      footer={
        <p>
          <Link to="/connexion" className="font-medium text-white underline">
            Retour à la connexion
          </Link>
        </p>
      }
    >
      {actionData?.done ? (
        <Alert tone="success" title="Demande enregistrée">
          Si un compte existe avec cette adresse, un lien de réinitialisation a
          été généré. Sur cette instance sans fournisseur d'e-mail configuré, le
          lien est disponible dans les journaux du serveur — contactez
          l'administrateur.
        </Alert>
      ) : (
        <Form method="post" className="flex flex-col gap-4">
          <Input
            label="Adresse e-mail"
            name="email"
            type="email"
            required
            autoComplete="email"
          />
          <Button type="submit" size="lg">
            Envoyer le lien de réinitialisation
          </Button>
        </Form>
      )}
    </AuthShell>
  );
}
