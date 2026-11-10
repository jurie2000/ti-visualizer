import { defineConfig, devices } from "@playwright/test";

const basePath = process.env["BASE_PATH"] ?? "/ti-visualizer/";
const port = Number(process.env["E2E_PORT"] ?? 4173);
const origin = `http://localhost:${String(port)}`;
// Öffentliche Adresse (mit Pfad und abschließendem „/“): kein lokaler Server.
const externeUrl = process.env["E2E_BASE_URL"];

export default defineConfig({
  testDir: "tests/e2e",
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 1 : 0,
  reporter: process.env["CI"]
    ? [["list"], ["html", { open: "never" }]]
    : "list",
  use: {
    baseURL: externeUrl ?? `${origin}${basePath}`,
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  // Suiten als Projekte; Auswahl auch per `--grep @smoke` bzw. `@a11y`.
  projects: [
    {
      name: "smoke",
      testMatch: "smoke.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "a11y",
      testMatch: "a11y.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "build-and-connect",
      testMatch: "build-and-connect.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    // Suite `datei` als einzige in drei Browsern (Safari-Annäherung: WebKit).
    {
      name: "datei",
      testMatch: "datei.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "datei-firefox",
      testMatch: "datei.spec.ts",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "datei-webkit",
      testMatch: "datei.spec.ts",
      use: { ...devices["Desktop Safari"] },
    },
    // Suite `actions-sim` wie `datei` in drei Browsern (WebKit: Inline-Styles verletzen dort die CSP).
    {
      name: "actions-sim",
      testMatch: "actions-sim.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "actions-sim-firefox",
      testMatch: "actions-sim.spec.ts",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "actions-sim-webkit",
      testMatch: "actions-sim.spec.ts",
      use: { ...devices["Desktop Safari"] },
    },
    {
      // Injection-Suite und Fuzzing (T-305)
      name: "security",
      testDir: "tests/security",
      testMatch: "*.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Mit E2E_BASE_URL (öffentliche Adresse) startet kein lokaler Server.
  ...(externeUrl
    ? {}
    : {
        webServer: {
          // In der CI liegt `dist/` schon aus der Stufe `build` vor (E2E_SKIP_BUILD).
          command: `${process.env["E2E_SKIP_BUILD"] ? "" : "pnpm build && "}pnpm exec vite preview --port ${String(port)} --strictPort`,
          url: `${origin}${basePath}`,
          reuseExistingServer: !process.env["CI"],
          timeout: 120_000,
          env: { BASE_PATH: basePath },
        },
      }),
});
