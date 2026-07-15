import { LegalPage } from "~/components/marketing/legal-page";
import type { Route } from "./+types/conditions-utilisation";

export const meta: Route.MetaFunction = () => [
  { title: "Conditions d'utilisation — DevisRoom" },
  {
    name: "description",
    content: "Conditions générales d'utilisation du service DevisRoom.",
  },
  { name: "robots", content: "noindex" },
];

export default function ConditionsUtilisation() {
  return (
    <LegalPage title="Conditions d'utilisation" updated="juillet 2026">
      <section>
        <h2>1. Objet</h2>
        <p>
          DevisRoom fournit un outil de présentation de devis sous forme de
          pages web privées, un suivi de consultation et un enregistrement
          d'acceptation. Le service est réservé à un usage professionnel.
        </p>
      </section>
      <section>
        <h2>2. Ce que DevisRoom n'est pas</h2>
        <ul>
          <li>Un logiciel de facturation ou de comptabilité.</li>
          <li>Un service de signature électronique qualifiée (eIDAS).</li>
          <li>
            Un intermédiaire de paiement pour les acomptes : les fonds versés
            par les clients finaux vont directement à l'entreprise, via son
            propre lien Stripe ou par virement.
          </li>
          <li>
            Une garantie de résultat commercial : DevisRoom facilite la
            présentation et la décision, sans promettre d'augmentation des
            ventes.
          </li>
        </ul>
      </section>
      <section>
        <h2>3. Compte et sécurité</h2>
        <p>
          Vous êtes responsable de la confidentialité de vos identifiants et de
          l'exactitude des informations saisies. Les liens de proposition sont
          privés : ne les partagez qu'avec vos clients.
        </p>
      </section>
      <section>
        <h2>4. Contenus</h2>
        <p>
          Vous restez propriétaire et responsable des contenus publiés (devis,
          photos, textes). Sont interdits les contenus illicites, trompeurs ou
          portant atteinte aux droits de tiers. En cas d'abus, le compte peut
          être suspendu après notification.
        </p>
      </section>
      <section>
        <h2>5. Abonnements et quotas</h2>
        <p>
          Les plans, prix TTC et limites (nombre de DevisRooms actives,
          stockage) sont décrits sur la page Tarifs. Le dépassement d'une limite
          n'entraîne jamais de suppression de données : la publication de
          nouvelles propositions est simplement suspendue jusqu'à archivage ou
          changement de plan. Résiliation possible à tout moment, effective en
          fin de période payée.
        </p>
      </section>
      <section>
        <h2>6. Acceptation en ligne</h2>
        <p>
          L'acceptation enregistrée par DevisRoom (identité déclarée, montant,
          version de la proposition, horodatage) constitue un élément de preuve
          simple. Elle ne constitue pas une signature électronique qualifiée.
          L'entreprise reste responsable de ses obligations contractuelles et
          des mentions légales applicables à ses devis.
        </p>
      </section>
      <section>
        <h2>7. Disponibilité et responsabilité</h2>
        <p>
          Le service est fourni « en l'état », avec un objectif de disponibilité
          élevé, sans engagement de niveau de service sur les plans standard. La
          responsabilité de l'éditeur est limitée aux montants payés au cours
          des 12 derniers mois.
        </p>
      </section>
      <section>
        <h2>8. Droit applicable</h2>
        <p>Droit français. Litiges soumis aux tribunaux compétents français.</p>
      </section>
    </LegalPage>
  );
}
