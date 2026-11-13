import { describe, expect, it } from "vitest";
import { loadCatalog, type Topology } from "../schema";
import { availableActions } from "./actions";
import { bindFlow } from "./simulation";
import { collapseHidden } from "./collapse";
import { resolvePath } from "./paths";
import { validateConnection } from "./rules";

const catalog = loadCatalog();
const praxis = (() => {
  const preset = catalog.presets.find((p) => p.id === "praxis");
  if (!preset) throw new Error("Preset praxis fehlt");
  return preset.topology;
})();

/** Praxis-Preset: das PVS läuft auf dem PC, der PC hängt am Switch (T-724b). */
const mitPc = (): Topology => structuredClone(praxis);

const check = (t: Topology, a: [string, string], b: [string, string]) =>
  validateConnection(t, a[0], a[1], b[0], b[1], catalog);

describe("T-724a Software läuft auf einem Rechner", () => {
  it("T-724a: Software läuft auf einem PC, über den Anschluss „Läuft auf“", () => {
    const t = mitPc();
    t.edges = t.edges.filter((e) => e.id !== "e-pvs1-pc1");
    expect(check(t, ["pvs1", "host"], ["pc1", "soft"]).ok).toBe(true);
    expect(check(mitPc(), ["pvs1", "host"], ["pc1", "soft"]).ok).toBe(false);
  });

  it("T-724a: Ein Rechner trägt mehrere Programme, ein Programm läuft auf mehreren Rechnern", () => {
    const t = mitPc();
    t.nodes.push(
      { id: "srv", type: "server", position: { x: 0, y: 0 }, fault: false },
      { id: "kis1", type: "kis", position: { x: 0, y: 0 }, fault: false },
      { id: "ris1", type: "ris", position: { x: 0, y: 0 }, fault: false },
    );
    expect(check(t, ["kis1", "host"], ["srv", "soft"]).ok).toBe(true);
    t.edges.push({
      id: "e-kis1-srv",
      fault: false,
      ends: [
        { node: "kis1", port: "host" },
        { node: "srv", port: "soft" },
      ],
    });
    expect(check(t, ["ris1", "host"], ["srv", "soft"]).ok).toBe(true);
    expect(check(t, ["kis1", "host"], ["pc1", "soft"]).ok).toBe(true);
  });

  it("T-724a: „Läuft auf“ gibt es nicht zu Switch oder Konnektor", () => {
    const t = mitPc();
    expect(check(t, ["pvs1", "host"], ["sw1", "p5"]).ok).toBe(false);
    expect(check(t, ["pvs1", "host"], ["kon1", "lan"]).ok).toBe(false);
  });

  it("T-724a: Ein Server hängt per Ethernet am Switch", () => {
    const t = mitPc();
    t.nodes.push({
      id: "srv",
      type: "server",
      position: { x: 0, y: 0 },
      fault: false,
    });
    expect(check(t, ["srv", "eth0"], ["sw1", "p5"]).ok).toBe(true);
  });

  it("T-724a: Der Weg zum Fachdienst führt über den Rechner der Software", () => {
    const r = resolvePath(mitPc(), "pvs1", "erp1", catalog, "ti");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.nodes.slice(0, 3)).toEqual(["pvs1", "pc1", "sw1"]);
  });

  it("T-724a: Der PC erbt die Aktionen der Software, die auf ihm läuft", () => {
    const t = mitPc();
    const pc = t.nodes.find((n) => n.id === "pc1");
    if (!pc) throw new Error("PC fehlt");
    const names = availableActions(pc, t, catalog, "advanced").map(
      (a) => a.name,
    );
    expect(names).toContain("E-Rezept ausstellen");
  });

  it("T-724a: Modus Einfach blendet PC und Switch aus, die Software hängt per Sammelkante am Konnektor", () => {
    const c = collapseHidden(mitPc(), catalog);
    const g = c.groups.find(
      (x) => x.ends.includes("pvs1") && x.ends.includes("kon1"),
    );
    expect(g?.hidden).toEqual(["pc1", "sw1"]);
  });
});

describe("T-724b Software ohne Ethernet, Aktionen am Rechner", () => {
  const actionsOf = (t: Topology, id: string, mode: "simple" | "advanced") => {
    const node = t.nodes.find((n) => n.id === id);
    if (!node) throw new Error(`${id} fehlt`);
    return availableActions(node, t, catalog, mode).map((a) => a.id);
  };

  it("T-724b: Software hat weder Ethernet noch USB, nur Anwendung und „Läuft auf“", () => {
    for (const id of ["pvs", "kis", "avs", "pflege", "ris", "lis"]) {
      const kinds = catalog.deviceTypes
        .find((d) => d.id === id)
        ?.ports.map((p) => p.kind)
        .sort();
      expect(kinds, id).toEqual(["app", "host"]);
    }
  });

  it("T-724b: In allen Presets läuft jede Software auf einem Rechner", () => {
    const software = new Set(["pvs", "kis", "avs", "pflege", "ris", "lis"]);
    for (const p of catalog.presets)
      for (const n of p.topology.nodes.filter((x) => software.has(x.type)))
        expect(
          p.topology.edges.some(
            (e) =>
              e.ends.some((x) => x.node === n.id && x.port === "host") &&
              e.ends.some((x) => x.port === "soft"),
          ),
          `${p.id}: ${n.id}`,
        ).toBe(true);
  });

  it("T-724b: Im Modus Erweitert startet die Aktion am Rechner, nicht an der Software", () => {
    const t = mitPc();
    expect(actionsOf(t, "pvs1", "advanced")).toEqual([]);
    expect(actionsOf(t, "pc1", "advanced")).toContain("erezept-ausstellen");
  });

  it("T-724b: Im Modus Einfach (Rechner ausgeblendet) startet die Software selbst", () => {
    expect(actionsOf(mitPc(), "pvs1", "simple")).toContain(
      "erezept-ausstellen",
    );
  });

  it("T-724b: Ein Arbeitsplatz erbt die Aktionen der Software auf dem Server (KIS)", () => {
    const kh = catalog.presets.find((p) => p.id === "krankenhaus")?.topology;
    if (!kh) throw new Error("Preset krankenhaus fehlt");
    expect(actionsOf(kh, "pc1", "advanced")).toContain("erezept-ausstellen");
    // der Server selbst ist kein Arbeitsplatz, bietet aber die eigene Software an
    expect(actionsOf(kh, "srv1", "advanced")).toContain("erezept-ausstellen");
  });

  it("T-724b: Im Ablauf ist die Software der Absender, der Weg führt über den Rechner", () => {
    const t = mitPc();
    const pc = t.nodes.find((n) => n.id === "pc1");
    const flow = catalog.flows.find((f) => f.id === "erezept");
    if (!pc || !flow) throw new Error("Fixture fehlt");
    const [first] = bindFlow(flow, pc, t, catalog);
    expect(first?.nodes.slice(0, 3)).toEqual(["pvs1", "pc1", "sw1"]);
  });
});
