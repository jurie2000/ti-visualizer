import { expect, test, type Page } from "@playwright/test";

const gerät = (page: Page, id: string) =>
  page.locator(`.react-flow__node[data-id="${id}"]`);
const kanten = (page: Page) => page.locator(".react-flow__edge");

test.describe("edit", { tag: "@edit" }, () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("./");
    await page.getByRole("button", { name: /^Arztpraxis Dr/ }).click();
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

test.describe("edit Sortieren", { tag: "@edit" }, () => {
  for (const [preset, name] of [
    ["Arztpraxis", /^Arztpraxis Dr/],
    ["Apotheke", /Öffnen.*Apotheke/],
    ["Krankenhaus", /Öffnen.*Kreiskrankenhaus/],
    ["Klinikum", /Öffnen.*Klinikum/],
  ] as const) {
    for (const modus of ["Einfach", "Erweitert"]) {
      test(`T-720a Sortieren ohne Überlappung, mindestens 16 px Abstand: ${preset}, ${modus}`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: 1600, height: 900 });
        await page.goto("./");
        await page.getByRole("button", { name }).click();
        await page.getByRole("button", { name: modus, exact: true }).click();
        await expect(
          page.locator(".react-flow__node-device").first(),
        ).toBeVisible();
        await page.getByRole("button", { name: "Sortieren" }).click();
        // nach „Sortieren“ passt die Ansicht an (30 ms); gemessen wird in Flusskoordinaten
        await page.waitForTimeout(400);
        const r = await page.evaluate(() =>
          [
            ...document.querySelectorAll<HTMLElement>(
              ".react-flow__node-device",
            ),
          ].map((e) => {
            const b = e.getBoundingClientRect();
            const z = b.width / e.offsetWidth;
            return {
              id: e.dataset["id"] ?? "",
              x: b.x / z,
              y: b.y / z,
              w: e.offsetWidth,
              h: e.offsetHeight,
            };
          }),
        );
        expect(r.length).toBeGreaterThan(5);
        for (const a of r)
          for (const b of r) {
            if (a.id >= b.id) continue;
            const gx = Math.max(a.x - (b.x + b.w), b.x - (a.x + a.w));
            const gy = Math.max(a.y - (b.y + b.h), b.y - (a.y + a.h));
            expect(Math.max(gx, gy), `${a.id}/${b.id}`).toBeGreaterThanOrEqual(
              16,
            );
          }
      });
    }
  }
});
