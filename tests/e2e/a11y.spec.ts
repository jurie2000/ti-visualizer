import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const tags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test.describe("a11y", { tag: "@a11y" }, () => {
  for (const theme of ["light", "dark"] as const) {
    test.describe(`Farbschema ${theme}`, () => {
      test.use({ colorScheme: theme });

      test("Startansicht ohne Axe-Verstöße", async ({ page }) => {
        await page.goto("./");
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        const result = await new AxeBuilder({ page }).withTags(tags).analyze();
        expect(result.violations).toEqual([]);
      });

      test("Canvas mit Preset ohne Axe-Verstöße", async ({ page }) => {
        await page.goto("./");
        await page.getByRole("button", { name: /Öffnen.*Arztpraxis/ }).click();
        await expect(page.getByRole("group").first()).toBeVisible();
        const result = await new AxeBuilder({ page }).withTags(tags).analyze();
        expect(result.violations).toEqual([]);
      });

      test("Listenansicht ohne Axe-Verstöße", async ({ page }) => {
        await page.goto("./");
        await page.getByRole("button", { name: /Öffnen.*Arztpraxis/ }).click();
        await page.getByRole("button", { name: "Listenansicht" }).click();
        await expect(page.getByRole("table")).toBeVisible();
        const result = await new AxeBuilder({ page }).withTags(tags).analyze();
        expect(result.violations).toEqual([]);
      });

      test("Impressum-Dialog ohne Axe-Verstöße", async ({ page }) => {
        await page.goto("./");
        await page.getByRole("button", { name: "Impressum" }).click();
        await expect(page.getByRole("dialog")).toBeVisible();
        const result = await new AxeBuilder({ page }).withTags(tags).analyze();
        expect(result.violations).toEqual([]);
      });

      test("Tastaturkürzel-Dialog ohne Axe-Verstöße", async ({ page }) => {
        await page.goto("./");
        await page.getByRole("button", { name: "Tastaturkürzel" }).click();
        await expect(page.getByRole("dialog")).toBeVisible();
        const result = await new AxeBuilder({ page }).withTags(tags).analyze();
        expect(result.violations).toEqual([]);
      });
    });
  }

  // FR-22: Aktion und Sicherheitsprüfung ohne die Fläche, nur über die Liste
  test("Durchlauf nur über die Listenansicht: Aktion starten, Sicherheitsprüfung öffnen (FR-22)", async ({
    page,
  }) => {
    await page.goto("./");
    await page.getByRole("button", { name: /Öffnen.*Arztpraxis/ }).click();
    await page.getByRole("button", { name: "Erweitert" }).click();
    await page.getByRole("button", { name: "Listenansicht" }).click();
    await expect(page.locator(".react-flow")).toHaveCount(0);

    const knopf = page.getByRole("button", {
      name: "Aktionen: Praxisverwaltungssystem",
    });
    await knopf.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("menu")).toBeVisible();
    await page.getByRole("menuitem", { name: /^E-Rezept ausstellen/ }).click();
    const spieler = page.getByRole("group", { name: /^Simulation/ });
    await expect(spieler).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Schließen" }).click();
    await expect(knopf).toBeFocused();

    await page
      .getByRole("button", { name: "Sicherheitsprüfung" })
      .last()
      .click();
    await expect(
      page.getByRole("dialog", { name: "Sicherheitsprüfung" }),
    ).toBeVisible();
  });
});
