import { Link } from "react-router";
import type { Route } from "./+types/fonctionnalites";

export const meta: Route.MetaFunction = () => [
  { title: "Fonctionnalités — DevisRoom" },
  {
    name: "description",
    content:
      "Import de devis PDF, pages privées personnalisables, variantes d'offres, options, suivi des consultations, acceptation en ligne et acompte : toutes les fonctionnalités DevisRoom.",
  },
];

const GROUPS = [
  {
    title: "Import et création",
    items: [
      {
        name: "Import du devis PDF",
        text: "Déposez le PDF de votre logiciel habituel : le texte est extrait quand c'est possible et la page pré-remplie. Les scans sans texte sont signalés clairement — la saisie manuelle reste rapide et le PDF reste joint.",
      },
      {
        name: "Éditeur simple",
        text: "Titre, message personnel, résumé, prestations, étapes du chantier, délais, garanties et FAQ : chaque section n'apparaît que si vous la remplissez.",
      },
      {
        name: "Photos de chantier",
        text: "Jusqu'à 20 images par proposition, optimisées automatiquement avant envoi pour rester rapides sur mobile.",
      },
      {
        name: "Duplication",
        text: "Repartez d'un devis existant pour vos chantiers similaires (plans Solo et plus).",
      },
    ],
  },
  {
    title: "Offres et prix",
    items: [
      {
        name: "Jusqu'à 3 formules",
        text: "Essentielle, Recommandée, Sérénité : votre client compare des offres claires au lieu de négocier une remise (variantes sur le plan Pro).",
      },
      {
        name: "Options à cocher",
        text: "Fenêtre de toit, traitement anti-mousse… votre client compose son projet et le total se met à jour instantanément.",
      },
      {
        name: "Montant recalculé côté serveur",
        text: "Le total confirmé lors de l'acceptation est toujours revalidé par le serveur : aucune manipulation possible.",
      },
    ],
  },
  {
    title: "Côté client",
    items: [
      {
        name: "Lien privé, aucun compte",
        text: "Votre client ouvre un lien non répertorié et non indexé. Vous pouvez ajouter un code secret et une date d'expiration.",
      },
      {
        name: "Questions et modifications",
        text: "Il pose ses questions et demande des ajustements directement depuis la page — plus rien ne se perd dans les répondeurs.",
      },
      {
        name: "Acceptation en ligne",
        text: "Nom, e-mail, confirmation du montant et des conditions : l'acceptation est horodatée avec la version exacte de la proposition. (Ce n'est pas une signature électronique qualifiée.)",
      },
      {
        name: "Acompte",
        text: "Redirection vers votre propre lien de paiement Stripe ou affichage de vos coordonnées de virement. DevisRoom ne détient jamais les fonds.",
      },
    ],
  },
  {
    title: "Suivi et organisation",
    items: [
      {
        name: "Suivi honnête des consultations",
        text: "Ouvertures, appareil, formules comparées, options explorées. Pas de score inventé ni de suivi invasif.",
      },
      {
        name: "Notifications intégrées",
        text: "Première consultation, question, demande de modification, acceptation, acompte déclenché : tout arrive dans votre centre de notifications.",
      },
      {
        name: "Classement des devis",
        text: "Gagné, perdu, expiré, en attente, archivé : votre tableau de bord reste fiable et vos statistiques utiles.",
      },
      {
        name: "Multi-utilisateurs",
        text: "Jusqu'à 5 comptes avec le plan Équipe, pour vos commerciaux et conducteurs de travaux.",
      },
      {
        name: "Points de récompense",
        text: "Chaque devis publié, consulté ou accepté vous fait gagner des points — échangeables contre un badge « Certifié » ou une réduction sur votre prochaine facture. Ludique, jamais obligatoire.",
      },
    ],
  },
];

export default function Fonctionnalites() {
  return (
    <main className="px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-4xl font-bold tracking-tight text-white">
          Tout ce qu'il faut pour présenter un devis sérieusement.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-400">
          DevisRoom complète votre logiciel de devis actuel : il ne facture pas,
          il ne comptabilise pas — il transforme votre PDF en une page qui donne
          envie de dire oui.
        </p>

        <div className="mt-14 flex flex-col gap-14">
          {GROUPS.map((group) => (
            <section key={group.title} aria-labelledby={`titre-${group.title}`}>
              <h2
                id={`titre-${group.title}`}
                className="text-2xl font-bold text-white"
              >
                {group.title}
              </h2>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                {group.items.map((item) => (
                  <div key={item.name} className="glass rounded-2xl p-5">
                    <h3 className="font-semibold text-white">{item.name}</h3>
                    <p className="mt-2 text-sm text-slate-400">{item.text}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-16 flex flex-wrap gap-4">
          <Link
            to="/inscription"
            className="rounded-xl bg-brand-500 px-6 py-3 font-semibold text-white transition hover:bg-brand-400"
          >
            Créer ma première DevisRoom
          </Link>
          <Link
            to="/demonstration"
            className="rounded-xl border border-white/15 px-6 py-3 font-medium text-white transition hover:bg-white/5"
          >
            Voir la démonstration
          </Link>
        </div>
      </div>
    </main>
  );
}
