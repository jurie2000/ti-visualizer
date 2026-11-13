import { describe, expect, it } from "vitest";
import { loadCatalog, type Topology } from "../schema";
import { availableActions } from "./actions";
import { bindFlow } from "./simulation";
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

const actionsOf = (t: Topology, id: string, mode: "simple" | "advanced") => {
  const node = t.nodes.find((n) => n.id === id);
  if (!node) throw new Error(`${id} fehlt`);
  return availableActions(node, t, catalog, mode).map((a) => a.id);
};

describe("T-724a/b Software läuft auf einem Rechner", () => {
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

  it("T-725a: Die Aktion startet am Rechner, nicht an der Software, in beiden Modi", () => {
    const t = mitPc();
    for (const mode of ["simple", "advanced"] as const) {
      expect(actionsOf(t, "pvs1", mode), mode).toEqual([]);
      expect(actionsOf(t, "pc1", mode), mode).toContain("erezept-ausstellen");
    }
  });

  it("T-724b: Ein Arbeitsplatz erbt die Aktionen der Software auf dem Server (KIS)", () => {
    const kh = catalog.presets.find((p) => p.id === "krankenhaus")?.topology;
    if (!kh) throw new Error("Preset krankenhaus fehlt");
    expect(actionsOf(kh, "pc1", "advanced")).toContain("erezept-ausstellen");
    // der Server selbst ist kein Arbeitsplatz, bietet aber die eigene Software an
    expect(actionsOf(kh, "srv1", "advanced")).toContain("erezept-ausstellen");
  });

  it("T-724b: Server bieten die Aktionen von RIS und LIS an, ein PC erbt nur die von KIS", () => {
    const kl = catalog.presets.find((p) => p.id === "klinikum")?.topology;
    if (!kl) throw new Error("Preset klinikum fehlt");
    expect(actionsOf(kl, "rad_srv", "advanced")).toContain(
      "befund-epa-hochladen",
    );
    expect(actionsOf(kl, "lab_srv", "advanced")).toContain("earztbrief-kim");
    expect(actionsOf(kl, "rad_pc", "advanced")).toContain("erezept-ausstellen");
  });

  it("T-724b: Im Klinikum bindet der Ablauf die Software, die ihn anbietet, nicht die erste auf dem Weg", () => {
    const kl = catalog.presets.find((p) => p.id === "klinikum")?.topology;
    const pc = kl?.nodes.find((n) => n.id === "rad_pc");
    const srv = kl?.nodes.find((n) => n.id === "rad_srv");
    const erezept = catalog.flows.find((f) => f.id === "erezept");
    const epa = catalog.flows.find((f) => f.id === "epa");
    if (!kl || !pc || !srv || !erezept || !epa)
      throw new Error("Fixture fehlt");
    // E-Rezept gibt es nur im KIS, auch wenn RIS vor KIS erreichbar ist
    const [first] = bindFlow(erezept, pc, kl, catalog);
    expect(first?.nodes[0]).toBe("kis1");
    // ePA-Upload am Server der Radiologie: das RIS darauf sendet
    const [upload] = bindFlow(epa, srv, kl, catalog);
    expect(upload?.nodes[0]).toBe("rad_ris");
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

describe("T-724c Software als Dienst (SaaS)", () => {
  /** Praxis, in der das PVS auf einem Cloud-Server läuft und der PC es über das Internet bekommt. */
  const saas = (): Topology => {
    const t = mitPc();
    t.nodes.push({
      id: "cloud1",
      type: "cloud",
      position: { x: 0, y: 0 },
      fault: false,
    });
    t.edges = t.edges.filter((e) => e.id !== "e-pvs1-pc1");
    t.edges.push(
      {
        id: "e-pvs1-cloud1",
        fault: false,
        ends: [
          { node: "pvs1", port: "host" },
          { node: "cloud1", port: "soft" },
        ],
      },
      {
        id: "e-pc1-cloud1",
        fault: false,
        ends: [
          { node: "pc1", port: "web" },
          { node: "cloud1", port: "web" },
        ],
      },
    );
    return t;
  };

  it("T-724c: Software läuft auf dem Cloud-Server, der PC greift über das Internet zu", () => {
    const t = mitPc();
    t.nodes.push({
      id: "cloud1",
      type: "cloud",
      position: { x: 0, y: 0 },
      fault: false,
    });
    expect(check(t, ["pvs1", "host"], ["cloud1", "soft"]).ok).toBe(true);
    expect(check(t, ["pc1", "web"], ["cloud1", "web"]).ok).toBe(true);
  });

  it("T-724c: Der Cloud-Server hängt nicht am Switch und nicht an Fachdiensten", () => {
    const t = saas();
    expect(check(t, ["cloud1", "web"], ["sw1", "p5"]).ok).toBe(false);
    expect(check(t, ["cloud1", "web"], ["erp1", "ti"]).ok).toBe(false);
  });

  it("[V-4] T-724c: Ein Cloud-Server direkt an einem Fachdienst wird mit der Begründung abgelehnt", () => {
    const r = check(saas(), ["cloud1", "web"], ["erp1", "ti"]);
    expect(r.ok).toBe(false);
    expect(r.ruleId).toBe("V-4");
  });

  it("T-724c: Der Cloud-Server startet selbst keine Aktion, der PC schon", () => {
    expect(actionsOf(saas(), "cloud1", "advanced")).toEqual([]);
    expect(actionsOf(saas(), "cloud1", "simple")).toEqual([]);
    expect(actionsOf(saas(), "pc1", "advanced")).toContain(
      "erezept-ausstellen",
    );
  });

  it("T-724c: Der PC erbt die Aktionen der Software auf dem Cloud-Server", () => {
    expect(actionsOf(saas(), "pc1", "advanced")).toContain(
      "erezept-ausstellen",
    );
    expect(actionsOf(saas(), "pvs1", "advanced")).toEqual([]);
  });

  it("T-724c: Im Ablauf läuft das Paket von der Cloud-Software über den PC und den Switch", () => {
    const t = saas();
    const pc = t.nodes.find((n) => n.id === "pc1");
    const flow = catalog.flows.find((f) => f.id === "erezept");
    if (!pc || !flow) throw new Error("Fixture fehlt");
    const [first] = bindFlow(flow, pc, t, catalog);
    expect(first?.nodes.slice(0, 4)).toEqual(["pvs1", "cloud1", "pc1", "sw1"]);
  });
});
