import { reactRouter } from "@react-router/dev/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tailwindcss(),
    reactRouter(),
  ],
  // Pré-optimise les dépendances client pour éviter les rechargements de
  // page en plein usage (important pour la stabilité des tests e2e).
  optimizeDeps: {
    include: ["zod", "motion/react", "pdfjs-dist"],
  },
  resolve: {
    tsconfigPaths: true,
  },
});
