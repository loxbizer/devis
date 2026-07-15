import { eq } from "drizzle-orm";
import { useFetcher } from "react-router";
import { useAppContext } from "./layout";
import { Alert, Button, Input } from "~/components/ui/primitives";
import { hashPassword, verifyPassword } from "~/server/auth/password.server";
import { requireSession, verifyCsrf } from "~/server/auth/session.server";
import { getDb, schema } from "~/server/db.server";
import { audit } from "~/server/services/audit.server";
import { requireOrg } from "~/server/services/org.server";
import type { Route } from "./+types/parametres";

export const meta: Route.MetaFunction = () => [
  { title: "Paramètres — DevisRoom" },
  { name: "robots", content: "noindex" },
];

export async function loader({ request }: Route.LoaderArgs) {
  const ctx = await requireOrg(request);
  return {
    user: { name: ctx.session.user.name, email: ctx.session.user.email },
    exportAllowed: ctx.plan.limits.export,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const session = await requireSession(request);
  const formData = await request.formData();
  await verifyCsrf(request, session, formData);
  const intent = String(formData.get("intent") ?? "");
  const db = getDb();

  if (intent === "save_profile") {
    const name = String(formData.get("name") ?? "").trim();
    if (name.length < 2 || name.length > 120) {
      return { ok: false, error: "Nom invalide." };
    }
    await db
      .update(schema.users)
      .set({ name, updatedAt: new Date() })
      .where(eq(schema.users.id, session.user.id));
    return { ok: true, message: "Profil enregistré." };
  }

  if (intent === "change_password") {
    const current = String(formData.get("currentPassword") ?? "");
    const next = String(formData.get("newPassword") ?? "");
    if (next.length < 10) {
      return {
        ok: false,
        error: "Le nouveau mot de passe doit contenir au moins 10 caractères.",
      };
    }
    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, session.user.id))
      .limit(1);
    if (!user || !(await verifyPassword(current, user.passwordHash))) {
      return { ok: false, error: "Mot de passe actuel incorrect." };
    }
    await db
      .update(schema.users)
      .set({ passwordHash: await hashPassword(next), updatedAt: new Date() })
      .where(eq(schema.users.id, session.user.id));
    await audit({ userId: session.user.id, action: "user.password_change" });
    return { ok: true, message: "Mot de passe modifié." };
  }

  return { ok: false, error: "Action inconnue." };
}

export default function Parametres({ loaderData }: Route.ComponentProps) {
  const { csrf } = useAppContext();
  const profileFetcher = useFetcher<{
    ok: boolean;
    error?: string;
    message?: string;
  }>();
  const passwordFetcher = useFetcher<{
    ok: boolean;
    error?: string;
    message?: string;
  }>();

  return (
    <div className="flex max-w-xl flex-col gap-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Paramètres</h1>
        <p className="mt-1 text-sm text-slate-500">
          Votre compte utilisateur ({loaderData.user.email}).
        </p>
      </div>

      <profileFetcher.Form method="post" className="flex flex-col gap-5">
        <input type="hidden" name="_csrf" value={csrf} />
        <input type="hidden" name="intent" value="save_profile" />
        <Input
          label="Votre nom"
          name="name"
          required
          defaultValue={loaderData.user.name}
        />
        {profileFetcher.data && !profileFetcher.data.ok && (
          <Alert tone="error">{profileFetcher.data.error}</Alert>
        )}
        {profileFetcher.data?.ok && (
          <Alert tone="success">{profileFetcher.data.message}</Alert>
        )}
        <Button type="submit" loading={profileFetcher.state !== "idle"}>
          Enregistrer
        </Button>
      </profileFetcher.Form>

      <passwordFetcher.Form method="post" className="flex flex-col gap-5">
        <input type="hidden" name="_csrf" value={csrf} />
        <input type="hidden" name="intent" value="change_password" />
        <h2 className="text-lg font-semibold">Changer de mot de passe</h2>
        <Input
          label="Mot de passe actuel"
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
        />
        <Input
          label="Nouveau mot de passe"
          name="newPassword"
          type="password"
          required
          minLength={10}
          autoComplete="new-password"
          hint="10 caractères minimum."
        />
        {passwordFetcher.data && !passwordFetcher.data.ok && (
          <Alert tone="error">{passwordFetcher.data.error}</Alert>
        )}
        {passwordFetcher.data?.ok && (
          <Alert tone="success">{passwordFetcher.data.message}</Alert>
        )}
        <Button type="submit" loading={passwordFetcher.state !== "idle"}>
          Modifier le mot de passe
        </Button>
      </passwordFetcher.Form>
    </div>
  );
}
