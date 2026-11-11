import { expect, test, type Page } from "@playwright/test";

/** Mit Tab zum Element, dessen Name (aria-label oder Text) passt; nur Tastatur, kein Klick. */
async function tabbeZu(page: Page, name: RegExp | string) {
  const muster = name instanceof RegExp ? name : new RegExp(`^${name}$`);
  for (let i = 0; i < 400; i++) {
    await page.keyboard.press("Tab");
    const treffer = await page.evaluate(
      ({ source, flags }) => {
        const el = document.activeElement;
        const text = (
          el?.getAttribute("aria-label") ??
          (el as HTMLElement | null)?.innerText ??
          ""
        )
          .replace(/\s+/g, " ")
          .trim();
        return new RegExp(source, flags).test(text);
      },
      { source: muster.source, flags: muster.flags },
    );
    if (treffer) return;
  }
  throw new Error(`Per Tab nicht erreichbar: ${String(muster)}`);
}

/** Mit Tab zum Gerät mit dieser ID. */
async function tabbeZuGerät(page: Page, id: string) {
  for (let i = 0; i < 400; i++) {
    await page.keyboard.press("Tab");
    const treffer = await page.evaluate(
      (knoten) => document.activeElement?.getAttribute("data-id") === knoten,
      id,
    );
    if (treffer) return;
  }
  throw new Error(`Gerät per Tab nicht erreichbar: ${id}`);
}

test.describe("keyboard", { tag: "@keyboard" }, () => {
  test("FR-22: Preset öffnen, Gerät ergänzen, verbinden, Aktion abspielen, speichern nur per Tastatur", async ({
    page,
  }) => {
    // Der Dateiweg ist in allen Browsern ein Download (kein System-Dialog)
    await page.addInitScript(() => {
      Reflect.deleteProperty(window, "showSaveFilePicker");
    });
    await page.goto("./");

    await tabbeZu(page, /Öffnen.*Arztpraxis/);
    await page.keyboard.press("Enter");
    await expect(page.locator(".react-flow__node").first()).toBeVisible();
    await tabbeZu(page, "Erweitert");
    await page.keyboard.press("Enter");

    // Gerät ergänzen
    await tabbeZu(page, /Switch hinzufügen$/);
    await page.keyboard.press("Enter");
    await expect(
      page.locator('.react-flow__node[data-id="switch-1"]'),
    ).toBeVisible();

    // verbinden: V an der Quelle, V am Ziel, Anschlüsse bestätigen
    await tabbeZuGerät(page, "switch-1");
    await page.keyboard.press("v");
    await tabbeZuGerät(page, "sw1");
    await page.keyboard.press("v");
    const kanten = await page.locator(".react-flow__edge").count();
    await expect(
      page.getByRole("dialog", { name: "Anschlüsse wählen" }),
    ).toBeVisible();
    await tabbeZu(page, "Verbinden");
    await page.keyboard.press("Enter");
    await expect(page.locator(".react-flow__edge")).toHaveCount(kanten + 1);

    // Aktion über das Kontextmenü, im Player mit Esc abbrechen
    await tabbeZuGerät(page, "pvs1");
    await page.keyboard.press("Shift+F10");
    await page.keyboard.press("ArrowDown");
    await expect(
      page.getByRole("menuitem", { name: /^E-Rezept ausstellen/ }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    const spieler = page.getByRole("group", { name: /^Simulation/ });
    await expect(spieler).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(spieler).toContainText("Schritt");
    await page.keyboard.press("Escape");
    await expect(spieler).toContainText("Simulation abgebrochen.");
    await page.keyboard.press("Escape");
    await expect(spieler).toBeHidden();

    // speichern
    const download = page.waitForEvent("download");
    await page.keyboard.press("ControlOrMeta+s");
    expect((await download).suggestedFilename()).toMatch(/\.tiv\.json$/);
  });

  test("FR-22: Gerät mit Enter wählen und mit Pfeiltasten verschieben, Löschen mit Entf", async ({
    page,
  }) => {
    await page.goto("./");
    await tabbeZu(page, /Öffnen.*Arztpraxis/);
    await page.keyboard.press("Enter");
    await tabbeZuGerät(page, "pvs1");
    const knoten = page.locator('.react-flow__node[data-id="pvs1"]');
    const vorher = await knoten.boundingBox();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Shift+ArrowRight");
    const nachher = await knoten.boundingBox();
    expect(nachher?.x).toBeGreaterThan((vorher?.x ?? 0) + 5);
    await page.keyboard.press("Delete");
    await expect(knoten).toHaveCount(0);
  });

  test("FR-22: ? öffnet die Kürzelübersicht, Esc schließt sie", async ({
    page,
  }) => {
    await page.goto("./");
    await page.keyboard.press("?");
    const dialog = page.getByRole("dialog", { name: "Tastaturkürzel" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Rückgängig");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
});
