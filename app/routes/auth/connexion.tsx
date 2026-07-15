import { eq } from "drizzle-orm";
import { Form, Link, redirect } from "react-router";
import { AuthShell } from "~/components/auth/auth-shell";
import { TurnstileWidget } from "~/components/auth/turnstile";
import { Alert, Button, Input } from "~/components/ui/primitives";
import { verifyPassword } from "~/server/auth/password.server";
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
import { audit } from "~/server/services/audit.server";
import type { Route } from "./+types/connexion";

export const meta: Route.MetaFunction = () => [
  { title: "Connexion — DevisRoom" },
  { name: "description", content: "Connectez-vous à votre espace DevisRoom." },
];

function safeNext(next: string | null): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/app";
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request);
  if (session) throw redirect("/app");
  return { turnstileSiteKey: getTurnstileSiteKey() };
}

export async function action({ request }: Route.ActionArgs) {
  assertSameOrigin(request);
  const db = getDb();
  const ip = clientIp(request);
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(new URL(request.url).searchParams.get("next"));

  // Limitation par IP et par compte ciblé.
  const rlIp = await checkRateLimit(db, "login_ip", ip, RATE_LIMITS.login);
  const rlEmail = await checkRateLimit(
    db,
    "login_email",
    email,
    RATE_LIMITS.login,
  );
  if (!rlIp.allowed || !rlEmail.allowed) {
    return {
      error: "Trop de tentatives de connexion. Merci de patienter 15 minutes.",
    };
  }

  const turnstileOk = await verifyTurnstile(
    formData.get("cf-turnstile-response"),
    ip,
  );
  if (!turnstileOk) {
    return { error: "Vérification anti-robot échouée. Merci de réessayer." };
  }

  const genericError = "Adresse e-mail ou mot de passe incorrect.";
  if (!email.includes("@") || password.length === 0) {
    return { error: genericError };
  }

  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);
  if (!user || user.deletedAt) return { error: genericError };
  if (user.suspendedAt) {
    return { error: "Ce compte est suspendu. Contactez le support DevisRoom." };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    await audit({
      userId: user.id,
      action: "user.login_failed",
      ipAddress: ip,
    });
    return { error: genericError };
  }

  await audit({ userId: user.id, action: "user.login", ipAddress: ip });
  const { setCookie } = await createSession(
    user.id,
    request.headers.get("User-Agent"),
  );
  return redirect(next, { headers: { "Set-Cookie": setCookie } });
}

export default function Connexion({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  return (
    <AuthShell
      title="Connexion"
      subtitle="Retrouvez vos DevisRooms et vos statistiques."
      footer={
        <p>
          Pas encore de compte ?{" "}
          <Link to="/inscription" className="font-medium text-white underline">
            Créer un compte gratuit
          </Link>
        </p>
      }
    >
      <Form method="post" className="flex flex-col gap-4">
        <Input
          label="Adresse e-mail"
          name="email"
          type="email"
          required
          autoComplete="email"
        />
        <Input
          label="Mot de passe"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
        <div className="text-right">
          <Link
            to="/mot-de-passe-oublie"
            className="text-sm text-brand-700 underline"
          >
            Mot de passe oublié ?
          </Link>
        </div>
        <TurnstileWidget siteKey={loaderData.turnstileSiteKey} />
        {actionData?.error && <Alert tone="error">{actionData.error}</Alert>}
        <Button type="submit" size="lg">
          Se connecter
        </Button>
      </Form>
    </AuthShell>
  );
}
