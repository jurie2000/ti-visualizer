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

  it("Arztpraxis: zwei Endgeräte am selben Switch bekommen keine Sammelkante, nur die Wege zum Konnektor (Issue 124)", () => {
    const t = topo(
      [
        ["pvs1", "pvs"],
        ["kt1", "kt"],
        ["kt2", "kt"],
        ["sw", "switch"],
        ["kon", "kon"],
      ],
      [
        ["pvs1", "sw"],
        ["kt1", "sw"],
        ["kt2", "sw"],
        ["sw", "kon"],
      ],
    );
    expect(collapseHidden(t, catalog).groups.map((g) => g.id)).toEqual([
      "sammel:kon:kt1",
      "sammel:kon:kt2",
      "sammel:kon:pvs1",
    ]);
  });

  it("alle Presets: jedes sichtbare Endgerät hat in Einfach weiter eine Verbindung zu einem Gerät des Netzes (Issue 124)", () => {
    const category = new Map(
      catalog.deviceTypes.map((d) => [d.id, d.category]),
    );
    for (const { id, topology } of catalog.presets) {
      const c = collapseHidden(topology, catalog);
      const cat = (n: string) =>
        category.get(topology.nodes.find((x) => x.id === n)?.type ?? "");
      const links: [string, string][] = [
        ...c.edges.map((e): [string, string] => [
          e.ends[0].node,
          e.ends[1].node,
        ]),
        ...c.groups.map((g) => g.ends),
      ];
      for (const n of c.nodes) {
        if (cat(n.id) !== "primary" && cat(n.id) !== "terminal") continue;
        const reached = links.some(
          ([a, b]) =>
            (a === n.id && cat(b) !== "primary" && cat(b) !== "terminal") ||
            (b === n.id && cat(a) !== "primary" && cat(a) !== "terminal"),
        );
        expect(reached, `${id}: ${n.id}`).toBe(true);
      }
    }
  });

  it("Mobiles KT und PVS behalten ihre Sammelkante, weil eine Verbindungsregel sie erlaubt (Issue 124)", () => {
    const t = topo(
      [
        ["mkt", "mkt"],
        ["pvs", "pvs"],
        ["sw", "switch"],
      ],
      [
        ["mkt", "sw"],
        ["pvs", "sw"],
      ],
    );
    expect(collapseHidden(t, catalog).groups.map((g) => g.id)).toEqual([
      "sammel:mkt:pvs",
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

  it("führt nur Geräte auf dem Weg auf, nicht Abzweige daneben", () => {
    const t = topo(
      [
        ["pvs", "pvs"],
        ["sw", "switch"],
        ["sw2", "switch"],
        ["kon", "konnektor"],
      ],
      [
        ["pvs", "sw"],
        ["sw", "kon"],
        ["sw", "sw2"],
      ],
    );
    expect(collapseHidden(t, catalog).groups).toEqual([
      { id: "sammel:kon:pvs", ends: ["kon", "pvs"], hidden: ["sw"] },
    ]);
  });

  it("ein ausgeblendetes Gerät an nur einem sichtbaren Gerät ergibt einen Hinweis am Nachbarn", () => {
    const t = topo(
      [
        ["pvs", "pvs"],
        ["sw", "switch"],
        ["r", "router"],
      ],
      [
        ["pvs", "sw"],
        ["sw", "r"],
      ],
    );
    const c = collapseHidden(t, catalog);
    expect(c.groups).toEqual([]);
    expect(c.stubs).toEqual([{ at: "pvs", hidden: ["r", "sw"] }]);
    expect(c.isolated).toEqual([]);
  });

  it("Abzweig neben dem Weg bekommt einen Hinweis", () => {
    const t = topo(
      [
        ["pvs", "pvs"],
        ["sw", "switch"],
        ["sw2", "switch"],
        ["kon", "konnektor"],
      ],
      [
        ["pvs", "sw"],
        ["sw", "kon"],
        ["sw", "sw2"],
      ],
    );
    expect(collapseHidden(t, catalog).stubs).toEqual([
      { at: "kon", hidden: ["sw2"] },
    ]);
  });

  it("ausgeblendetes Gerät ohne sichtbaren Nachbarn steht in isolated", () => {
    const t = topo(
      [
        ["pvs", "pvs"],
        ["sw", "switch"],
        ["r", "router"],
      ],
      [["sw", "r"]],
    );
    const c = collapseHidden(t, catalog);
    expect(c.stubs).toEqual([]);
    expect(c.isolated).toEqual(["r", "sw"]);
  });

  it("Konsistenz: jedes ausgeblendete Gerät ist über Sammelkante, Hinweis oder isolated auffindbar", () => {
    fc.assert(
      fc.property(randomTopology, (t) => {
        const c = collapseHidden(t, catalog);
        const found = [
          ...c.groups.flatMap((g) => g.hidden),
          ...c.stubs.flatMap((s) => s.hidden),
          ...c.isolated,
        ];
        const hidden = t.nodes
          .filter((n) => hiddenTypes.has(n.type))
          .map((n) => n.id);
        expect(new Set(found)).toEqual(new Set(hidden));
        const visible = new Set(c.nodes.map((n) => n.id));
        for (const s of c.stubs) expect(visible.has(s.at)).toBe(true);
      }),
      { numRuns: 500 },
    );
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
