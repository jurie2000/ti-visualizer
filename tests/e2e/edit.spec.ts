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

  test("Gerät ziehen: Position bleibt, ein Rückgängig-Schritt", async ({
    page,
  }) => {
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
    // ein Schritt: einmal Rückgängig stellt die alte Position her
    await page.keyboard.press("ControlOrMeta+z");
    const zurück = await knoten.boundingBox();
    expect(zurück?.x).toBeCloseTo(vorher.x, 0);
    expect(zurück?.y).toBeCloseTo(vorher.y, 0);
    await page.keyboard.press("ControlOrMeta+y");
    const wieder = await knoten.boundingBox();
    expect(wieder?.x).toBeCloseTo(nachher?.x ?? 0, 0);
  });

  test("Rückgängig und Wiederholen über mehrere Schritte", async ({ page }) => {
    const vorher = await page.locator(".react-flow__node").count();
    const hinzu = page.getByRole("button", { name: /Switch hinzufügen$/ });
    await hinzu.click();
    await hinzu.click();
    await expect(page.locator(".react-flow__node")).toHaveCount(vorher + 2);
    await page.getByRole("button", { name: "Rückgängig" }).click();
    await page.getByRole("button", { name: "Rückgängig" }).click();
    await expect(page.locator(".react-flow__node")).toHaveCount(vorher);
    await page.keyboard.press("ControlOrMeta+Shift+z");
    await expect(page.locator(".react-flow__node")).toHaveCount(vorher + 1);
    await page.getByRole("button", { name: "Wiederholen" }).click();
    await expect(page.locator(".react-flow__node")).toHaveCount(vorher + 2);
  });

  test("Gerät löschen samt Kanten und wiederherstellen", async ({ page }) => {
    const alle = await page.locator(".react-flow__node").count();
    const verbunden = await kanten(page).count();
    await gerät(page, "sw1").click();
    await page.keyboard.press("Delete");
    await expect(gerät(page, "sw1")).toHaveCount(0);
    await expect(page.locator(".react-flow__node")).toHaveCount(alle - 1);
    expect(await kanten(page).count()).toBeLessThan(verbunden);
    await page.keyboard.press("ControlOrMeta+z");
    await expect(gerät(page, "sw1")).toBeVisible();
    await expect(kanten(page)).toHaveCount(verbunden);
  });

  test("Duplizieren und Anordnen sind je ein Schritt", async ({ page }) => {
    const alle = await page.locator(".react-flow__node").count();
    await gerät(page, "sw1").click();
    await page.getByRole("button", { name: "Duplizieren" }).click();
    await expect(page.locator(".react-flow__node")).toHaveCount(alle + 1);
    await page.getByRole("button", { name: "Anordnen" }).click();
    await page.getByRole("button", { name: "Rückgängig" }).click();
    await expect(page.locator(".react-flow__node")).toHaveCount(alle + 1);
    await page.getByRole("button", { name: "Rückgängig" }).click();
    await expect(page.locator(".react-flow__node")).toHaveCount(alle);
  });
});
