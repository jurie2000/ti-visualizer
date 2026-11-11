import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { catalogSchema, checkReferences } from "./catalog";
import { loadCatalog } from "./loadCatalog";

const catalog = loadCatalog();
const { personas, steps } = catalog.tutorial;
// Ändert den ersten Schritt in einer Kopie des Katalogs.
const withFirst = (patch: object) => ({
  ...catalog,
  tutorial: {
    ...catalog.tutorial,
    steps: steps.map((s, i) => (i === 0 ? { ...s, ...patch } : s)),
  },
});

describe("Tutorial-Inhalte (FR-20, T-601)", () => {
  it("besteht Schema und Referenzprüfung", () => {
    expect(checkReferences(catalog)).toEqual([]);
  });

  it("hat zwei Teile: Praxis bis zum E-Rezept, dann Apotheke bis zur Einlösung", () => {
    const parts = steps.map((s) => s.part);
    expect(parts).toEqual([...parts].sort().reverse());
    expect(new Set(parts)).toEqual(new Set(["praxis", "apotheke"]));
    const last = (part: string) =>
      steps.filter((s) => s.part === part).at(-1)?.action;
    expect(last("praxis")).toBe("erezept-ausstellen");
    expect(last("apotheke")).toBe("erezept-einloesen-egk");
  });

  it("jeder Schritt zeigt auf ein vorhandenes Gerät oder eine vorhandene Aktion", () => {
    const types = new Set(catalog.deviceTypes.map((t) => t.id));
    const actions = new Set(catalog.actions.map((a) => a.id));
    for (const s of steps) {
      expect(s.devices.length > 0 || s.action, s.id).toBeTruthy();
      for (const d of s.devices)
        expect(types.has(d), `${s.id}: ${d}`).toBe(true);
      if (s.action) expect(actions.has(s.action), s.id).toBe(true);
    }
  });

  it("jede Persona hat ein Bild in src/assets/ und einen Alt-Text", () => {
    for (const p of personas) {
      expect(existsSync(`src/assets/${p.image}`), p.id).toBe(true);
      expect(p.alt.length, p.id).toBeGreaterThan(10);
    }
    for (const s of steps)
      expect(
        personas.some((p) => p.id === s.persona),
        s.id,
      ).toBe(true);
  });

  it("lehnt Schritte ohne Gerät und Aktion ab", () => {
    const c = withFirst({ devices: [], action: undefined });
    expect(catalogSchema.safeParse(c).success).toBe(false);
  });

  it("setzt vor dem Einlösen den VSDM-Dienst, den der Prüfungsnachweis braucht", () => {
    const i = steps.findIndex((s) => s.action === "erezept-einloesen-egk");
    expect(steps.slice(0, i).flatMap((s) => s.devices)).toContain("vsdm");
  });

  it("meldet unbekannte Persona, Gerät und Aktion", () => {
    const c = withFirst({ persona: "x", devices: ["y"], action: "z" });
    expect(checkReferences(catalogSchema.parse(c))).toEqual([
      "Tutorial-Schritt willkommen: Persona „x“ fehlt",
      "Tutorial-Schritt willkommen: Gerätetyp „y“ fehlt",
      "Tutorial-Schritt willkommen: Aktion „z“ fehlt",
    ]);
  });
});
