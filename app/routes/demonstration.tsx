import { Link } from "react-router";
import { ProposalPublicPage } from "~/components/proposal/public-page";
import { DEMO_PROPOSAL_VM } from "~/lib/demo-data";
import type { Route } from "./+types/demonstration";

export const meta: Route.MetaFunction = () => [
  { title: "Démonstration DevisRoom — exemple de devis interactif" },
  {
    name: "description",
    content:
      "Découvrez à quoi ressemble un devis DevisRoom pour votre client : exemple fictif d'une rénovation de toiture avec trois formules, options et acceptation en ligne.",
  },
];

export default function Demonstration() {
  return (
    <>
      <div className="bg-night-900 px-4 py-3 text-center text-sm text-slate-300">
        Vous découvrez la page telle que votre client la verra.{" "}
        <Link to="/" className="font-medium text-white underline">
          Retour au site DevisRoom
        </Link>{" "}
        ·{" "}
        <Link to="/inscription" className="font-medium text-white underline">
          Créer ma première DevisRoom
        </Link>
      </div>
      <ProposalPublicPage vm={DEMO_PROPOSAL_VM} />
    </>
  );
}
