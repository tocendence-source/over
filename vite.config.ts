import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    // Emit every asset as a separate, hash-named file. Nothing is inlined as a
    // data: URL, so the deployed document references only same-origin files and
    // the CSP can stay free of 'unsafe-inline' and data: in script-src/style-src.
    assetsInlineLimit: 0,
    // Keep the document free of injected helper snippets: every script the page
    // runs must arrive as an external file so script-src can stay 'self' only.
    // modulepreload hints are supported by every browser that speaks ES modules.
    modulePreload: { polyfill: false },
  },
  // Keep Vite's localhost/IP defaults instead of accepting arbitrary Host headers.
  // For a trusted preview proxy, explicitly allow its exact hostname; never use
  // a wildcard parent domain shared with other tenants or allowedHosts: true.
  server: { allowedHosts: [] },
  preview: { allowedHosts: [] },
});
