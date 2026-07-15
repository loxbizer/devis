import {
  handleStripeEvent,
  verifyStripeWebhook,
} from "~/server/services/stripe.server";
import type { Route } from "./+types/stripe-webhook";

/**
 * Webhook Stripe. La signature est TOUJOURS vérifiée côté serveur —
 * c'est le seul chemin qui active ou modifie un abonnement.
 */
export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return new Response("Méthode non autorisée", { status: 405 });
  }
  const event = await verifyStripeWebhook(request);
  if (!event) {
    return new Response("Signature invalide", { status: 400 });
  }
  try {
    await handleStripeEvent(event);
  } catch (error) {
    console.error("[stripe-webhook]", error);
    return new Response("Erreur de traitement", { status: 500 });
  }
  return new Response("ok", { status: 200 });
}

export async function loader() {
  return new Response("Méthode non autorisée", { status: 405 });
}
