import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  build: {
    // Separate same-origin assets preserve the production CSP and lazy WebGL chunk.
    assetsInlineLimit: 0,
    modulePreload: { polyfill: false },
  },
  // Keep Vite's host validation. For an owned preview domain, set
  // __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS instead of allowing arbitrary hosts.
  server: { host: "127.0.0.1", allowedHosts: [] },
  preview: { host: "127.0.0.1", allowedHosts: [] },
});
