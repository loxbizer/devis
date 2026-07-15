import { eq } from "drizzle-orm";
import { Form, Link, redirect } from "react-router";
import { z } from "zod";
import { AuthShell } from "~/components/auth/auth-shell";
import { TurnstileWidget } from "~/components/auth/turnstile";
import { Alert, Button, Checkbox, Input } from "~/components/ui/primitives";
import { hashPassword, newId } from "~/server/auth/password.server";
import {
  checkRateLimit,
  clientIp,
  RATE_LIMITS,
} from "~/server/auth/rate-limit.server";
import {
  assertSameOrigin,
  createSession,
  getSession,
} from "~/server/auth/session.server";
import {
  getTurnstileSiteKey,
  verifyTurnstile,
} from "~/server/auth/turnstile.server";
import { getDb, schema } from "~/server/db.server";
import { getEnv } from "~/server/env.server";
import { audit } from "~/server/services/audit.server";
import type { Route } from "./+types/inscription";

export const meta: Route.MetaFunction = () => [
  { title: "Créer un compte — DevisRoom" },
  {
    name: "description",
    content:
      "Créez votre compte DevisRoom gratuitement et publiez votre première page de devis interactive en quelques minutes.",
  },
];

const registerSchema = z.object({
  name: z.string().trim().min(2, "Indiquez votre nom.").max(120),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Adresse e-mail invalide.")
    .max(200),
  password: z
    .string()
    .min(10, "Le mot de passe doit contenir au moins 10 caractères.")
    .max(200),
  cgu: z.literal("yes", {
    message: "Vous devez accepter les conditions d'utilisation.",
  }),
});

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request);
  if (session) throw redirect("/app");
  return { turnstileSiteKey: getTurnstileSiteKey() };
}

export async function action({ request }: Route.ActionArgs) {
  assertSameOrigin(request);
  const db = getDb();
  const ip = clientIp(request);
  const rl = await checkRateLimit(db, "register", ip, RATE_LIMITS.register);
  if (!rl.allowed) {
    return {
      error:
        "Trop de créations de compte depuis cette adresse. Réessayez plus tard.",
      fieldErrors: {} as Record<string, string>,
    };
  }

  const formData = await request.formData();
  const turnstileOk = await verifyTurnstile(
    formData.get("cf-turnstile-response"),
    ip,
  );
  if (!turnstileOk) {
    return {
      error: "Vérification anti-robot échouée. Merci de réessayer.",
      fieldErrors: {} as Record<string, string>,
    };
  }

  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    cgu: formData.get("cgu"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: null, fieldErrors };
  }

  const { name, email, password } = parsed.data;
  const existing = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);
  if (existing[0]) {
    return {
      error: "Un compte existe déjà avec cette adresse e-mail.",
      fieldErrors: {} as Record<string, string>,
    };
  }

  const userId = newId();
  const isAdmin =
    getEnv().ADMIN_EMAIL?.toLowerCase() === email
      ? ("admin" as const)
      : ("user" as const);
  await db.insert(schema.users).values({
    id: userId,
    email,
    name,
    passwordHash: await hashPassword(password),
    role: isAdmin,
  });
  await audit({ userId, action: "user.register", ipAddress: ip });

  const { setCookie } = await createSession(
    userId,
    request.headers.get("User-Agent"),
  );
  return redirect("/app/onboarding", { headers: { "Set-Cookie": setCookie } });
}

export default function Inscription({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const fieldErrors = actionData?.fieldErrors ?? {};
  return (
    <AuthShell
      title="Créer votre compte"
      subtitle="Gratuit, sans carte bancaire. 3 DevisRooms actives incluses."
      footer={
        <p>
          Déjà un compte ?{" "}
          <Link to="/connexion" className="font-medium text-white underline">
            Se connecter
          </Link>
        </p>
      }
    >
      <Form method="post" className="flex flex-col gap-4">
        <Input
          label="Votre nom"
          name="name"
          required
          autoComplete="name"
          error={fieldErrors.name}
        />
        <Input
          label="Adresse e-mail"
          name="email"
          type="email"
          required
          autoComplete="email"
          error={fieldErrors.email}
        />
        <Input
          label="Mot de passe"
          name="password"
          type="password"
          required
          minLength={10}
          autoComplete="new-password"
          hint="10 caractères minimum."
          error={fieldErrors.password}
        />
        <Checkbox
          name="cgu"
          value="yes"
          required
          error={fieldErrors.cgu}
          label={
            <>
              J'accepte les{" "}
              <Link to="/conditions-utilisation" className="underline">
                conditions d'utilisation
              </Link>{" "}
              et la{" "}
              <Link to="/confidentialite" className="underline">
                politique de confidentialité
              </Link>
              .
            </>
          }
        />
        <TurnstileWidget siteKey={loaderData.turnstileSiteKey} />
        {actionData?.error && <Alert tone="error">{actionData.error}</Alert>}
        <Button type="submit" size="lg">
          Créer mon compte
        </Button>
      </Form>
    </AuthShell>
  );
}
