import { redirect } from "react-router";
import {
  assertSameOrigin,
  clearSessionCookie,
  destroySession,
} from "~/server/auth/session.server";
import type { Route } from "./+types/deconnexion";

export async function action({ request }: Route.ActionArgs) {
  assertSameOrigin(request);
  await destroySession(request);
  return redirect("/", { headers: { "Set-Cookie": clearSessionCookie() } });
}

export async function loader() {
  // La déconnexion se fait uniquement en POST (protection CSRF).
  return redirect("/");
}
