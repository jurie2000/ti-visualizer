import { describe, expect, it } from "vitest";
import { loadCatalog, type Selector, type Topology } from "../schema";
import { plugCard } from "./cards";
import { runChecks } from "./checks";
import { autoPorts, validateConnection } from "./rules";

const catalog = loadCatalog();

const expand = (s: Selector): string[] =>
  "types" in s
    ? s.types
    : catalog.deviceTypes
        .filter((t) => t.capabilities.includes(s.capability))
        .map((t) => t.id);

describe("Presets (Regelwerk 13)", () => {
  it("[A-5] jede Kante jedes Presets besteht validateConnection ohne Doppelbelegung", () => {
    expect(catalog.presets.map((p) => p.id)).toEqual([
      "praxis",
      "apotheke",
      "krankenhaus",
      "klinikum",
    ]);
    for (const { id, topology } of catalog.presets) {
      expect(topology.simDate, id).toBe("2026-11-01");
      // Kanten der Reihe nach einsetzen: so zählt jeder Anschluss nur einmal
      let built: Topology = { ...topology, edges: [] };
      for (const e of topology.edges) {
        const [x, y] = e.ends;
        const res = validateConnection(
          built,
          x.node,
          x.port,
          y.node,
          y.port,
          catalog,
        );
        expect(res, `${id}: ${e.id}`).toMatchObject({ ok: true });
        built = { ...built, edges: [...built.edges, e] };
      }
    }
  });

  it("[#211] Klinikum nutzt ein TI-Gateway statt Highspeed-Konnektor", () => {
    const klinikum = catalog.presets.find((p) => p.id === "klinikum");
    const types = klinikum?.topology.nodes.map((n) => n.type) ?? [];
    expect(types).toContain("gateway");
    expect(types).not.toContain("kon");
    const ports = (klinikum?.topology.edges ?? [])
      .flatMap((e) => e.ends)
      .filter((x) => x.node === "gw1")
      .map((x) => x.port)
      .sort();
    expect(ports).toEqual(["lan", "vpn", "wan"]);
  });

  it("[#238] kein Preset verbindet den IDP mit VPN-Zugangsdienst oder Zentralem Netz", () => {
    for (const { id, topology } of catalog.presets) {
      const type = (n: string) => topology.nodes.find((x) => x.id === n)?.type;
      for (const e of topology.edges) {
        const types = e.ends.map((x) => type(x.node));
        const hit =
          types.includes("idp") &&
          types.some((t) => t === "vpn" || t === "zentral");
        expect(hit, `${id}: ${e.id}`).toBe(false);
      }
    }
  });

  it("[P-34] kein Preset löst P-34 aus", () => {
    for (const { id, topology } of catalog.presets) {
      const found = runChecks(topology, "advanced", catalog).map((f) => f.id);
      expect(found, id).not.toContain("P-34");
    }
  });

  it("[P-29] [#213] jeder Arbeitsplatz eines Presets ist eindeutig und kein Preset löst P-29 aus", () => {
    for (const { id, topology } of catalog.presets) {
      const ids = topology.nodes
        .filter((n) => ["pc", "tab"].includes(n.type))
        .map((n) => n.config?.workplace);
      expect(ids.every(Boolean), id).toBe(true);
      expect(new Set(ids).size, id).toBe(ids.length);
      const found = runChecks(topology, "advanced", catalog).map((f) => f.id);
      expect(found, id).not.toContain("P-29");
    }
  });

  it("[A-5] jede erlaubte Verbindung aus 4.2 ist über Anschlüsse herstellbar", () => {
    for (const rule of catalog.connectionRules)
      for (const ta of expand(rule.a))
        for (const tb of expand(rule.b)) {
          const t: Topology = {
            name: "t",
            description: "",
            simDate: "2026-11-01",
            nodes: [
              ["x", ta],
              ["y", tb],
            ].map(([id, type]) => ({
              id: id as string,
              type: type as string,
              fault: false,
              position: { x: 0, y: 0 },
            })),
            edges: [],
            zones: [],
          };
          const label = `${rule.id}: ${ta} - ${tb}`;
          const ports = autoPorts(t, "x", "y", catalog);
          expect(ports, label).toBeDefined();
          expect(
            validateConnection(t, "x", ports?.a, "y", ports?.b, catalog).ok,
            label,
          ).toBe(true);
        }
  });

  it("[A-5] Karten der Presets bestehen plugCard", () => {
    for (const { id, topology } of catalog.presets) {
      let built: Topology = {
        ...topology,
        nodes: topology.nodes.map((n) => ({ ...n, cards: [] })),
      };
      for (const n of topology.nodes)
        for (const card of n.cards ?? []) {
          const res = plugCard(built, n.id, card, catalog);
          expect(res.ok, `${id}: ${n.id} ${card.kind}`).toBe(true);
          if (res.ok) built = res.topology;
        }
    }
  });
});
