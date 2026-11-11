import { expect, test, type Page } from "@playwright/test";

const preset = (page: Page) =>
  page.getByRole("button", { name: /Öffnen.*Arztpraxis/ }).click();
const hinweis = (page: Page) =>
  page.getByRole("note").filter({ hasText: "größere Bildschirme" });
const keinSeitenScroll = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth <=
      document.documentElement.clientWidth,
  );

test.describe("responsive", { tag: "@responsive" }, () => {
  test("Tablet 1024 px: Palette und Details als Überlagerung", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("./");
    await preset(page);
    await page.getByRole("button", { name: "Erweitert" }).click();
    const palette = page.getByRole("complementary", { name: "Palette" });
    const detail = page.getByRole("complementary", { name: "Detailpanel" });
    await expect(palette).toBeHidden();
    await expect(detail).toBeHidden();
    await expect(hinweis(page)).toBeHidden();

    const knopf = page.getByRole("button", { name: "Palette", exact: true });
    await knopf.click();
    await expect(palette).toBeVisible();
    await expect(knopf).toHaveAttribute("aria-expanded", "true");
    // Überlagerung: die Fläche behält ihre volle Breite
    const fläche = await page.locator(".tiv-canvas").boundingBox();
    expect(fläche?.width).toBeGreaterThan(900);

    // Gerät hinzufügen schließt die Überlagerung
    const vorher = await page.locator(".react-flow__node").count();
    await palette.getByRole("button", { name: /Switch hinzufügen$/ }).click();
    await expect(page.locator(".react-flow__node")).toHaveCount(vorher + 1);
    await expect(palette).toBeHidden();

    await page.getByRole("button", { name: "Details" }).click();
    await expect(detail).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(detail).toBeHidden();
    await expect(page.getByRole("button", { name: "Details" })).toBeFocused();
  });

  test("Kopfleiste 1024 px: Knöpfe erreichbar, kein Seitenscroll", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("./");
    await preset(page);
    await expect(
      page.getByRole("button", { name: "Sicherheitsprüfung" }),
    ).toBeVisible();
    expect(await keinSeitenScroll(page)).toBe(true);
  });

  test("Breite 600 px: Hinweis, Presets und Datei ansehbar", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 600, height: 800 });
    await page.goto("./");
    await expect(hinweis(page)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Öffnen.*Arztpraxis/ }),
    ).toBeVisible();
    expect(await keinSeitenScroll(page)).toBe(true);
    await preset(page);
    await expect(page.locator(".react-flow__node").first()).toBeVisible();
    expect(await keinSeitenScroll(page)).toBe(true);
    // Datei öffnen ist bedienbar: Dialog erreichbar, Datei wird geladen
    await page.getByRole("button", { name: "Öffnen", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.locator("input[type=file]").setInputFiles({
      name: "leer.tiv.json",
      mimeType: "application/json",
      buffer: Buffer.from("{}"),
    });
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(await keinSeitenScroll(page)).toBe(true);
  });

  test("Breite 1280 px: feste Spalten, kein Hinweis", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("./");
    await preset(page);
    await expect(
      page.getByRole("complementary", { name: "Palette" }),
    ).toBeVisible();
    await expect(
      page.getByRole("complementary", { name: "Detailpanel" }),
    ).toBeVisible();
    await expect(hinweis(page)).toBeHidden();
    // Die Arbeitsfläche füllt die Resthöhe zwischen Kopfleiste und Fußzeile
    const [kopf, fläche, fuß] = await Promise.all([
      page.locator(".tiv-header").boundingBox(),
      page.locator(".tiv-main").boundingBox(),
      page.locator(".tiv-footer").boundingBox(),
    ]);
    expect(fläche?.y).toBeCloseTo((kopf?.y ?? 0) + (kopf?.height ?? 0), 0);
    expect((fläche?.y ?? 0) + (fläche?.height ?? 0)).toBeCloseTo(
      fuß?.y ?? 0,
      0,
    );
    expect(fläche?.height).toBeGreaterThan(500);
  });
});
