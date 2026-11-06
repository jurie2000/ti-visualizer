import { expect, test, type Page } from "@playwright/test";

const gerät = (page: Page, id: string) =>
  page.locator(`.react-flow__node[data-id="${id}"]`);

/** Verbinden per Tastatur: V an der Quelle, V am Ziel. */
async function perTastatur(page: Page, quelle: string, ziel: string) {
  await gerät(page, quelle).focus();
  await page.keyboard.press("v");
  await gerät(page, ziel).focus();
  await page.keyboard.press("v");
}

test.describe("build-and-connect", { tag: "@build-and-connect" }, () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("./");
    await page.getByRole("button", { name: /Öffnen.*Arztpraxis/ }).click();
    await expect(gerät(page, "sw1")).toBeVisible();
    await expect(page.locator(".react-flow__edge").first()).toBeVisible();
  });

  test("gültig verbinden per Tastatur, Ansage sichtbar", async ({ page }) => {
    // Gerät ergänzen: ein zweiter Switch aus der Palette
    await page.getByRole("button", { name: /Switch hinzufügen$/ }).click();
    await expect(gerät(page, "switch-1")).toBeVisible();
    const vorher = await page.locator(".react-flow__edge").count();
    await perTastatur(page, "switch-1", "sw1");
    await expect(page.locator(".tiv-toasts")).toContainText("Verbunden: ");
    await expect(page.locator(".react-flow__edge")).toHaveCount(vorher + 1);
  });

  test("ungültig verbinden per Tastatur zeigt die Begründung", async ({
    page,
  }) => {
    const vorher = await page.locator(".react-flow__edge").count();
    await perTastatur(page, "pvs1", "vpn1");
    await expect(page.locator(".tiv-toasts")).toContainText(
      "Den VPN-Tunnel in die TI baut nur der Konnektor",
    );
    await expect(page.locator(".react-flow__edge")).toHaveCount(vorher);
  });

  test.describe("Maus", () => {
    test("ungültig verbinden mit der Maus zeigt die Begründung", async ({
      page,
    }) => {
      const vorher = await page.locator(".react-flow__edge").count();
      // alles einpassen, damit beide Geräte sichtbar sind
      await page.getByRole("button", { name: "Alles einpassen" }).click();
      await page.waitForTimeout(500);
      const von = await gerät(page, "pvs1")
        .locator(".tiv-handle--source")
        .boundingBox();
      const nach = await gerät(page, "vpn1").boundingBox();
      if (!von || !nach) throw new Error("Geräte nicht sichtbar");
      await page.mouse.move(von.x + von.width / 2, von.y + von.height / 2);
      await page.mouse.down();
      await page.mouse.move(nach.x + nach.width / 2, nach.y + nach.height / 2, {
        steps: 15,
      });
      await page.mouse.up();
      await expect(page.locator(".tiv-toasts")).toContainText(
        "Den VPN-Tunnel in die TI baut nur der Konnektor",
      );
      await expect(page.locator(".react-flow__edge")).toHaveCount(vorher);
    });
  });
});
