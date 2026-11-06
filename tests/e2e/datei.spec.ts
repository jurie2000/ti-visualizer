import { readdir, readFile } from "node:fs/promises";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { parse } from "../../src/persistence";
import { catalogSchema } from "../../src/schema/catalog";

/** Aktiver Katalog aus den Dateien (loadCatalog nutzt Vite-glob, das gibt es in Node nicht). */
async function katalog() {
  const lies = async (pfad: string): Promise<unknown> =>
    JSON.parse(await readFile(pfad, "utf8"));
  const active = (await lies("catalog/active.json")) as { version: string };
  const raw: Record<string, unknown> = { active };
  const dir = `catalog/${active.version}`;
  for (const f of await readdir(dir)) {
    const name = f
      .replace(/\.json$/, "")
      .replace(/-(\w)/g, (_, c: string) => c.toUpperCase());
    raw[name] = await lies(`${dir}/${f}`);
  }
  return catalogSchema.parse(raw);
}

/**
 * Neuer, leerer Kontext (eigener Speicher, eigene IndexedDB) wie ein zweiter
 * Rechner. Der Dateiweg ist in allen Browsern gleich: Download und
 * `<input type=file>` (die File System Access API gibt es nur in Chromium).
 */
async function neuerKontext(browser: Browser, baseURL: string | undefined) {
  const context = await browser.newContext(baseURL ? { baseURL } : {});
  await context.addInitScript(() => {
    Reflect.deleteProperty(window, "showSaveFilePicker");
    Reflect.deleteProperty(window, "showOpenFilePicker");
  });
  return context;
}

/** Sammelt CSP-Verletzungen der Seite; die Funktion prüft am Testende. */
async function csp(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __csp?: string[] };
    w.__csp ??= [];
    document.addEventListener("securitypolicyviolation", (e) => {
      w.__csp?.push(`${e.violatedDirective} ${e.blockedURI}`);
    });
  });
  return async () => {
    const liste = await page.evaluate(
      () => (window as unknown as { __csp: string[] }).__csp,
    );
    expect(liste, "CSP-Verletzungen").toEqual([]);
  };
}

const NICHT_GESPEICHERT = "Nicht als Datei gespeichert";
const praxis = (page: Page) =>
  page.getByRole("button", { name: /Öffnen.*Arztpraxis/ });

/** Preset laden, Switch ergänzen, speichern (Strg+S): liefert Dateiname und -text. */
async function speichern(page: Page, mitEinstellungen: boolean) {
  await page.goto("./");
  await praxis(page).click();
  await page.getByRole("button", { name: "Erweitert" }).click();
  await page.getByRole("button", { name: /Switch hinzufügen$/ }).click();
  await expect(page.getByText(NICHT_GESPEICHERT)).toBeVisible();
  if (mitEinstellungen)
    await page.getByLabel("Einstellungen mitspeichern").check();
  const download = page.waitForEvent("download");
  await page.keyboard.press("ControlOrMeta+s");
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/\.tiv\.json$/);
  await expect(page.getByText(NICHT_GESPEICHERT)).toHaveCount(0);
  return {
    name: file.suggestedFilename(),
    text: await readFile(await file.path(), "utf8"),
  };
}

/** Öffnen-Dialog der Kopfleiste, Datei in den Input legen. */
async function oeffnen(page: Page, name: string, text: string) {
  await page.getByRole("button", { name: "Öffnen", exact: true }).click();
  await page.locator("input[type=file]").setInputFiles({
    name,
    mimeType: "application/json",
    buffer: Buffer.from(text),
  });
}

test.describe("datei", { tag: "@datei" }, () => {
  test("Speichern in A, Öffnen in B: Einstellungen nur nach Zustimmung", async ({
    browser,
    baseURL,
  }) => {
    const a = await neuerKontext(browser, baseURL);
    const pageA = await a.newPage();
    const pruefeA = await csp(pageA);
    const datei = await speichern(pageA, true);
    await pruefeA();
    await a.close();

    // Datei ist gültig, trägt Einstellungen und Topologie
    const r = parse(datei.text, await katalog());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.topology.nodes.length).toBeGreaterThan(0);
      expect(r.settings).toBeDefined();
    }

    const b = await neuerKontext(browser, baseURL);
    const page = await b.newPage();
    const pruefe = await csp(page);
    await page.goto("./");
    await praxis(page).click(); // Arbeitsfläche, damit die Kopfleiste da ist
    await oeffnen(page, datei.name, datei.text);

    // Nein: Topologie kommt, Modus bleibt „Einfach“
    await expect(
      page.getByRole("heading", { name: "Einstellungen übernehmen?" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Nein, nur die Topologie" }).click();
    await expect(page.getByText(`Gespeichert: ${datei.name}`)).toBeVisible();
    await expect(page.getByRole("button", { name: "Einfach" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // Ja: Modus „Erweitert“ aus der Datei
    await oeffnen(page, datei.name, datei.text);
    await page.getByRole("button", { name: "Ja, übernehmen" }).click();
    await expect(
      page.getByRole("button", { name: "Erweitert" }),
    ).toHaveAttribute("aria-pressed", "true");
    await pruefe();
    await b.close();
  });

  test("Datei ohne Einstellungen öffnet ohne Rückfrage", async ({
    browser,
    baseURL,
  }) => {
    const a = await neuerKontext(browser, baseURL);
    const datei = await speichern(await a.newPage(), false);
    await a.close();
    const r = parse(datei.text, await katalog());
    expect(r.ok && r.settings).toBeFalsy();

    const b = await neuerKontext(browser, baseURL);
    const page = await b.newPage();
    const pruefe = await csp(page);
    await page.goto("./");
    await praxis(page).click();
    await oeffnen(page, datei.name, datei.text);
    await expect(page.getByText(`Gespeichert: ${datei.name}`)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Einstellungen übernehmen?" }),
    ).toHaveCount(0);
    await pruefe();
    await b.close();
  });

  test("Autosave: Stand kommt nach dem Neuladen zurück", async ({
    browser,
    baseURL,
  }) => {
    const context = await neuerKontext(browser, baseURL);
    const page = await context.newPage();
    const pruefe = await csp(page);
    await page.goto("./");
    // Erster Start: Hinweis auf die Grenzen, bis er bestätigt wird
    await expect(
      page.getByRole("complementary", { name: "Hinweis zum Autosave" }),
    ).toBeVisible();
    await praxis(page).click();
    await page.getByRole("button", { name: "Erweitert" }).click();
    const switches = page.getByRole("group", { name: /^Switch/ });
    const vorher = await switches.count();
    await page.getByRole("button", { name: /Switch hinzufügen$/ }).click();
    await expect(switches).toHaveCount(vorher + 1);
    // Autosave sichert entprellt (500 ms)
    await page.waitForTimeout(1500);

    await page.goto("./");
    await expect(
      page.getByRole("heading", { name: "Letzten Stand wiederherstellen?" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Wiederherstellen" }).click();
    await expect(
      page.getByRole("group", { name: /^PVS: Praxisverwaltungssystem/ }),
    ).toBeVisible();
    // Auch der ergänzte Switch ist wieder da
    await expect(switches).toHaveCount(vorher + 1);
    await pruefe();
    await context.close();
  });
});
