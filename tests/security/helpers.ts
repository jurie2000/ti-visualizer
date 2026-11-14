import { readFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { expect, type Page } from "@playwright/test";
import { catalogSchema } from "../../src/schema/catalog";

/** Aktive Katalogversion; Dateien mit anderer Version lösen zusätzliche Regelprüfungen aus. */
export const CATALOG_VERSION = (
  JSON.parse(readFileSync("catalog/active.json", "utf8")) as {
    version: string;
  }
).version;

/** Aktiver Katalog aus den Dateien (loadCatalog nutzt Vite-glob, das gibt es in Node nicht). */
export async function katalog() {
  const lies = async (pfad: string): Promise<unknown> =>
    JSON.parse(await readFile(pfad, "utf8"));
  const raw: Record<string, unknown> = {
    active: await lies("catalog/active.json"),
  };
  const dir = `catalog/${CATALOG_VERSION}`;
  for (const f of await readdir(dir)) {
    const name = f
      .replace(/\.json$/, "")
      .replace(/-(\w)/g, (_, c: string) => c.toUpperCase());
    raw[name] = await lies(`${dir}/${f}`);
  }
  return catalogSchema.parse(raw);
}

/** Korpus nach OWASP XSS Filter Evasion; jede Nutzlast meldet sich in `window.__pwned`. */
const ALARM = "window.__pwned.push(1)";
export const PAYLOADS = [
  `<script>${ALARM}</script>`,
  `<img src=x onerror=${ALARM}>`,
  `<svg onload=${ALARM}>`,
  `javascript:${ALARM}`,
  `"><img src=x onerror=${ALARM}>`,
  `<iframe srcdoc="<script>parent.${ALARM}</script>">`,
  `<a href="javascript:${ALARM}">x</a>`,
  `<style>@import 'https://example.invalid/x.css'</style>`,
  `{{constructor.constructor('${ALARM}')()}}`,
  `<details open ontoggle=${ALARM}>`,
] as const;

/** Eine `.tiv.json` als Text; Topologie-Felder und Wurzel frei überschreibbar. */
export function datei(
  topology: Record<string, unknown> = {},
  wurzel: Record<string, unknown> = {},
): string {
  return JSON.stringify({
    format: "ti-visualizer",
    schemaVersion: 1,
    exportedAt: "2026-11-05T10:00:00.000Z",
    catalogVersion: CATALOG_VERSION,
    topology: {
      name: "Test",
      description: "",
      simDate: "2026-11-01",
      nodes: [],
      edges: [],
      zones: [],
      ...topology,
    },
    ...wurzel,
  });
}

export const knoten = (
  id: string,
  type: string,
  extra: Record<string, unknown> = {},
) => ({
  id,
  type,
  fault: false,
  position: { x: 0, y: 0 },
  ...extra,
});

/**
 * Überwacht eine Seite: `window.__pwned` (Nutzlasten melden sich dort), Dialoge,
 * Konsolenfehler, CSP-Verletzungen, `Object.prototype`. Vor `goto` aufrufen.
 */
export async function wache(page: Page) {
  const dialoge: string[] = [];
  const fehler: string[] = [];
  page.on("dialog", (d) => {
    dialoge.push(d.message());
    void d.dismiss();
  });
  page.on("console", (m) => {
    if (m.type() === "error") fehler.push(m.text());
  });
  page.on("pageerror", (e) => {
    fehler.push(e.message);
  });
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>;
    w["__pwned"] = [];
    w["__csp"] = [];
    w["__proto"] = Object.getOwnPropertyNames(Object.prototype).sort().join();
    document.addEventListener("securitypolicyviolation", (e) => {
      (w["__csp"] as string[]).push(`${e.violatedDirective} ${e.blockedURI}`);
    });
  });
  return {
    /** Nichts lief, nichts wurde verletzt, `Object.prototype` ist unverändert. */
    async pruefen() {
      const stand = await page.evaluate(() => {
        const w = window as unknown as Record<string, unknown>;
        return {
          pwned: w["__pwned"],
          csp: w["__csp"],
          proto: Object.getOwnPropertyNames(Object.prototype).sort().join(),
          vorher: w["__proto"],
          sauber: !Object.hasOwn(Object.prototype, "polluted"),
        };
      });
      expect(stand.pwned).toEqual([]);
      expect(stand.csp).toEqual([]);
      expect(stand.proto).toBe(stand.vorher);
      expect(stand.sauber).toBe(true);
      expect(dialoge).toEqual([]);
      expect(fehler).toEqual([]);
      // Keine Nutzlast wurde zu Markup
      await expect(
        page.locator(
          "body script:not([src]), [onerror], [onload], [ontoggle], img[src='x'], iframe, a[href^='javascript:']",
        ),
      ).toHaveCount(0);
    },
  };
}

/** Legt den Text als Autosave ab (idb-keyval: Datenbank `keyval-store`, Schlüssel `autosave`). */
async function autosaveSetzen(page: Page, text: string) {
  await page.evaluate(
    (t) =>
      new Promise<void>((ok, nein) => {
        const r = indexedDB.open("keyval-store");
        r.onupgradeneeded = () => {
          r.result.createObjectStore("keyval");
        };
        r.onerror = () => {
          nein(r.error ?? new Error("IndexedDB"));
        };
        r.onsuccess = () => {
          const tx = r.result.transaction("keyval", "readwrite");
          tx.objectStore("keyval").put(t, "autosave");
          tx.oncomplete = () => {
            r.result.close();
            ok();
          };
        };
      }),
    text,
  );
}

export type Weg = "datei" | "drop" | "autosave";
export const WEGE: Weg[] = ["datei", "drop", "autosave"];

/**
 * Schickt den Text über den Eingabeweg in die App und liefert den Text der
 * Importbefunde (Autosave: der Rückfrage), "" wenn es keine gibt. `einstellungen`:
 * Antwort auf \u201EEinstellungen übernehmen?\u201C (nur Datei und Drop), sonst keine Rückfrage.
 */
export async function einspielen(
  page: Page,
  weg: Weg,
  text: string,
  einstellungen?: boolean,
): Promise<string> {
  await page.goto("./");
  if (weg === "datei") {
    await page
      .getByRole("button", { name: /Topologie aus Datei öffnen/ })
      .click();
    await page.getByLabel("Datei auswählen").setInputFiles({
      name: "x.tiv.json",
      mimeType: "application/json",
      buffer: Buffer.from(text),
    });
  } else if (weg === "drop") {
    await page.getByRole("button", { name: /Leer starten/ }).click();
    const dt = await page.evaluateHandle((t) => {
      const d = new DataTransfer();
      d.items.add(new File([t], "x.tiv.json", { type: "application/json" }));
      return d;
    }, text);
    await page.dispatchEvent(".react-flow", "drop", { dataTransfer: dt });
  } else {
    await autosaveSetzen(page, text);
    await page.reload();
    const dialog = page.getByRole("dialog", { name: /wiederherstellen/ });
    const befunde = (await dialog.textContent()) ?? "";
    await page.getByRole("button", { name: "Wiederherstellen" }).click();
    return befunde;
  }
  if (einstellungen !== undefined) {
    await page
      .getByRole("button", {
        name: einstellungen ? "Ja, übernehmen" : "Nein, nur die Topologie",
      })
      .click();
  }
  const dialog = page.getByRole("dialog", { name: "Importbefunde" });
  try {
    await dialog.waitFor({ timeout: 3000 });
  } catch {
    return "";
  }
  const befunde = (await dialog.textContent()) ?? "";
  await page.getByRole("button", { name: "Verstanden" }).click();
  return befunde;
}
