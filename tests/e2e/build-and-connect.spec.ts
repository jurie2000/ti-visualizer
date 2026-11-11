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
    // Die Tests bauen mit Anschlüssen und Netzgeräten: Modus Erweitert
    await page.getByRole("button", { name: "Erweitert" }).click();
    await expect(gerät(page, "sw1")).toBeVisible();
    await expect(page.locator(".react-flow__edge").first()).toBeVisible();
  });

  test("gültig verbinden per Tastatur, Ansage sichtbar", async ({ page }) => {
    // Gerät ergänzen: ein zweiter Switch aus der Palette
    await page.getByRole("button", { name: /Switch hinzufügen$/ }).click();
    await expect(gerät(page, "switch-1")).toBeVisible();
    const vorher = await page.locator(".react-flow__edge").count();
    await perTastatur(page, "switch-1", "sw1");
    await page
      .getByRole("dialog", { name: "Anschlüsse wählen" })
      .getByRole("button", { name: "Verbinden" })
      .click();
    await expect(page.locator(".tiv-toasts")).toContainText("Verbunden: ");
    await expect(page.locator(".react-flow__edge")).toHaveCount(vorher + 1);
  });

  test("Gerät mit der Maus verschieben, ohne eine Verbindung zu starten", async ({
    page,
  }) => {
    const knoten = gerät(page, "sw1");
    const vorher = await knoten.boundingBox();
    if (!vorher) throw new Error("Switch nicht sichtbar");
    const kanten = await page.locator(".react-flow__edge").count();
    // links in der Kachel greifen, weg vom Quellpunkt am rechten Rand
    const x = vorher.x + vorher.width * 0.25;
    const y = vorher.y + vorher.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 60, y + 40, { steps: 8 });
    // Kanten bleiben während des Ziehens sichtbar
    await expect(page.locator(".react-flow__edge")).toHaveCount(kanten);
    await page.mouse.up();
    await expect(page.locator(".react-flow__connectionline")).toHaveCount(0);
    const nachher = await knoten.boundingBox();
    expect(nachher?.x).toBeGreaterThan(vorher.x + 30);
    expect(nachher?.y).toBeGreaterThan(vorher.y + 20);
    await expect(page.locator(".react-flow__edge")).toHaveCount(kanten);
  });

  test("Moduswechsel: Einfach blendet Geräte aus und zeigt Sammelkanten", async ({
    page,
  }) => {
    const alle = await page.locator(".react-flow__node").count();
    await page.getByRole("button", { name: "Einfach" }).click();
    await expect(gerät(page, "sw1")).toHaveCount(0);
    expect(await page.locator(".react-flow__node").count()).toBeLessThan(alle);
    const sammel = page.getByRole("button", { name: /^Sammelkante .* über / });
    await expect(sammel.first()).toBeVisible();
    // Klick zeigt die ausgeblendeten Geräte
    await sammel.first().click();
    await expect(
      page.getByRole("list", { name: "Ausgeblendete Geräte" }),
    ).toBeVisible();
    // zurück: alles wieder da, keine Sammelkanten
    await page.getByRole("button", { name: "Erweitert" }).click();
    await expect(gerät(page, "sw1")).toBeVisible();
    await expect(sammel).toHaveCount(0);
    expect(await page.locator(".react-flow__node").count()).toBe(alle);
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
    /** Punkt am Gerät anklicken, dann das Zielgerät. */
    async function perKlick(page: Page, quelle: string, ziel: string) {
      await page.getByRole("button", { name: "Einpassen" }).click();
      await page.waitForTimeout(500);
      const von = await gerät(page, quelle)
        .locator(".tiv-handle--source")
        .boundingBox();
      const nach = await gerät(page, ziel).boundingBox();
      if (!von || !nach) throw new Error("Geräte nicht sichtbar");
      await page.mouse.click(von.x + von.width / 2, von.y + von.height / 2);
      await expect(page.locator(".tiv-toasts")).toContainText(
        "Jetzt das Zielgerät anklicken",
      );
      await page.mouse.click(nach.x + nach.width / 2, nach.y + nach.height / 2);
    }

    test("gültig verbinden per Klick: Punkt, dann Ziel", async ({ page }) => {
      await page.getByRole("button", { name: /Switch hinzufügen$/ }).click();
      await expect(gerät(page, "switch-1")).toBeVisible();
      const vorher = await page.locator(".react-flow__edge").count();
      await perKlick(page, "switch-1", "sw1");
      await page
        .getByRole("dialog", { name: "Anschlüsse wählen" })
        .getByRole("button", { name: "Verbinden" })
        .click();
      await expect(page.locator(".tiv-toasts")).toContainText("Verbunden: ");
      await expect(page.locator(".react-flow__edge")).toHaveCount(vorher + 1);
    });

    test("ungültig verbinden per Klick zeigt die Begründung", async ({
      page,
    }) => {
      const vorher = await page.locator(".react-flow__edge").count();
      await perKlick(page, "pvs1", "vpn1");
      await expect(page.locator(".tiv-toasts")).toContainText(
        "Den VPN-Tunnel in die TI baut nur der Konnektor",
      );
      await expect(page.locator(".react-flow__edge")).toHaveCount(vorher);
    });

    test("ungültig verbinden mit der Maus zeigt die Begründung", async ({
      page,
    }) => {
      const vorher = await page.locator(".react-flow__edge").count();
      // alles einpassen, damit beide Geräte sichtbar sind
      await page.getByRole("button", { name: "Einpassen" }).click();
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
