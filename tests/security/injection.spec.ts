import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { datei, einspielen, knoten, PAYLOADS, wache, WEGE } from "./helpers";

/** Alle Texte der Datei, die später angezeigt werden, tragen die Nutzlast. */
const feindlich = (p: string) =>
  datei({
    name: p,
    description: p,
    nodes: [
      knoten("kt1", "kt", {
        label: p,
        config: { workplace: p, ip: p.slice(0, 45) },
        [p]: 1,
      }),
      knoten("sw1", "switch", { label: p }),
    ],
    edges: [
      {
        id: "e1",
        label: p,
        fault: false,
        ends: [
          { node: "kt1", port: "lan0" },
          { node: "sw1", port: "p1" },
        ],
      },
    ],
    zones: [
      {
        id: "z1",
        label: p,
        tone: "sage",
        area: { x: 0, y: 0, w: 100, h: 100 },
      },
    ],
  });

test.describe("injection", { tag: "@security" }, () => {
  for (const weg of WEGE) {
    test.describe(`Weg: ${weg}`, () => {
      for (const [i, p] of PAYLOADS.entries()) {
        test(`Nutzlast ${String(i + 1)} erscheint wörtlich und läuft nicht`, async ({
          page,
        }) => {
          const w = await wache(page);
          const befunde = await einspielen(page, weg, feindlich(p));
          // Gerätebezeichnung: als Text im Knoten
          await expect(
            page.locator(".tiv-node__name", { hasText: p }).first(),
          ).toHaveText(p);
          // Das unbekannte Feld steht (gekürzt) als Text in den Befunden
          expect(befunde).toContain("unbekannt");
          await w.pruefen();
        });
      }

      test("Prototype Pollution: Schlüssel nicht übernommen und genannt", async ({
        page,
      }) => {
        const w = await wache(page);
        const text = datei(
          {
            nodes: [
              knoten("a", "kt", {
                constructor: { prototype: { polluted: 1 } },
                prototype: 1,
                position: { x: 0, y: 0, ["__proto__"]: { polluted: 1 } },
              }),
            ],
          },
          { constructor: { prototype: { polluted: 1 } } },
        ).replace('{"format"', '{"__proto__":{"polluted":1},"format"');
        const befunde = await einspielen(page, weg, text);
        for (const k of ["__proto__", "constructor", "prototype"])
          expect(befunde).toContain(k);
        await w.pruefen();
      });

      test("Zonenfarbe mit CSS oder HTML wird abgelehnt", async ({ page }) => {
        const w = await wache(page);
        const zone = (id: string, tone: string) => ({
          id,
          tone,
          area: { x: 0, y: 0, w: 10, h: 10 },
        });
        const befunde = await einspielen(
          page,
          weg,
          datei({
            nodes: [knoten("a", "kt")],
            zones: [
              zone("z1", "red;background:url(javascript:1)"),
              zone("z2", "<img src=x onerror=1>"),
            ],
          }),
        );
        expect(befunde).toContain("Zone 1 ist ungültig");
        expect(befunde).toContain("Zone 2 ist ungültig");
        await expect(page.locator("[style*='javascript']")).toHaveCount(0);
        await w.pruefen();
      });

      test("Unklare Dateiinhalte werden gemeldet, nicht stillschweigend übernommen", async ({
        page,
      }) => {
        const w = await wache(page);
        const ende = (n: string, port: string) => ({ node: n, port });
        const kante = (
          id: string,
          a: [string, string],
          b: [string, string],
        ) => ({
          id,
          fault: false,
          ends: [ende(...a), ende(...b)],
        });
        const befunde = await einspielen(
          page,
          weg,
          datei({
            nodes: [
              knoten("kt1", "kt"),
              knoten("kt1", "kt"), // doppelte ID
              knoten("sw1", "switch"),
              knoten("x1", "gibt-es-nicht"), // unbekannter Gerätetyp
            ],
            edges: [
              kante("e1", ["kt1", "lan0"], ["sw1", "p1"]),
              kante("e2", ["kt1", "lan0"], ["sw1", "p2"]), // lan0 doppelt belegt
              kante("e3", ["sw1", "p3"], ["fehlt", "lan0"]), // fehlender Knoten
            ],
          }),
        );
        expect(befunde).toContain("doppelt");
        expect(befunde).toContain("unbekannten Typ");
        expect(befunde).toContain("schon belegt");
        expect(befunde).toContain("fehlt in der Datei");
        await w.pruefen();
      });

      test("Unicode-Tricks in Namen werden entfernt und gemeldet", async ({
        page,
      }) => {
        const w = await wache(page);
        const befunde = await einspielen(
          page,
          weg,
          datei({
            name: "Pra‮xis",
            nodes: [knoten("a", "kt", { label: "K‮T\u0007​" })],
          }),
        );
        expect(befunde).toContain("Unsichtbare");
        const name = page.locator(".tiv-node__name").first();
        await expect(name).toHaveText("KT");
        await w.pruefen();
      });

      test("Einstellungen mit Nutzlast: Texte nur als Daten, ungültige Werte abgelehnt", async ({
        page,
        browser,
        baseURL,
      }) => {
        const w = await wache(page);
        const p = PAYLOADS[1];
        const gueltig = {
          theme: "dunkel",
          mode: "erweitert",
          simSpeed: 1,
          reducedMotion: false,
          tutorialStep: 0,
          solvedChallenges: [p],
          pinnedPanels: [p],
          saveSettings: true,
        };
        await einspielen(
          page,
          weg,
          datei({ nodes: [knoten("a", "kt")] }, { settings: gueltig }),
          weg === "autosave" ? undefined : true,
        );
        await w.pruefen();

        // frischer Kontext: sonst bietet der Autosave der ersten Seite die Wiederherstellung an
        const page2 = await (await browser.newContext({ baseURL })).newPage();
        const w2 = await wache(page2);
        const befunde = await einspielen(
          page2,
          weg,
          datei(
            { nodes: [knoten("a", "kt")] },
            { settings: { ...gueltig, theme: p, [p]: 1 } },
          ),
        );
        expect(befunde).toContain("Einstellungen");
        await w2.pruefen();
      });
    });
  }

  test("Zu große Datei, zu viele Knoten und tiefes JSON: Meldung, App bleibt bedienbar", async ({
    page,
  }) => {
    const w = await wache(page);
    const fall = async (text: string, meldung: RegExp) => {
      await page.goto("./");
      await page.getByRole("button", { name: "Öffnen", exact: true }).click();
      await page.getByLabel("Datei auswählen").setInputFiles({
        name: "x.tiv.json",
        mimeType: "application/json",
        buffer: Buffer.from(text),
      });
      await expect(page.getByRole("alert")).toContainText(meldung);
      // bedienbar: Dialog schließen, Preset öffnen
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: /Öffnen.*Arztpraxis/ }).click();
      await expect(page.locator(".tiv-node__name").first()).toBeVisible();
    };
    await fall(
      datei({ description: "x".repeat(10 * 1024 * 1024) }),
      /größer als 1 MB/,
    );
    await fall(
      datei({ nodes: Array.from({ length: 100_000 }, () => 0) }),
      /mehr als 500 Geräte/,
    );
    await fall(
      `{"a":${"[".repeat(200_000)}${"]".repeat(200_000)}}`,
      /kein gültiges JSON|keine Datei/,
    );
    await w.pruefen();
  });

  test("Verschachtelungstiefe 1 000 bricht nichts", async ({ page }) => {
    const w = await wache(page);
    const tief = `${'{"a":'.repeat(1000)}1${"}".repeat(1000)}`;
    const text = datei({ nodes: [knoten("a", "kt")] }).replace(
      '{"format"',
      `{"tief":${tief},"format"`,
    );
    const befunde = await einspielen(page, "datei", text);
    expect(befunde).toContain("unbekannt");
    await expect(page.locator(".tiv-node__name").first()).toBeVisible();
    await w.pruefen();
  });

  test("URL-Parameter und Fragment werden ignoriert", async ({ page }) => {
    const w = await wache(page);
    const p = encodeURIComponent(PAYLOADS[1]);
    await page.goto(`./?file=${p}&name=${p}&topology=${p}#${p}`);
    await expect(
      page.getByRole("heading", { level: 1, name: "TI Visualizer" }),
    ).toBeVisible();
    await expect(page.getByText("Womit möchten Sie beginnen?")).toBeVisible();
    await w.pruefen();
  });

  test("Topologiename wird als Dateiname bereinigt", async ({ page }) => {
    const w = await wache(page);
    await page.addInitScript(() => {
      Reflect.deleteProperty(window, "showSaveFilePicker");
    });
    await einspielen(
      page,
      "datei",
      datei({
        name: `../${PAYLOADS[0]}`,
        nodes: [knoten("a", "kt")],
      }),
    );
    const download = page.waitForEvent("download");
    await page.keyboard.press("ControlOrMeta+s");
    const name = (await download).suggestedFilename();
    expect(name).toMatch(/^[a-z0-9äöüß-]+\.tiv\.json$/);
    await w.pruefen();
  });

  test("CSP: fremdes Inline-Skript wird blockiert und gemeldet, App bleibt ohne Verletzung", async ({
    page,
  }) => {
    await wache(page);
    await page.goto("./");
    await expect(
      page.locator('meta[http-equiv="Content-Security-Policy"]'),
    ).toHaveCount(1);
    // Kontrolle, dass der Wächter anschlägt: ein eingeschleustes Skript wird blockiert
    await page.evaluate(() => {
      const s = document.createElement("script");
      s.textContent = "window.__pwned.push('inline')";
      document.body.append(s);
      s.remove();
    });
    const stand = await page.evaluate(() => {
      const x = window as unknown as Record<string, string[]>;
      return { pwned: x["__pwned"], csp: x["__csp"] };
    });
    expect(stand.pwned).toEqual([]);
    expect(stand.csp?.length ?? 0).toBeGreaterThan(0);
    // und der echte Ablauf bleibt frei von Verletzungen (Wächter in den Tests oben)
    expect(await readFile("index.html", "utf8")).not.toContain("unsafe-inline");
  });
});
