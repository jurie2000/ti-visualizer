import { readdir, readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
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

test.describe("speichern", { tag: "@speichern" }, () => {
  test("Download-Weg liefert eine gültige .tiv.json (mit Strg+S)", async ({
    page,
  }) => {
    // Download-Weg wie Firefox/Safari erzwingen
    await page.addInitScript(() => {
      Reflect.deleteProperty(window, "showSaveFilePicker");
    });
    await page.goto("./");
    await page.getByRole("button", { name: /Öffnen.*Arztpraxis/ }).click();
    await expect(page.getByText("Nicht als Datei gespeichert")).toHaveCount(0);
    await page.getByRole("button", { name: "Erweitert" }).click();
    await page.getByRole("button", { name: /Switch hinzufügen$/ }).click();
    await expect(page.getByText("Nicht als Datei gespeichert")).toBeVisible();

    const download = page.waitForEvent("download");
    await page.keyboard.press("ControlOrMeta+s");
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/\.tiv\.json$/);
    const text = await readFile(await file.path(), "utf8");
    const result = parse(text, await katalog());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.topology.nodes.length).toBeGreaterThan(0);
      expect(result.settings).toBeUndefined();
    }
    await expect(page.getByText("Nicht als Datei gespeichert")).toHaveCount(0);
  });
});
