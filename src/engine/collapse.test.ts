import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { loadCatalog, type Topology } from "../schema";
import { collapseHidden } from "./collapse";

const catalog = loadCatalog();
const types = catalog.deviceTypes.filter((d) => d.placeable).map((d) => d.id);
const hiddenTypes = new Set(
  catalog.deviceTypes.filter((d) => !d.visibleSimple).map((d) => d.id),
);

const topo = (
  nodes: [string, string][],
  links: [string, string][],
): Topology => ({
  name: "t",
  description: "",
  simDate: "2026-11-01",
  nodes: nodes.map(([id, type]) => ({
    id,
    type,
    fault: false,
    position: { x: 0, y: 0 },
  })),
  edges: links.map(([a, b], i) => ({
    id: `e${String(i)}`,
    fault: false,
    ends: [
      { node: a, port: "p" },
      { node: b, port: "p" },
    ],
  })),
  zones: [],
});

const randomTopology = fc
  .array(fc.constantFrom(...types), { minLength: 2, maxLength: 7 })
  .chain((ts) =>
    fc
      .array(fc.tuple(fc.nat(ts.length - 1), fc.nat(ts.length - 1)), {
        maxLength: 10,
      })
      .map((links) =>
        topo(
          ts.map((t, i): [string, string] => [`n${String(i)}`, t]),
          links
            .filter(([a, b]) => a !== b)
            .map((l): [string, string] => [
              `n${String(l[0])}`,
              `n${String(l[1])}`,
            ]),
        ),
      ),
  );

describe("collapseHidden (Regelwerk 11)", () => {
  it("fasst PVS - Switch - Konnektor zur Sammelkante zusammen", () => {
    const t = topo(
      [
        ["pvs", "pvs"],
        ["sw", "switch"],
        ["kon", "konnektor"],
      ],
      [
        ["pvs", "sw"],
        ["sw", "kon"],
      ],
    );
    const c = collapseHidden(t, catalog);
    expect(c.nodes.map((n) => n.id)).toEqual(["pvs", "kon"]);
    expect(c.edges).toEqual([]);
    expect(c.groups).toEqual([
      { id: "sammel:kon:pvs", ends: ["kon", "pvs"], hidden: ["sw"] },
    ]);
  });

  it("behält Verbindungen zwischen sichtbaren Geräten", () => {
    const t = topo(
      [
        ["pvs", "pvs"],
        ["kon", "konnektor"],
      ],
      [["pvs", "kon"]],
    );
    const c = collapseHidden(t, catalog);
    expect(c.edges).toHaveLength(1);
    expect(c.groups).toEqual([]);
  });

  it("verkettete ausgeblendete Geräte ergeben eine Sammelkante über beide", () => {
    const t = topo(
      [
        ["pvs", "pvs"],
        ["sw", "switch"],
        ["r", "router"],
        ["kon", "konnektor"],
      ],
      [
        ["pvs", "sw"],
        ["sw", "r"],
        ["r", "kon"],
      ],
    );
    expect(collapseHidden(t, catalog).groups).toEqual([
      { id: "sammel:kon:pvs", ends: ["kon", "pvs"], hidden: ["r", "sw"] },
    ]);
  });

  it("ein ausgeblendetes Gerät an nur einem sichtbaren Gerät ergibt keine Sammelkante", () => {
    const t = topo(
      [
        ["pvs", "pvs"],
        ["sw", "switch"],
      ],
      [["pvs", "sw"]],
    );
    expect(collapseHidden(t, catalog).groups).toEqual([]);
  });

  it("Konsistenz: sichtbare Verbindung nur zwischen sichtbaren Geräten", () => {
    fc.assert(
      fc.property(randomTopology, (t) => {
        const c = collapseHidden(t, catalog);
        const visible = new Set(c.nodes.map((n) => n.id));
        for (const n of c.nodes) expect(hiddenTypes.has(n.type)).toBe(false);
        for (const e of c.edges)
          for (const end of e.ends) expect(visible.has(end.node)).toBe(true);
        for (const g of c.groups) {
          for (const end of g.ends) expect(visible.has(end)).toBe(true);
          for (const h of g.hidden) expect(visible.has(h)).toBe(false);
        }
      }),
      { numRuns: 500 },
    );
  });

  it("verändert die Topologie nicht und verliert kein Gerät", () => {
    fc.assert(
      fc.property(randomTopology, (t) => {
        const before = structuredClone(t);
        const c = collapseHidden(t, catalog);
        expect(t).toEqual(before);
        const hidden = t.nodes.filter((n) => hiddenTypes.has(n.type)).length;
        expect(c.nodes.length + hidden).toBe(t.nodes.length);
      }),
      { numRuns: 500 },
    );
  });
});
