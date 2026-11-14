import { describe, expect, it } from "vitest";
import { TivFile, Topology, configVariants } from ".";

const kt = {
  id: "kt1",
  type: "kt",
  label: "Empfang",
  fault: false,
  position: { x: 120, y: 80 },
  cards: [
    { kind: "smcb", expires: "2028-06-30", unlocked: true },
    { kind: "egk", expires: "2029-12-31", pinActive: true },
  ],
  config: {
    ip: "192.168.10.13",
    mask: "255.255.255.0",
    paired: true,
    workplace: "AP-1",
  },
};
const sw = {
  id: "sw1",
  type: "switch",
  fault: false,
  position: { x: 280, y: 130 },
};
const e1 = {
  id: "e1",
  fault: false,
  ends: [
    { node: "kt1", port: "lan0" },
    { node: "sw1", port: "p1" },
  ],
};
const zone = {
  id: "z1",
  label: "Praxisnetz",
  tone: "sage",
  area: { x: 0, y: 0, w: 600, h: 400 },
};

const topology = {
  name: "Arztpraxis mit CardLink",
  description: "Praxis mit Konnektor",
  simDate: "2026-11-01",
  nodes: [kt, sw],
  edges: [e1],
  zones: [zone],
};

const settings = {
  theme: "dunkel",
  mode: "erweitert",
  simSpeed: 1.5,
  reducedMotion: false,
  tutorialStep: 4,
};

const file = {
  format: "ti-visualizer",
  schemaVersion: 1,
  exportedAt: "2026-11-04T10:00:00Z",
  catalogVersion: "1",
  settings,
  topology,
};

const ok = (v: unknown) => TivFile.safeParse(v).success;
const topoOk = (patch: object) =>
  Topology.safeParse({ ...topology, ...patch }).success;
const withCard = (card: object) =>
  topoOk({ nodes: [{ ...kt, cards: [card] }, sw] });
const nodes = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ ...sw, id: `n${String(i)}` }));

describe("TivFile", () => {
  it("nimmt die Beispieldatei aus plan.md an", () => {
    const r = TivFile.safeParse(file);
    expect(r.success).toBe(true);
    expect(r.data?.settings?.pinnedPanels).toEqual([]);
  });

  it("nimmt eine Datei ohne settings an", () => {
    expect(ok({ ...file, settings: undefined })).toBe(true);
  });

  it("lehnt eine Datei ohne topology ab", () => {
    expect(ok({ ...file, topology: undefined })).toBe(false);
  });

  it("lehnt eine Datei nur mit settings ab", () => {
    expect(ok({ settings })).toBe(false);
  });

  it("lehnt falsches format und fremde schemaVersion ab", () => {
    expect(ok({ ...file, format: "x" })).toBe(false);
    expect(ok({ ...file, schemaVersion: 2 })).toBe(false);
  });

  it("lehnt ungültige Einstellungen ab", () => {
    expect(ok({ ...file, settings: { ...settings, theme: "<b>" } })).toBe(
      false,
    );
    expect(ok({ ...file, settings: { ...settings, simSpeed: 100 } })).toBe(
      false,
    );
  });

  it("übernimmt __proto__ nicht", () => {
    const raw = JSON.stringify(file).replace(
      '"format"',
      '"__proto__":{"polluted":true},"format"',
    );
    const parsed: unknown = JSON.parse(raw);
    expect(Object.keys(parsed as object)).toContain("__proto__");
    const r = TivFile.safeParse(parsed);
    expect(r.success).toBe(true);
    expect(Object.keys(r.data ?? {})).not.toContain("__proto__");
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect((r.data as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("verwirft unbekannte Felder", () => {
    const r = TivFile.safeParse({ ...file, extra: 1 });
    expect(r.success && "extra" in r.data).toBe(false);
  });
});

describe("Topology", () => {
  it("lehnt doppelte IDs ab (auch über Listen hinweg)", () => {
    expect(topoOk({ nodes: [kt, kt] })).toBe(false);
    expect(topoOk({ zones: [{ ...zone, id: "kt1" }] })).toBe(false);
    expect(topoOk({ edges: [{ ...e1, id: "sw1" }] })).toBe(false);
  });

  it("lehnt Kanten ab, deren Knoten fehlt", () => {
    const ends = [e1.ends[0], { node: "gibtsnicht", port: "p1" }];
    expect(topoOk({ edges: [{ ...e1, ends }] })).toBe(false);
  });

  it("verlangt genau zwei Kantenenden", () => {
    expect(topoOk({ edges: [{ ...e1, ends: [e1.ends[0]] }] })).toBe(false);
    expect(
      topoOk({
        edges: [{ ...e1, ends: [...e1.ends, { node: "kt1", port: "x" }] }],
      }),
    ).toBe(false);
  });

  it("T-715: Zone ohne shape bleibt gültig (ältere Dateien), rect und ellipse gelten, anderes nicht", () => {
    expect(topoOk({ zones: [zone] })).toBe(true);
    expect(topoOk({ zones: [{ ...zone, shape: "rect" }] })).toBe(true);
    expect(topoOk({ zones: [{ ...zone, shape: "ellipse" }] })).toBe(true);
    expect(topoOk({ zones: [{ ...zone, shape: "<b>kreis</b>" }] })).toBe(false);
  });

  it("T-717: description an der Zone ist optional und auf 2000 Zeichen begrenzt", () => {
    expect(topoOk({ zones: [{ ...zone, description: "Text" }] })).toBe(true);
    expect(
      topoOk({ zones: [{ ...zone, description: "x".repeat(2001) }] }),
    ).toBe(false);
  });

  it("T-715: withContents ist optional und muss ein Wahrheitswert sein", () => {
    expect(topoOk({ zones: [{ ...zone, withContents: true }] })).toBe(true);
    expect(topoOk({ zones: [{ ...zone, withContents: "ja" }] })).toBe(false);
  });

  it("lehnt unbekannten tone ab", () => {
    expect(topoOk({ zones: [{ ...zone, tone: "<script>" }] })).toBe(false);
    expect(topoOk({ zones: [{ ...zone, tone: "accent-2" }] })).toBe(false);
  });

  it("prüft Karten", () => {
    expect(withCard({ kind: "x", expires: "2028-06-30" })).toBe(false);
    expect(withCard({ kind: "egk", expires: "morgen" })).toBe(false);
    expect(
      topoOk({ nodes: [{ ...kt, cards: [...kt.cards, ...kt.cards] }, sw] }),
    ).toBe(false);
  });

  it("prüft Längen und Anzahl", () => {
    expect(topoOk({ name: "x".repeat(101) })).toBe(false);
    expect(topoOk({ description: "x".repeat(2001) })).toBe(false);
    expect(topoOk({ zones: [{ ...zone, area: { ...zone.area, w: 0 } }] })).toBe(
      false,
    );
    expect(
      topoOk({ nodes: [{ ...sw, position: { x: Infinity, y: 0 } }] }),
    ).toBe(false);
    expect(topoOk({ edges: [], nodes: nodes(500) })).toBe(true);
    expect(topoOk({ edges: [], nodes: nodes(501) })).toBe(false);
    const zones = Array.from({ length: 51 }, (_, i) => ({
      ...zone,
      id: `z${String(i)}`,
    }));
    expect(topoOk({ zones })).toBe(false);
  });
});

describe("NetConfig-Varianten", () => {
  it("prüfen ihre Zusatzfelder", () => {
    const { konnektor, terminal, client, router, infra } = configVariants;
    expect(
      konnektor.safeParse({ ip: "10.0.0.1", mode: "parallel", sis: false })
        .success,
    ).toBe(true);
    expect(konnektor.safeParse({ mode: "seriell" }).success).toBe(false);
    expect(
      terminal.safeParse({ paired: true, pairedWith: "kon1" }).success,
    ).toBe(true);
    expect(client.safeParse({ routeTI: true, workplace: "AP-1" }).success).toBe(
      true,
    );
    expect(router.safeParse({ ipsecAllowed: "ja" }).success).toBe(false);
    expect(infra.safeParse({ ip: "10.0.0.2", dhcp: false }).success).toBe(true);
  });
});
