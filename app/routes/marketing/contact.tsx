import { Form } from "react-router";
import { Alert, Button, Input, Textarea } from "~/components/ui/primitives";
import {
  checkRateLimit,
  clientIp,
  RATE_LIMITS,
} from "~/server/auth/rate-limit.server";
import { assertSameOrigin } from "~/server/auth/session.server";
import { getDb } from "~/server/db.server";
import { getEnv } from "~/server/env.server";
import { sendEmail } from "~/server/services/email.server";
import type { Route } from "./+types/contact";

export const meta: Route.MetaFunction = () => [
  { title: "Contact — DevisRoom" },
  {
    name: "description",
    content:
      "Une question sur DevisRoom ? Écrivez-nous : nous répondons aux artisans et entreprises de services sous 48 h ouvrées.",
  },
];

export async function action({ request }: Route.ActionArgs) {
  assertSameOrigin(request);
  const db = getDb();
  const ip = clientIp(request);
  const rl = await checkRateLimit(db, "contact", ip, RATE_LIMITS.publicForm);
  if (!rl.allowed) {
    return {
      ok: false,
      error: "Trop de messages envoyés. Merci de réessayer plus tard.",
    };
  }
  const formData = await request.formData();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  // Champ pot de miel anti-spam : doit rester vide.
  const honeypot = String(formData.get("website") ?? "");
  if (honeypot) return { ok: true };
  if (!name || !email.includes("@") || message.length < 10) {
    return {
      ok: false,
      error:
        "Merci de renseigner votre nom, un e-mail valide et un message d'au moins 10 caractères.",
    };
  }
  await sendEmail({
    to: getEnv().ADMIN_EMAIL ?? "contact@devisroom.example",
    subject: `[Contact DevisRoom] Message de ${name}`,
    text: `De : ${name} <${email}>\n\n${message}`,
  });
  return { ok: true };
}

export default function Contact({ actionData }: Route.ComponentProps) {
  return (
    <main className="px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-xl">
        <h1 className="text-4xl font-bold tracking-tight text-white">
          Contact
        </h1>
        <p className="mt-4 text-slate-400">
          Une question sur le produit, les tarifs ou votre compte ?
          Écrivez-nous, nous répondons sous 48 h ouvrées.
        </p>

        {actionData?.ok ? (
          <div className="mt-8">
            <Alert tone="success" title="Message envoyé">
              Merci ! Nous revenons vers vous rapidement à l'adresse indiquée.
            </Alert>
          </div>
        ) : (
          <Form
            method="post"
            className="mt-8 flex flex-col gap-4 rounded-2xl bg-white p-6"
          >
            <Input label="Votre nom" name="name" required autoComplete="name" />
            <Input
              label="Votre adresse e-mail"
              name="email"
              type="email"
              required
              autoComplete="email"
            />
            {/* Pot de miel invisible pour les robots */}
            <div className="hidden" aria-hidden="true">
              <label>
                Site web
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                />
              </label>
            </div>
            <Textarea
              label="Votre message"
              name="message"
              required
              minLength={10}
            />
            {actionData && !actionData.ok && (
              <Alert tone="error">{actionData.error}</Alert>
            )}
            <Button type="submit" size="lg">
              Envoyer
            </Button>
          </Form>
        )}
      </div>
    </main>
  );
}
