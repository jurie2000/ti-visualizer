import { defineConfig, devices } from "@playwright/test";

const basePath = process.env["BASE_PATH"] ?? "/ti-visualizer/";
const port = 4173;
const origin = `http://localhost:${String(port)}`;

export default defineConfig({
  testDir: "tests/e2e",
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 1 : 0,
  reporter: process.env["CI"]
    ? [["list"], ["html", { open: "never" }]]
    : "list",
  use: {
    baseURL: `${origin}${basePath}`,
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
  ],
  webServer: {
    command: `pnpm build && pnpm exec vite preview --port ${String(port)} --strictPort`,
    url: `${origin}${basePath}`,
    reuseExistingServer: !process.env["CI"],
    timeout: 120_000,
    env: { BASE_PATH: basePath },
  },
});
