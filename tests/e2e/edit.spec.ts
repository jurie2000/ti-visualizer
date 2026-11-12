import { expect, test, type Page } from "@playwright/test";

const gerät = (page: Page, id: string) =>
  page.locator(`.react-flow__node[data-id="${id}"]`);
const kanten = (page: Page) => page.locator(".react-flow__edge");

test.describe("edit", { tag: "@edit" }, () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("./");
    await page.getByRole("button", { name: /Öffnen.*Arztpraxis/ }).click();
    await page.getByRole("button", { name: "Erweitert" }).click();
    await expect(gerät(page, "sw1")).toBeVisible();
    await expect(kanten(page).first()).toBeVisible();
  });

  test("Gerät ziehen: Position bleibt", async ({ page }) => {
    const knoten = gerät(page, "sw1");
    const vorher = await knoten.boundingBox();
    if (!vorher) throw new Error("Switch nicht sichtbar");
    const x = vorher.x + vorher.width * 0.25;
    const y = vorher.y + vorher.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 80, y + 50, { steps: 10 });
    await page.mouse.up();
    const nachher = await knoten.boundingBox();
    expect(nachher?.x).toBeGreaterThan(vorher.x + 50);
  });

  test("Gerät löschen samt Kanten", async ({ page }) => {
    const alle = await page.locator(".react-flow__node").count();
    const verbunden = await kanten(page).count();
    await gerät(page, "sw1").click();
    await page.keyboard.press("Delete");
    await expect(gerät(page, "sw1")).toHaveCount(0);
    await expect(page.locator(".react-flow__node")).toHaveCount(alle - 1);
    expect(await kanten(page).count()).toBeLessThan(verbunden);
  });

  test("Sortieren sitzt in der Zoomleiste und behält alle Geräte", async ({
    page,
  }) => {
    const alle = await page.locator(".react-flow__node").count();
    await page.getByRole("button", { name: "Sortieren" }).click();
    await expect(page.locator(".react-flow__node")).toHaveCount(alle);
  });
});
