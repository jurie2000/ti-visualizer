import { expect, test } from "@playwright/test";

test.describe("smoke", { tag: "@smoke" }, () => {
  test("App lädt, Impressum erreichbar, keine CSP-Verletzung, keine fremden Anfragen", async ({
    page,
    baseURL,
  }) => {
    const origin = new URL(baseURL ?? "").origin;
    const fremd: string[] = [];
    const meldungen: string[] = [];

    page.on("request", (request) => {
      const url = new URL(request.url());
      // data:/blob: sind lokal; alles andere außer der Preview-Origin ist fremd.
      if (url.protocol === "data:" || url.protocol === "blob:") return;
      if (url.origin !== origin) fremd.push(request.url());
    });
    page.on("console", (msg) => {
      if (msg.type() === "error" || msg.type() === "warning") {
        meldungen.push(`${msg.type()}: ${msg.text()}`);
      }
    });
    page.on("pageerror", (err) => {
      meldungen.push(`pageerror: ${err.message}`);
    });
    // CSP-Verletzungen als Event im Seitenkontext erfassen.
    await page.addInitScript(() => {
      const w = window as unknown as { __csp: string[] };
      w.__csp = [];
      document.addEventListener("securitypolicyviolation", (e) => {
        w.__csp.push(`${e.violatedDirective} ${e.blockedURI}`);
      });
    });

    await page.goto("./");
    await expect(
      page.getByRole("heading", { level: 1, name: "TI Visualizer" }),
    ).toBeVisible();

    // Die gehärtete Seite trägt die CSP als Meta-Tag (nur im Build).
    await expect(
      page.locator('meta[http-equiv="Content-Security-Policy"]'),
    ).toHaveCount(1);

    // Preset öffnen: Karte wählen, Canvas zeigt die Geräte, zurück zur Startansicht
    await expect(page.locator(".tiv-preset")).toHaveCount(5);
    await page.getByRole("button", { name: /^Arztpraxis Dr/ }).click();
    await expect(
      page.getByRole("group", { name: /^PVS: Praxisverwaltungssystem/ }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "TI Visualizer, zur Startansicht" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Womit möchtest du beginnen?" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Impressum" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();

    await page.waitForLoadState("networkidle");

    const csp = await page.evaluate(
      () => (window as unknown as { __csp: string[] }).__csp,
    );
    expect(csp, "CSP-Verletzungen").toEqual([]);
    expect(meldungen, "Konsole (Fehler/Warnungen)").toEqual([]);
    expect(fremd, "Anfragen an fremde Origins").toEqual([]);
  });
});
