import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const tags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test.describe("a11y", { tag: "@a11y" }, () => {
  for (const theme of ["light", "dark"] as const) {
    test.describe(`Farbschema ${theme}`, () => {
      test.use({ colorScheme: theme });

      // Die App startet in Hell, Dunkel wählt man über den Umschalter
      const start = async (page: Page) => {
        await page.goto("./");
        if (theme === "dark")
          await page.getByRole("button", { name: "Dunkel" }).click();
      };

      test("Startansicht ohne Axe-Verstöße", async ({ page }) => {
        await start(page);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        const result = await new AxeBuilder({ page }).withTags(tags).analyze();
        expect(result.violations).toEqual([]);
      });

      test("Canvas mit Preset ohne Axe-Verstöße", async ({ page }) => {
        await start(page);
        await page.getByRole("button", { name: /^Arztpraxis Dr/ }).click();
        await expect(page.getByRole("group").first()).toBeVisible();
        const result = await new AxeBuilder({ page }).withTags(tags).analyze();
        expect(result.violations).toEqual([]);
      });

      test("Impressum-Dialog ohne Axe-Verstöße", async ({ page }) => {
        await start(page);
        await page.getByRole("button", { name: "Impressum" }).click();
        await expect(page.getByRole("dialog")).toBeVisible();
        const result = await new AxeBuilder({ page }).withTags(tags).analyze();
        expect(result.violations).toEqual([]);
      });

      test("Tastaturkürzel-Dialog ohne Axe-Verstöße", async ({ page }) => {
        await start(page);
        await page.getByRole("button", { name: "Tastaturkürzel" }).click();
        await expect(page.getByRole("dialog")).toBeVisible();
        const result = await new AxeBuilder({ page }).withTags(tags).analyze();
        expect(result.violations).toEqual([]);
      });
    });
  }
});
