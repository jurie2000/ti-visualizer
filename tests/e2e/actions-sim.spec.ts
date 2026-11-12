import { expect, test, type Page } from "@playwright/test";
import { schliessePalette, öffneKarteStecken, öffnePalette } from "./leisten";

const gerät = (page: Page, id: string) =>
  page.locator(`.react-flow__node[data-id="${id}"]`);
const spieler = (page: Page) =>
  page.getByRole("group", { name: /^Simulation/ });
const eintrag = (page: Page, name: string) =>
  page.getByRole("menuitem", { name: new RegExp(`^${name}`) });
const abgebrochen = "Simulation abgebrochen.";

async function öffne(page: Page, preset: RegExp) {
  await page.getByRole("button", { name: preset }).click();
  await expect(page.locator(".react-flow__node").first()).toBeVisible();
}

async function menüAn(page: Page, id: string) {
  await gerät(page, id).click({ button: "right" });
  await expect(page.getByRole("menu")).toBeVisible();
}

/** Wählt eine Aktion und hält an (Pause), damit der Schritt stehen bleibt. */
async function starte(page: Page, id: string, aktion: string) {
  await menüAn(page, id);
  await eintrag(page, aktion).click();
  await expect(spieler(page)).toBeVisible();
  await page.getByRole("button", { name: "Pause" }).click();
}

/** Schritt für Schritt bis „Ablauf beendet“; die Schrittzahl steht im Titel. */
async function bisZumEnde(page: Page) {
  const titel = spieler(page).locator(".tiv-sim__title");
  const n = Number(/von (\d+)/.exec(await titel.innerText())?.[1]);
  expect(n).toBeGreaterThan(0);
  for (let i = 2; i <= n; i++) {
    await page.getByRole("button", { name: "Schritt", exact: true }).click();
    await expect(titel).toContainText(`Schritt ${String(i)} von`);
  }
  await page.getByRole("button", { name: "Schritt", exact: true }).click();
  await expect(spieler(page)).toContainText("Ablauf beendet.");
}

test.describe("actions-sim", { tag: "@actions-sim" }, () => {
  let verletzungen: string[];
  // Ein natives <select> löst in WebKit selbst eine style-src-Meldung aus (auch auf
  // einer leeren Seite mit dieser CSP); nur der Test mit der Kartenart-Auswahl erlaubt sie.
  let nativesSelect = false;

  test.beforeEach(async ({ page }) => {
    verletzungen = [];
    nativesSelect = false;
    // CSP-Verletzungen (z. B. Inline-Styles in WebKit) und Konsolenfehler
    await page.addInitScript(() => {
      document.addEventListener("securitypolicyviolation", (e) => {
        console.error(`CSP ${e.violatedDirective} ${e.blockedURI}`);
      });
    });
    // WebKit meldet die harmlose ResizeObserver-Schleife von React Flow als Seitenfehler
    const melde = (text: string) => {
      if (text.startsWith("ResizeObserver loop completed")) return;
      if (nativesSelect && /style-src-attr|apply a stylesheet/.test(text))
        return;
      verletzungen.push(text);
    };
    page.on("console", (m) => {
      if (m.type() === "error") melde(m.text());
    });
    page.on("pageerror", (e) => {
      melde(e.message);
    });
    await page.goto("./");
    // Die Palette (KIM-Clientmodul) und die Sperre der Topologie brauchen Erweitert
    await öffne(page, /^Arztpraxis Dr/);
    await page.getByRole("button", { name: "Erweitert" }).click();
  });

  test.afterEach(() => {
    expect(verletzungen, "CSP-Verletzungen und Fehler").toEqual([]);
  });

  test("Kontextmenü: Menütaste öffnet, Pfeile wandern, Esc gibt den Fokus zurück (FR-6)", async ({
    page,
  }) => {
    await gerät(page, "pvs1").focus();
    await page.keyboard.press("Shift+F10");
    const menü = page.getByRole("menu");
    await expect(menü).toBeVisible();
    await expect(eintrag(page, "Details")).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(eintrag(page, "E-Rezept ausstellen")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(menü).toHaveCount(0);
    await expect(gerät(page, "pvs1")).toBeFocused();
    // Rechtsklick zeigt dasselbe Menü
    await menüAn(page, "pvs1");
    await expect(eintrag(page, "Ausfall simulieren")).toBeVisible();
  });

  test("ausgegraute Aktion bleibt sichtbar mit Begründung und wird ausführbar (FR-7)", async ({
    page,
  }) => {
    await menüAn(page, "pvs1");
    const kim = eintrag(page, "KIM-Nachricht senden");
    await expect(kim).toHaveAttribute("aria-disabled", "true");
    // nicht nur Farbe: Begründung als Text, dazu ein Symbol
    await expect(kim).toContainText("KIM-Clientmodul fehlt in der Topologie.");
    await expect(kim.locator("svg")).toBeVisible();
    // Playwright wartet sonst auf „enabled“; hier zählt, dass der Klick nichts startet
    await kim.click({ force: true });
    await expect(spieler(page)).toBeHidden();
    await page.keyboard.press("Escape");

    await öffnePalette(page);
    await page
      .getByRole("searchbox", { name: "Geräte suchen" })
      .fill("KIM-Client");
    await page
      .getByRole("button", { name: /KIM-Clientmodul.* hinzufügen$/ })
      .click();
    await schliessePalette(page);
    await menüAn(page, "pvs1");
    await expect(kim).not.toHaveAttribute("aria-disabled", "true");
    // KIM-Mail senden
    await kim.click();
    await expect(spieler(page)).toContainText("KIM-Nachricht senden");
    await bisZumEnde(page);
  });

  // Aktionen aus den Erfolgskriterien der Spec auf dem Preset Arztpraxis;
  // das Einlösen bietet nur das AVS an (actions.json), siehe unten.
  for (const aktion of [
    "E-Rezept ausstellen",
    "Notfalldatensatz schreiben",
    "Medikationsplan erstellen oder aktualisieren",
    "Medikationsplan auslesen",
    "VSDM-Prüfung anstoßen",
  ]) {
    test(`Aktion „${aktion}“ ist am PVS ausführbar und im Player sichtbar (FR-6, FR-9)`, async ({
      page,
    }) => {
      await starte(page, "pvs1", aktion);
      await expect(spieler(page)).toHaveAccessibleName(`Simulation: ${aktion}`);
      await expect(page.locator(".is-sim").first()).toBeVisible();
      await bisZumEnde(page);
    });
  }

  test("E-Rezept einlösen ist am AVS der Apotheke ausführbar (FR-6)", async ({
    page,
  }) => {
    await page
      .getByRole("button", { name: "TI Visualizer, zur Startansicht" })
      .click();
    await öffne(page, /Öffnen.*Apotheke/);
    await starte(page, "avs1", "E-Rezept einlösen \\(eGK einlesen\\)");
    await bisZumEnde(page);
  });

  test("eGK stecken macht die VSDM-Prüfung am Terminal ausführbar (FR-6, FR-7)", async ({
    page,
  }) => {
    nativesSelect = true;
    await menüAn(page, "kt1");
    await expect(eintrag(page, "VSDM-Prüfung anstoßen")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await page.keyboard.press("Escape");
    await öffneKarteStecken(page, gerät(page, "kt1"));
    const dialog = page.getByRole("dialog", { name: "Karte stecken" });
    await dialog.getByLabel("Kartenart").selectOption({ label: "eGK" });
    await dialog.getByLabel("PIN aktiv").check();
    await dialog.getByRole("button", { name: "Stecken" }).click();
    await expect(dialog).toBeHidden();
    await starte(page, "kt1", "VSDM-Prüfung anstoßen");
    await bisZumEnde(page);
  });

  test("Abspielen läuft von allein bis zum Ende (Tempo ändern, FR-9)", async ({
    page,
  }) => {
    await menüAn(page, "pvs1");
    await eintrag(page, "Medikationsplan auslesen").click();
    const tempo = page.getByRole("slider", { name: "Tempo" });
    await tempo.fill("2");
    await expect(tempo).toHaveAttribute("aria-valuetext", "2×");
    // vier Schritte zu je 1 s, kein fester Wartepunkt
    await expect(spieler(page)).toContainText("Ablauf beendet.", {
      timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: "Schließen" })).toBeVisible();
  });

  test("Abbrechen mit Esc, Leertaste pausiert, Schließen gibt den Fokus zurück (FR-10)", async ({
    page,
  }) => {
    await menüAn(page, "pvs1");
    await eintrag(page, "E-Rezept ausstellen").click();
    await expect(spieler(page)).toBeFocused();
    await page.keyboard.press("Space");
    await expect(
      page.getByRole("button", { name: "Weiter abspielen" }),
    ).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(spieler(page)).toContainText("Schritt 2 von");
    await page.keyboard.press("Escape");
    await expect(spieler(page)).toContainText(abgebrochen);
    await page.getByRole("button", { name: "Schließen" }).click();
    await expect(spieler(page)).toBeHidden();
    await expect(gerät(page, "pvs1")).toBeFocused();
  });

  test("Bearbeiten ist gesperrt: Ziehen und Palette, Störung bricht ab (Regelwerk 7)", async ({
    page,
  }) => {
    await starte(page, "pvs1", "Medikationsplan auslesen");
    // Ohne Ziehen der Geräte schiebt die Geste nur die Ansicht: der Abstand
    // zum Switch bleibt gleich, wenn das PVS nicht wandert.
    const abstand = async () => {
      const [a, b] = await Promise.all([
        gerät(page, "pvs1").boundingBox(),
        gerät(page, "sw1").boundingBox(),
      ]);
      if (!a || !b) throw new Error("Geräte nicht sichtbar");
      return { x: b.x - a.x, y: b.y - a.y };
    };
    const vorher = await abstand();
    const von = await gerät(page, "pvs1").boundingBox();
    if (!von) throw new Error("PVS nicht sichtbar");
    await page.mouse.move(von.x + 20, von.y + von.height / 2);
    await page.mouse.down();
    await page.mouse.move(von.x + 90, von.y + 60, { steps: 8 });
    await page.mouse.up();
    expect(await abstand()).toEqual(vorher);

    const kanten = await page.locator(".react-flow__edge").count();
    await öffnePalette(page);
    await page.getByRole("button", { name: /Switch hinzufügen$/ }).click();
    await expect(page.locator(".tiv-toasts")).toContainText(
      "Während der Simulation ist die Topologie gesperrt.",
    );
    await expect(gerät(page, "switch-1")).toHaveCount(0);
    await expect(page.locator(".react-flow__edge")).toHaveCount(kanten);

    // Störung am Konnektor bricht die Simulation ab
    await menüAn(page, "kon1");
    await eintrag(page, "Ausfall simulieren").click();
    await expect(spieler(page)).toContainText(abgebrochen);
    await menüAn(page, "kon1");
    await expect(eintrag(page, "Wieder in Betrieb nehmen")).toBeVisible();
  });

  test("Moduswechsel bricht die Simulation ab (Regelwerk 7)", async ({
    page,
  }) => {
    await starte(page, "pvs1", "Medikationsplan auslesen");
    await page.getByRole("button", { name: "Einfach" }).click();
    await expect(spieler(page)).toContainText(abgebrochen);
  });

  test("Detailpanel: nur die Überschrift ist live (FR-11, T-406)", async ({
    page,
  }) => {
    await menüAn(page, "pvs1");
    await eintrag(page, "Details").click();
    const panel = page.getByRole("complementary", { name: "Detailpanel" });
    const titel = panel.getByRole("heading", { level: 3 });
    await expect(titel).toContainText("Praxisverwaltungssystem");
    await expect(titel).toHaveAttribute("aria-live", "polite");
    await expect(panel.locator("#tiv-detail-body")).not.toHaveAttribute(
      "aria-live",
      /.*/,
    );
  });
});
