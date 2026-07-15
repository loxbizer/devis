import { LegalPage } from "~/components/marketing/legal-page";
import type { Route } from "./+types/confidentialite";

export const meta: Route.MetaFunction = () => [
  { title: "Politique de confidentialité — DevisRoom" },
  {
    name: "description",
    content:
      "Comment DevisRoom collecte, utilise et protège vos données personnelles.",
  },
];

export default function Confidentialite() {
  return (
    <LegalPage title="Politique de confidentialité" updated="juillet 2026">
      <section>
        <h2>Données collectées</h2>
        <ul>
          <li>
            <strong>Comptes professionnels :</strong> nom, adresse e-mail, mot
            de passe (haché, jamais stocké en clair), informations de
            l'entreprise saisies volontairement.
          </li>
          <li>
            <strong>Contenu des propositions :</strong> devis PDF, photos,
            textes — visibles uniquement via le lien privé de chaque
            proposition.
          </li>
          <li>
            <strong>Clients finaux :</strong> lorsqu'un client pose une
            question, demande une modification ou accepte une proposition, nous
            enregistrons le nom et l'adresse e-mail qu'il saisit, la date et
            l'appareil utilisé. En cas d'acceptation, l'adresse IP et le
            navigateur peuvent être conservés comme éléments de preuve de
            l'acceptation (intérêt légitime de l'entreprise émettrice).
          </li>
          <li>
            <strong>Consultations :</strong> un identifiant de visite aléatoire
            (cookie technique) permet de compter les consultations d'une
            proposition sans identifier la personne. Aucun suivi publicitaire,
            aucune revente de données, aucun pixel tiers.
          </li>
        </ul>
      </section>
      <section>
        <h2>Cookies</h2>
        <p>
          DevisRoom n'utilise que des cookies strictement nécessaires : cookie
          de session pour les comptes professionnels, cookie technique de
          comptage de visite sur les pages de proposition, cookie de
          déverrouillage lorsque la page est protégée par un code. Aucun cookie
          publicitaire n'est déposé ; aucune bannière de consentement n'est donc
          requise pour ces cookies exemptés.
        </p>
      </section>
      <section>
        <h2>Finalités et bases légales</h2>
        <ul>
          <li>Fourniture du service (exécution du contrat).</li>
          <li>
            Sécurité, prévention des abus et journal d'audit (intérêt légitime).
          </li>
          <li>
            Facturation des abonnements via Stripe (exécution du contrat,
            obligations légales).
          </li>
        </ul>
      </section>
      <section>
        <h2>Sous-traitants</h2>
        <p>
          Cloudflare (hébergement, stockage des fichiers, base de données) et
          Stripe (paiement des abonnements). Ces prestataires disposent de
          mécanismes de conformité pour les transferts hors UE (clauses
          contractuelles types).
        </p>
      </section>
      <section>
        <h2>Durées de conservation</h2>
        <p>
          Les données d'un compte sont conservées tant que le compte est actif.
          Les propositions supprimées le sont définitivement, fichiers inclus.
          Les journaux techniques sont conservés au maximum 12 mois.
        </p>
      </section>
      <section>
        <h2>Vos droits</h2>
        <p>
          Vous disposez des droits d'accès, de rectification, d'effacement, de
          limitation et de portabilité prévus par le RGPD. Exercez-les via la
          page{" "}
          <a href="/contact" className="underline">
            Contact
          </a>
          . Vous pouvez également saisir la CNIL (cnil.fr). Si vous êtes le
          client final d'une entreprise utilisatrice, celle-ci est responsable
          de traitement pour les données de votre devis : adressez-vous d'abord
          à elle.
        </p>
      </section>
    </LegalPage>
  );
}
