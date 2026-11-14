import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

// Wortlaut der Content-Security-Policy.
const csp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join("; ");

// Nur im Build: `vite dev` setzt Styles inline (CSS-Import) und blockiert sie
// unter `style-src 'self'`. Der Build liefert CSS als Datei aus.
const haertung = (): Plugin => ({
  name: "ti-haertung",
  apply: "build",
  transformIndexHtml: () => [
    {
      tag: "meta",
      attrs: { "http-equiv": "Content-Security-Policy", content: csp },
      injectTo: "head-prepend",
    },
    {
      tag: "meta",
      attrs: { name: "referrer", content: "no-referrer" },
      injectTo: "head-prepend",
    },
  ],
});

export default defineConfig({
  base: process.env["BASE_PATH"] ?? "/ti-visualizer/",
  plugins: [react(), haertung()],
  build: {
    // Schriften nie als data:-URL einbetten, sonst blockiert `font-src 'self'` sie.
    assetsInlineLimit: (file) =>
      /\.(woff2?|ttf|otf)$/.test(file) ? false : undefined,
  },
});
