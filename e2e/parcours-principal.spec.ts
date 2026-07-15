import { expect, test } from "@playwright/test";

/**
 * Parcours principal de bout en bout :
 * inscription → création de l'entreprise → création du devis → formule →
 * publication → ouverture du lien privé → sélection d'une offre →
 * demande de modification → acceptation → événements dans le tableau de bord.
 */
const stamp = Date.now();
const EMAIL = `e2e-${stamp}@test.local`;
const PASSWORD = "motdepasse-e2e-solide";

test.describe.configure({ mode: "serial" });

test("parcours principal complet", async ({ page }) => {
  // 1. Inscription
  await page.goto("/inscription");
  await page.getByLabel("Votre nom").fill("Élise Testeuse");
  await page.getByLabel("Adresse e-mail").fill(EMAIL);
  await page.getByLabel("Mot de passe").fill(PASSWORD);
  await page.getByLabel(/J'accepte les/).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();

  // 2. Onboarding : création de l'entreprise
  await expect(page).toHaveURL(/\/app\/onboarding/);
  await page.getByLabel("Nom de l'entreprise").fill("Toitures E2E");
  await page.getByLabel("Métier").selectOption("Couvreur");
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(
    page.getByRole("heading", { name: "Logo et couleurs" }),
  ).toBeVisible();

  // 3. Création du devis (saisie manuelle, sans PDF)
  await page.goto("/app/devis/nouveau");
  await page.getByLabel("Titre du projet").fill("Rénovation toiture E2E");
  await page.getByLabel("Nom du client").fill("M. Client Final");
  await page.getByLabel(/Montant TTC/).fill("10900");
  await page
    .getByRole("button", { name: "Créer et personnaliser la page" })
    .click();
  await expect(page).toHaveURL(/\/app\/devis\/[^/]+\/modifier/);

  // 3bis. Ajouter une formule (onglet Offres)
  await page.getByRole("tab", { name: "Offres & options" }).click();
  await page.getByRole("button", { name: "+ Ajouter une formule" }).click();
  await page.getByLabel("Nom de la formule").fill("Recommandée");
  await page.getByLabel("Prix TTC (€)").fill("10900");
  await page.getByRole("button", { name: "Enregistrer les formules" }).click();
  await expect(page.getByText("Offres enregistrées.")).toBeVisible();

  // 4. Publication
  await page.getByRole("link", { name: "Aperçu & publication" }).click();
  await expect(page).toHaveURL(/\/app\/devis\/[^/]+$/);
  await page.getByRole("button", { name: "Publier", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Lien privé à envoyer à votre client" }),
  ).toBeVisible();

  const publicUrl = await page
    .getByLabel("Lien privé de la proposition")
    .inputValue();
  expect(publicUrl).toContain("/d/");
  const proposalUrl = new URL(publicUrl);

  // 5. Ouverture du lien privé (contexte anonyme : nouveau navigateur)
  const clientContext = await page.context().browser()!.newContext();
  const clientPage = await clientContext.newPage();
  await clientPage.goto(proposalUrl.pathname);
  await expect(
    clientPage.getByRole("heading", { name: "Rénovation toiture E2E" }),
  ).toBeVisible();

  // 6. Sélection de l'offre
  await clientPage.getByRole("radio", { name: /Recommandée/ }).click();
  await expect(clientPage.getByText("10 900 €").first()).toBeVisible();

  // 7. Demande de modification (les champs sont scopés à la modale ouverte)
  await clientPage
    .getByRole("button", { name: "Demander une modification" })
    .first()
    .click();
  const changeModal = clientPage.getByLabel("Demander une modification", {
    exact: true,
  });
  await changeModal.getByLabel("Votre nom").fill("M. Client Final");
  await changeModal
    .getByLabel("Votre adresse e-mail")
    .fill("client@test.local");
  await changeModal
    .getByLabel("Décrivez la modification souhaitée")
    .fill("Pouvez-vous ajouter le remplacement des gouttières ?");
  await changeModal.getByRole("button", { name: "Envoyer" }).click();
  await expect(changeModal.getByText(/bien été transmis/)).toBeVisible();
  await changeModal
    .getByRole("button", { name: "Fermer", exact: true })
    .last()
    .click();

  // 8. Acceptation
  await clientPage
    .getByRole("button", { name: "J'accepte cette proposition" })
    .first()
    .click();
  const acceptModal = clientPage.getByLabel("Accepter la proposition", {
    exact: true,
  });
  await acceptModal.getByLabel("Votre nom complet").fill("M. Client Final");
  await acceptModal
    .getByLabel("Votre adresse e-mail")
    .fill("client@test.local");
  await acceptModal.getByLabel(/Je confirme accepter/).check();
  await acceptModal.getByLabel(/J'accepte les conditions/).check();
  await acceptModal
    .getByRole("button", { name: "Confirmer mon acceptation" })
    .click();
  await expect(
    clientPage.getByText("Proposition acceptée", { exact: false }).first(),
  ).toBeVisible();
  await clientContext.close();

  // 9. Les événements apparaissent côté professionnel
  await page.goto("/app");
  await expect(page.getByText("Proposition acceptée").first()).toBeVisible();
  await expect(page.getByText("Modification demandée").first()).toBeVisible();

  await page.goto("/app/devis");
  await expect(page.getByText("Gagné").first()).toBeVisible();
});
