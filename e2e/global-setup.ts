import { execSync } from "node:child_process";

/** Applique les migrations D1 locales avant de lancer le serveur de dev. */
export default function globalSetup() {
  execSync("npx wrangler d1 migrations apply devisroom --local", {
    stdio: "inherit",
  });
}
