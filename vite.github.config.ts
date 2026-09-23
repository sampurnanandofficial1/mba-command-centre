import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: "/mba-command-centre/",
  root: path.join(root, "github-pages"),
  publicDir: path.join(root, "public"),
  plugins: [react()],
  resolve: { alias: { "@": root } },
  build: { outDir: path.join(root, "docs"), emptyOutDir: true },
});
