import { expect, test, type Page } from "@playwright/test";
import {
  räumePanelsAuf,
  schliessePalette,
  öffneKarteStecken,
  öffnePalette,
} from "./leisten";

const gerät = (page: Page, id: string) =>
  page.locator(`.react-flow__node[data-id="${id}"]`);
const karte = (page: Page) => page.getByRole("region", { name: "Tutorial" });
const spieler = (page: Page) =>
  page.getByRole("group", { name: /^Simulation/ });

const hinzufügen = async (page: Page, name: RegExp) => {
  await öffnePalette(page);
  await page
    .getByRole("button", { name })
    .and(page.locator(".tiv-palette__add"))
    .click();
  await schliessePalette(page);
};

/** Verbinden per Tastatur (V an der Quelle, V am Ziel), Anschlüsse im Dialog bestätigen. */
async function verbinde(page: Page, quelle: string, ziel: string) {
  await gerät(page, quelle).focus();
  await page.keyboard.press("v");
  await gerät(page, ziel).focus();
  await page.keyboard.press("v");
  await page
    .getByRole("dialog", { name: "Anschlüsse wählen" })
    .getByRole("button", { name: "Verbinden" })
    .click();
  await expect(page.getByRole("dialog")).toBeHidden();
}

async function stecke(page: Page, gerätId: string, arten: string[]) {
  for (const art of arten) {
    await öffneKarteStecken(page, gerät(page, gerätId));
    const dialog = page.getByRole("dialog", { name: "Karte stecken" });
    await dialog.getByRole("radio", { name: new RegExp(`^${art}`) }).check();
    await dialog.getByRole("button", { name: "Stecken" }).click();
    await expect(dialog).toBeHidden();
  }
}

/** Aktion per Menütaste starten und im Player bis zum Ende schalten. */
async function spiele(page: Page, gerätId: string, aktion: string) {
  await gerät(page, gerätId).focus();
  await page.keyboard.press("ContextMenu");
  await page.getByRole("menuitem", { name: new RegExp(`^${aktion}`) }).click();
  await expect(spieler(page)).toBeVisible();
  await page.getByRole("button", { name: "Pause" }).click();
  const titel = spieler(page).locator(".tiv-sim__title");
  const n = Number(/von (\d+)/.exec(await titel.innerText())?.[1]);
  for (let i = 1; i <= n; i++)
    await page.getByRole("button", { name: "Schritt", exact: true }).click();
  await expect(spieler(page)).toContainText("Ablauf beendet.");
  await page.getByRole("button", { name: "Schließen", exact: true }).click();
}

/** Erledigt-Hinweis prüfen, dann Weiter. */
async function weiter(page: Page, titel: string, erledigt: boolean) {
  await expect(karte(page).getByRole("heading", { name: titel })).toBeVisible();
  if (erledigt) await expect(karte(page)).toContainText("Erledigt:");
  await räumePanelsAuf(page);
  await karte(page).getByRole("button", { name: "Weiter" }).click();
}

test.describe("tutorial", { tag: "@tutorial" }, () => {
  let fehler: string[];
  test.beforeEach(async ({ page }) => {
    fehler = [];
    // CSP-Verletzungen (Porträts als Datei, kein Inline-Stil) und Konsolenfehler
    await page.addInitScript(() => {
      document.addEventListener("securitypolicyviolation", (e) => {
        console.error(`CSP ${e.violatedDirective} ${e.blockedURI}`);
      });
    });
    page.on("console", (m) => {
      if (m.type() === "error") fehler.push(m.text());
    });
    page.on("pageerror", (e) => {
      fehler.push(e.message);
    });
    await page.goto("./");
    await page.getByRole("button", { name: /Tutorial · Einsteiger/ }).click();
    await expect(karte(page)).toContainText(" 1/16");
  });

  test("beide Teile vollständig durchspielen (FR-20)", async ({ page }) => {
    test.setTimeout(60_000);
    const prüfe = (titel: string, f: () => Promise<void>) =>
      f().then(() => weiter(page, titel, true));
    await weiter(page, "Willkommen", false);

    // Teil 1: Arztpraxis
    await prüfe("PC und PVS", async () => {
      await hinzufügen(page, /^PC /);
      await hinzufügen(page, /^PVS /);
      await verbinde(page, "pvs-1", "pc-1");
    });
    await prüfe("Das Kartenterminal", () => hinzufügen(page, /^eHealth-KT /));
    await prüfe("Karten stecken", () =>
      stecke(page, "kt-1", ["SMC-B", "HBA", "eGK"]),
    );
    await prüfe("Das Praxisnetz", async () => {
      await hinzufügen(page, /^Switch /);
      await verbinde(page, "pc-1", "switch-1");
      await verbinde(page, "kt-1", "switch-1");
    });
    await prüfe("Der Konnektor", async () => {
      await hinzufügen(page, /^Konnektor /);
      await verbinde(page, "switch-1", "kon-1");
    });
    await prüfe("Der Weg in die TI", async () => {
      await hinzufügen(page, /^VPN-Zugang /);
      await verbinde(page, "kon-1", "vpn-1");
    });
    await prüfe("Fachdienste", async () => {
      await hinzufügen(page, /^IDP /);
      await hinzufügen(page, /^E-Rezept /);
      await hinzufügen(page, /^VSDM /);
      for (const d of ["idp-1", "erp-1", "vsdm-1"])
        await verbinde(page, "vpn-1", d);
    });
    await prüfe("Dein erstes E-Rezept", () =>
      spiele(page, "pc-1", "E-Rezept ausstellen"),
    );
    await weiter(page, "Praxis fertig", false);

    // Teil 2: Apotheke, im vorbereiteten Bereich
    await expect(karte(page)).toContainText("Teil 2: Apotheke");
    await expect(page.locator(".react-flow__node-zone")).toContainText(
      "Apotheke am Markt",
    );
    await prüfe("Eine Apotheke nebenan", async () => {
      await hinzufügen(page, /^PC /);
      await hinzufügen(page, /^AVS /);
      await verbinde(page, "avs-1", "pc-2");
    });
    await prüfe("Terminal der Apotheke", async () => {
      await hinzufügen(page, /^eHealth-KT /);
      await stecke(page, "kt-2", ["SMC-B", "eGK"]);
    });
    await prüfe("Netz der Apotheke", async () => {
      await hinzufügen(page, /^Switch /);
      await verbinde(page, "pc-2", "switch-2");
      await verbinde(page, "kt-2", "switch-2");
    });
    await prüfe("Eigener Konnektor", async () => {
      await hinzufügen(page, /^Konnektor /);
      await verbinde(page, "switch-2", "kon-2");
      await verbinde(page, "kon-2", "vpn-1");
      // Mit zwei Konnektoren braucht das Apotheken-Terminal sein Pairing
      await gerät(page, "kt-2").focus();
      await page.keyboard.press("Enter");
      await page
        .getByRole("group", { name: "Pairing mit" })
        .getByLabel("kon-2")
        .check();
      // Reihenbetrieb: das Gateway des PCs ist die IP-Adresse des Konnektors (P-25)
      await gerät(page, "kon-2").focus();
      await page.keyboard.press("Enter");
      const ip = await page.getByLabel("IP-Adresse").inputValue();
      await gerät(page, "pc-2").focus();
      await page.keyboard.press("Enter");
      await page.getByLabel(/^Gateway/).fill(ip);
      await page.keyboard.press("Tab");
    });
    await prüfe("Rezept einlösen", () =>
      spiele(page, "pc-2", "E-Rezept einlösen \\(eGK einlesen\\)"),
    );
    await expect(
      karte(page).getByRole("heading", { name: "Geschafft" }),
    ).toBeVisible();
    await expect(karte(page)).toContainText(" 16/16");
    await karte(page).getByRole("button", { name: "Tutorial beenden" }).click();
    await expect(karte(page)).toBeHidden();
  });

  test("Tastatur: Weiter und Zurück ohne Maus, Fortschritt bleibt über die Startansicht", async ({
    page,
  }) => {
    await karte(page).getByRole("button", { name: "Weiter" }).focus();
    await page.keyboard.press("Enter");
    await expect(karte(page)).toContainText(" 2/16");
    await page.keyboard.press("Enter");
    await expect(karte(page)).toContainText(" 3/16");
    await karte(page).getByRole("button", { name: "Zurück" }).focus();
    await page.keyboard.press("Space");
    await expect(karte(page)).toContainText(" 2/16");
    // Avatar mit Alt-Text aus dem Katalog
    await expect(karte(page).getByRole("img")).toHaveAttribute(
      "alt",
      /Porträt/,
    );
    // Schließen und aus der Startansicht fortsetzen
    await karte(page)
      .getByRole("button", { name: "Tutorial schließen" })
      .click();
    await page
      .getByRole("button", { name: "TI Visualizer, zur Startansicht" })
      .click();
    await page
      .getByRole("button", {
        name: /^Tutorial fortsetzen \(Schritt 2 von 16\)/,
      })
      .click();
    await expect(karte(page)).toContainText(" 2/16");
  });

  test.afterEach(() => {
    expect(fehler, "CSP-Verletzungen und Fehler").toEqual([]);
  });
});
