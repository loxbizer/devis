import { LegalPage } from "~/components/marketing/legal-page";
import type { Route } from "./+types/mentions-legales";

export const meta: Route.MetaFunction = () => [
  { title: "Mentions légales — DevisRoom" },
  { name: "description", content: "Mentions légales du service DevisRoom." },
  { name: "robots", content: "noindex" },
];

export default function MentionsLegales() {
  return (
    <LegalPage title="Mentions légales" updated="juillet 2026">
      <section>
        <h2>Éditeur du service</h2>
        <p>
          Le service DevisRoom est édité par son exploitant, dont les
          coordonnées complètes (dénomination, siège social, numéro
          d'immatriculation, contact) seront renseignées ici avant l'ouverture
          commerciale du service. Contact provisoire : via la page{" "}
          <a href="/contact" className="underline">
            Contact
          </a>
          .
        </p>
      </section>
      <section>
        <h2>Hébergement</h2>
        <p>
          L'application est hébergée sur l'infrastructure de Cloudflare, Inc.,
          101 Townsend St, San Francisco, CA 94107, États-Unis
          (https://www.cloudflare.com), avec des points de présence dans l'Union
          européenne.
        </p>
      </section>
      <section>
        <h2>Nature du service</h2>
        <p>
          DevisRoom permet de présenter des devis sous forme de pages web
          privées. DevisRoom n'est pas un logiciel de facturation, n'émet pas de
          documents comptables et ne fournit pas de signature électronique
          qualifiée au sens du règlement eIDAS. Chaque entreprise utilisatrice
          reste seule responsable du contenu de ses devis et de ses obligations
          contractuelles envers ses clients.
        </p>
      </section>
      <section>
        <h2>Paiements</h2>
        <p>
          Les abonnements DevisRoom sont encaissés via Stripe. Les acomptes
          éventuellement réglés par les clients finaux le sont directement
          auprès de l'entreprise utilisatrice (lien de paiement Stripe de
          l'entreprise ou virement) : DevisRoom ne détient jamais ces fonds.
        </p>
      </section>
      <section>
        <h2>Propriété intellectuelle</h2>
        <p>
          La marque, le logo et l'interface DevisRoom sont protégés. Les
          contenus déposés par les utilisateurs (devis, photos, textes) restent
          leur propriété exclusive.
        </p>
      </section>
    </LegalPage>
  );
}
