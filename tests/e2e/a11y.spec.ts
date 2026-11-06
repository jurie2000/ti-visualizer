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

      test("Impressum-Dialog ohne Axe-Verstöße", async ({ page }) => {
        await page.goto("./");
        await page.getByRole("button", { name: "Impressum" }).click();
        await expect(page.getByRole("dialog")).toBeVisible();
        const result = await new AxeBuilder({ page }).withTags(tags).analyze();
        expect(result.violations).toEqual([]);
      });
    });
  }
});
