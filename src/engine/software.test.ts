import { describe, expect, it } from "vitest";
import { loadCatalog, type Node, type Topology } from "../schema";
import { availableActions } from "./actions";
import { bindFlow } from "./simulation";
import { resolvePath, softwareOn, terminalFor } from "./paths";
import { runChecks } from "./checks";
import { autoPorts, validateConnection } from "./rules";

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

describe("#221 Cloud-Dienst im Rechenzentrum", () => {
  const link = (
    a: string,
    ap: string,
    b: string,
    bp: string,
  ): Topology["edges"][number] => ({
    id: `${a}-${b}`,
    fault: false,
    ends: [
      { node: a, port: ap },
      { node: b, port: bp },
    ],
  });
  const node = (id: string, type: string, extra: Partial<Node> = {}): Node => ({
    id,
    type,
    position: { x: 0, y: 0 },
    fault: false,
    ...extra,
  });
  const cards = [
    { kind: "egk" as const, expires: "2027-01-01", pinActive: true },
    { kind: "hba" as const, expires: "2027-01-01", unlocked: true },
    { kind: "smcb" as const, expires: "2027-01-01", unlocked: true },
  ];

  /** Praxis (PC, Switch, Router, KT) am Internet; PVS auf dem Cloud-Server mit TI-Gateway im Rechenzentrum. */
  const rz = (): Topology => ({
    name: "rz",
    description: "",
    simDate: "2026-11-01",
    zones: [],
    nodes: [
      node("pc1", "pc", { config: { workplace: "AP-1" } }),
      node("kt1", "kt", { config: { workplace: "AP-1" }, cards }),
      node("sw1", "switch"),
      node("rt1", "router"),
      node("net", "internet"),
      node("cloud1", "cloud"),
      node("pvs1", "pvs"),
      node("gw1", "gateway"),
      node("vpn1", "vpn"),
      node("zen", "zentral"),
      node("erp1", "erp"),
      node("idp1", "idp"),
      node("zeta1", "zeta"),
      node("popp1", "popp"),
    ],
    edges: [
      link("pc1", "eth0", "sw1", "p1"),
      link("kt1", "lan0", "sw1", "p2"),
      link("sw1", "p3", "rt1", "lan1"),
      link("rt1", "wan", "net", "netz"),
      link("net", "netz", "cloud1", "inet"),
      link("pvs1", "host", "cloud1", "soft"),
      link("cloud1", "lan", "gw1", "lan"),
      link("gw1", "vpn", "vpn1", "zugang"),
      link("vpn1", "internet", "net", "netz"),
      link("vpn1", "zentral", "zen", "netz"),
      link("zen", "netz", "erp1", "ti"),
      link("zen", "netz", "idp1", "ti"),
      link("net", "netz", "zeta1", "net"),
      link("net", "netz", "popp1", "net"),
    ],
  });

  it("#221: Cloud-Server hängt an Internet und TI-Gateway, nicht am Konnektor oder Switch", () => {
    const t = rz();
    t.edges = [];
    expect(check(t, ["cloud1", "inet"], ["net", "netz"]).ok).toBe(true);
    expect(check(t, ["cloud1", "lan"], ["gw1", "lan"]).ok).toBe(true);
    expect(check(t, ["gw1", "wan"], ["net", "netz"]).ok).toBe(true);
    // ohne Gateway: Konnektor weder am Internet noch am Cloud-Server
    t.nodes = t.nodes.filter((n) => n.id !== "gw1");
    t.nodes.push(node("kon1", "kon"));
    expect(check(t, ["kon1", "wan"], ["net", "netz"]).ok).toBe(false);
    expect(check(t, ["cloud1", "lan"], ["kon1", "lan"]).ok).toBe(false);
    expect(check(t, ["cloud1", "lan"], ["sw1", "p1"]).ok).toBe(false);
  });

  it("#221: Modus Einfach steckt das Gateway am VPN über `vpn`, der WAN-Anschluss bleibt für das Internet frei", () => {
    const t = rz();
    t.edges = [];
    t.edges.push(link("gw1", "lan", "cloud1", "lan"));
    expect(autoPorts(t, "gw1", "vpn1", catalog)).toEqual({
      a: "vpn",
      b: "zugang",
    });
    t.edges.push(link("gw1", "vpn", "vpn1", "zugang"));
    expect(autoPorts(t, "gw1", "net", catalog)).toEqual({
      a: "wan",
      b: "netz",
    });
  });

  it("#221: Der PC erbt die Software des Cloud-Servers über Router und Internet", () => {
    const found = softwareOn(rz(), "pc1", catalog);
    expect(found.map((f) => [f.node.id, f.own])).toEqual([["pvs1", false]]);
  });

  it("#221: TI 1.0 und TI 2.0 laufen aus der Cloud-Software über das Internet", () => {
    const t = rz();
    expect(actionsOf(t, "pc1", "advanced")).toEqual(
      expect.arrayContaining([
        "erezept-ausstellen",
        "zeta-anmelden",
        "popp-token-beantragen",
      ]),
    );
    const pc = t.nodes.find((n) => n.id === "pc1") as Node;
    for (const id of ["erezept", "popp"]) {
      const flow = catalog.flows.find((f) => f.id === id);
      if (!flow) throw new Error("Fixture fehlt");
      const nodes = bindFlow(flow, pc, t, catalog).flatMap((s) => s.nodes);
      expect(nodes).toEqual(expect.arrayContaining(["net", "cloud1"]));
    }
    const ti = resolvePath(t, "pvs1", "erp1", catalog);
    expect(ti.ok && ti.zugang).toBe("gw1");
  });

  it("#221: Fällt der Praxis-Router aus, ist das Gateway nicht erreichbar", () => {
    const t = rz();
    const rt = t.nodes.find((n) => n.id === "rt1");
    if (rt) rt.fault = true;
    const r = resolvePath(t, "pc1", "erp1", catalog);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.reason === "ausgefallen" && r.at).toBe("rt1");
  });

  it("#221: Der Weg zum Gateway im Rechenzentrum, Reihenfolge Internet, Cloud, Gateway", () => {
    const t = rz();
    const r = resolvePath(t, "pvs1", "erp1", catalog);
    expect(r.ok && r.nodes.slice(0, 3)).toEqual(["pvs1", "cloud1", "gw1"]);
    const viaPc = resolvePath(t, "pc1", "erp1", catalog);
    expect(viaPc.ok && viaPc.nodes.slice(0, 7)).toEqual([
      "pc1",
      "sw1",
      "rt1",
      "net",
      "cloud1",
      "gw1",
      "vpn1",
    ]);
  });

  it("#221: Das Kartenterminal erreicht das Gateway über den Cloud-Server, ohne Gateway-WAN", () => {
    const t = rz();
    const r = resolvePath(t, "kt1", "gw1", catalog);
    expect(r.ok && r.zugang).toBe("gw1");
    expect(r.ok && r.nodes).toEqual([
      "kt1",
      "sw1",
      "rt1",
      "net",
      "cloud1",
      "gw1",
    ]);
    const p5 = (u: Topology) =>
      runChecks(u, "advanced", catalog).filter((f) => f.id === "P-5");
    expect(p5(t)).toEqual([]);
    // Gegenweg PC → Gateway → Terminal läuft ebenfalls über den Cloud-Server.
    const back = resolvePath(t, "pc1", "kt1", catalog, "local");
    expect(back.ok && back.nodes).toEqual([
      "pc1",
      "sw1",
      "rt1",
      "net",
      "cloud1",
      "gw1",
      "cloud1",
      "net",
      "rt1",
      "sw1",
      "kt1",
    ]);
    for (const gone of ["e-cloud1-gw1", "e-net-cloud1"]) {
      const u = rz();
      const id = u.edges.find((e) =>
        gone === "e-cloud1-gw1"
          ? e.ends.some((x) => x.node === "gw1" && x.port === "lan")
          : e.ends.some((x) => x.node === "cloud1" && x.port === "inet"),
      )?.id;
      u.edges = u.edges.filter((e) => e.id !== id);
      expect(resolvePath(u, "kt1", "gw1", catalog).ok).toBe(false);
      expect(p5(u).map((f) => f.nodes)).toEqual([["kt1"]]);
      expect(terminalFor(u, "pc1", catalog)).toEqual({ status: "none" });
    }
  });

  it("#221: Gateway-WAN am Internet bleibt erlaubt, wird für das Terminal nicht gebraucht", () => {
    const t = rz();
    t.edges.push(link("gw1", "wan", "net", "netz"));
    expect(resolvePath(t, "kt1", "gw1", catalog).ok).toBe(true);
  });

  it("#221: Ein Kartenterminal im LAN mit lokalem Gateway läuft über das LAN", () => {
    const t = rz();
    t.nodes.push(node("gwL", "gateway"));
    t.edges.push(link("sw1", "p4", "gwL", "lan"));
    const kt = t.nodes.find((n) => n.id === "kt1");
    if (kt) kt.config = { ...kt.config, pairedWith: "gwL" };
    const r = resolvePath(t, "kt1", "gwL", catalog);
    expect(r.ok && r.nodes).toEqual(["kt1", "sw1", "gwL"]);
  });

  it("#221: Ohne TI-Gateway gibt es für die Cloud-Software kein TI 1.0, ohne Internet keinen Weg", () => {
    const t = rz();
    t.nodes = t.nodes.filter((n) => n.id !== "gw1");
    t.edges = t.edges.filter((e) => !e.id.includes("gw1"));
    expect(resolvePath(t, "pvs1", "erp1", catalog)).toEqual({
      ok: false,
      reason: "kein-weg",
    });
    expect(resolvePath(t, "pc1", "erp1", catalog).ok).toBe(false);
  });

  it("#221: Fällt Gateway, Cloud-Server oder Internet aus, ist die TI nicht erreichbar", () => {
    for (const id of ["gw1", "cloud1", "net"]) {
      const t = rz();
      const n = t.nodes.find((x) => x.id === id);
      if (n) n.fault = true;
      const r = resolvePath(t, "pc1", "erp1", catalog);
      expect(r.ok).toBe(false);
      expect(!r.ok && r.reason).toBe("ausgefallen");
    }
  });

  it("#221: TI 2.0 aus der Cloud braucht das Gateway nicht, aber die Internet-Anbindung", () => {
    const t = rz();
    t.nodes = t.nodes.filter((n) => n.id !== "gw1");
    t.edges = t.edges.filter((e) => !e.id.includes("gw1"));
    expect(actionsOf(t, "pc1", "advanced")).toEqual(
      expect.arrayContaining(["zeta-anmelden", "popp-token-beantragen"]),
    );
    const zeta = resolvePath(t, "pc1", "zeta1", catalog);
    expect(zeta.ok && zeta.nodes).toEqual([
      "pc1",
      "sw1",
      "rt1",
      "net",
      "zeta1",
    ]);
    expect(resolvePath(t, "pc1", "popp1", catalog).ok).toBe(true);
  });

  it("#221: Falsche Anschlusspaare der Cloud werden abgelehnt", () => {
    const t = rz();
    t.edges = [];
    expect(check(t, ["cloud1", "web"], ["gw1", "lan"]).ok).toBe(false);
    expect(check(t, ["cloud1", "inet"], ["gw1", "lan"]).ok).toBe(false);
    expect(check(t, ["cloud1", "lan"], ["net", "netz"]).ok).toBe(false);
    expect(check(t, ["gw1", "lan"], ["net", "netz"]).ok).toBe(false);
  });

  it("#221: Zwei Einrichtungen am selben Internet teilen keine Server und keine Terminals", () => {
    const t = rz();
    t.nodes.push(
      node("pcB", "pc", { config: { workplace: "AP-1" } }),
      node("swB", "switch"),
      node("rtB", "router"),
      node("ktB", "kt", { config: { workplace: "AP-1" }, cards }),
      node("srvB", "server"),
      node("kisB", "kis"),
    );
    t.edges.push(
      link("pcB", "eth0", "swB", "p1"),
      link("ktB", "lan0", "swB", "p2"),
      link("swB", "p3", "rtB", "lan1"),
      link("rtB", "wan", "net", "netz"),
      link("swB", "p4", "srvB", "eth0"),
      link("kisB", "host", "srvB", "soft"),
    );
    // Der Cloud-Server ist über das Internet für alle da, der Server der Nachbarn nicht.
    expect(softwareOn(t, "pc1", catalog).map((f) => f.node.id)).toEqual([
      "pvs1",
    ]);
    expect(softwareOn(t, "pcB", catalog).map((f) => f.node.id)).toEqual([
      "kisB",
      "pvs1",
    ]);
    expect(terminalFor(t, "pcB", catalog, "lan")).toEqual({
      status: "one",
      terminal: "ktB",
    });
    expect(terminalFor(t, "pc1", catalog, "lan")).toEqual({
      status: "one",
      terminal: "kt1",
    });
    // Hinter dem Gateway führt das Internet nicht in fremde Router.
    expect(resolvePath(t, "pc1", "ktB", catalog, "local")).toEqual({
      ok: false,
      reason: "kein-weg",
    });
    const own = resolvePath(t, "pc1", "kt1", catalog, "local");
    expect(own.ok).toBe(true);
    expect(terminalFor(t, "pc1", catalog)).toEqual({
      status: "one",
      terminal: "kt1",
    });
    // Die Cloud-Software hat keinen Arbeitsplatz im Netz und löst nichts aus: kein fremdes Terminal.
    expect(terminalFor(t, "pvs1", catalog)).toEqual({ status: "none" });
    // Der LAN-Weg kreuzt das Internet nie: die Cloud erreicht kein Netz-Kartenterminal.
    for (const id of ["pvs1", "cloud1"])
      expect(terminalFor(t, id, catalog, "lan")).toEqual({ status: "none" });
  });

  it("#221: Ein nicht netzfähiges Kartenterminal gilt nicht als Netz-Terminal", () => {
    const t = rz();
    t.nodes.push(node("mkt1", "mkt", { config: { workplace: "AP-1" } }));
    t.edges.push(link("mkt1", "usb0", "pc1", "usb0"));
    t.nodes = t.nodes.filter((n) => n.id !== "kt1");
    t.edges = t.edges.filter((e) => e.id !== "kt1-sw1");
    expect(terminalFor(t, "pc1", catalog, "lan")).toEqual({ status: "none" });
  });

  const flowSteps = (t: Topology, flowId: string, trigger: string) => {
    const flow = catalog.flows.find((f) => f.id === flowId);
    const from = t.nodes.find((n) => n.id === trigger);
    if (!flow || !from) throw new Error("Fixture fehlt");
    return bindFlow(flow, from, t, catalog);
  };

  it("#226: Cloud-PVS erreicht das Kartenterminal für ZETA und PoPP über das Internet, ohne TI-Gateway", () => {
    const t = rz();
    for (const id of ["zeta", "popp"]) {
      const steps = flowSteps(t, id, "pc1");
      expect(
        steps.filter((s) => s.problem),
        id,
      ).toEqual([]);
      for (const s of steps) expect(s.nodes.length).toBeGreaterThan(0);
    }
    const [toKt, fromKt] = flowSteps(t, "zeta", "pc1");
    const way = ["pvs1", "cloud1", "net", "rt1", "sw1", "kt1"];
    expect(toKt?.nodes).toEqual(way);
    expect(fromKt?.nodes).toEqual([...way].reverse());
  });

  it("#226: ZETA und PoPP brauchen kein TI-Gateway am Cloud-Server", () => {
    const t = rz();
    t.nodes = t.nodes.filter((n) => n.id !== "gw1");
    t.edges = t.edges.filter((e) => !e.ends.some((x) => x.node === "gw1"));
    for (const id of ["zeta", "popp"]) {
      const steps = flowSteps(t, id, "pc1");
      expect(steps.filter((s) => s.problem)).toEqual([]);
    }
    expect(flowSteps(t, "zeta", "pc1")[0]?.nodes).toEqual([
      "pvs1",
      "cloud1",
      "net",
      "rt1",
      "sw1",
      "kt1",
    ]);
  });

  it("#226: TI-1.0-Verkehr zum Terminal läuft über den Cloud-Server, auch wenn das Gateway mit dem WAN am Internet hängt", () => {
    const t = rz();
    t.edges.push(link("gw1", "wan", "net", "netz"));
    const step = flowSteps(t, "vsdm", "pc1")[1];
    expect(step?.problem).toBeUndefined();
    expect(step?.nodes).toEqual(["gw1", "cloud1", "net", "rt1", "sw1", "kt1"]);
  });

  const withPraxisB = (t: Topology): Topology => {
    t.nodes.push(
      node("pcB", "pc", { config: { workplace: "AP-B" } }),
      node("ktB", "kt", { config: { workplace: "AP-B" }, cards }),
      node("swB", "switch"),
      node("rtB", "router"),
    );
    t.edges.push(
      link("pcB", "eth0", "swB", "p1"),
      link("ktB", "lan0", "swB", "p2"),
      link("swB", "p3", "rtB", "lan1"),
      link("rtB", "wan", "net", "netz"),
    );
    return t;
  };
  const own = ["kt1", "sw1", "rt1"];
  const other = ["ktB", "swB", "rtB"];

  it("#226: Cloud-Weg und fremde Praxis: jede Praxis erreicht nur ihr eigenes Terminal", () => {
    const t = withPraxisB(rz());
    for (const id of ["zeta", "popp"]) {
      const a = flowSteps(t, id, "pc1");
      const b = flowSteps(t, id, "pcB");
      for (const s of [...a, ...b]) expect(s.nodes.length).toBeGreaterThan(0);
      for (const s of a)
        for (const n of other) expect(s.nodes, `${id} pc1`).not.toContain(n);
      for (const s of b)
        for (const n of own) expect(s.nodes, `${id} pcB`).not.toContain(n);
    }
  });

  describe("#226 alle Aktionen: Cloud und vor Ort binden gleich", () => {
    const services = ["vsdm", "kim", "kk", "vzd", "epa", "idp", "erp", "vsdm2"];
    const withServices = (t: Topology): Topology => {
      for (const s of services) {
        t.nodes.push(node(`${s}1`, s));
        t.edges.push(
          s === "vsdm2"
            ? link("zeta1", "net", "vsdm21", "net")
            : link("zen", "netz", `${s}1`, "ti"),
        );
      }
      t.nodes.push(
        node("kimcm1", "kimcm"),
        node("avs1", "avs"),
        node("cardlink1", "cardlink"),
      );
      // KIM ↔ Krankenkasse ist eine direkte Verbindung (Regelwerk 4.2)
      t.edges.push(
        link("cardlink1", "wan", "net", "netz"),
        link("kim1", "ti", "kk1", "ti"),
      );
      return t;
    };
    const cloud = (): Topology => {
      const t = withServices(rz());
      t.edges.push(
        link("avs1", "host", "cloud1", "soft"),
        link("kimcm1", "lan0", "gw1", "lan"),
        link("pvs1", "app", "kimcm1", "lan0"),
      );
      return t;
    };
    const vorOrt = (): Topology => {
      const t = withServices(rz());
      const drop = ["cloud1", "gw1"];
      t.nodes = t.nodes.filter((n) => !drop.includes(n.id));
      t.edges = t.edges.filter(
        (e) => !e.ends.some((x) => drop.includes(x.node)),
      );
      t.nodes.push(node("kon1", "kon"));
      t.edges.push(
        link("kon1", "lan", "sw1", "p4"),
        link("kon1", "wan", "rt1", "lan2"),
        link("kon1", "vpn", "vpn1", "zugang"),
        link("pvs1", "host", "pc1", "soft"),
        link("avs1", "host", "pc1", "soft"),
        link("kimcm1", "lan0", "sw1", "p5"),
      );
      return t;
    };
    const offered = (types: string[]) =>
      catalog.actions.filter(
        (a) =>
          "types" in a.offeredBy &&
          a.offeredBy.types.some((x) => types.includes(x)),
      );

    const aktionen = offered(["pvs", "avs"]);
    it("deckt Aktionen ab", () => {
      expect(aktionen.length).toBeGreaterThan(0);
    });

    it.each(aktionen.map((a) => [a.id, a.flow]))(
      "Aktion %s: Cloud bindet wie vor Ort, der Weg zum Terminal führt über Internet und Router der Praxis",
      (_id, flowId) => {
        const ort = flowSteps(vorOrt(), flowId, "pc1");
        const rzSteps = flowSteps(withPraxisB(cloud()), flowId, "pc1");
        const flow = catalog.flows.find((f) => f.id === flowId);
        expect(rzSteps).toHaveLength(flow?.steps.length ?? -1);
        expect(rzSteps.map((s) => s.label)).toEqual(ort.map((s) => s.label));
        const ends = (steps: typeof ort) =>
          steps.map((s) => [s.nodes.at(0), s.nodes.at(-1)]);
        expect(rzSteps.map((s) => s.problem)).toEqual(ort.map(() => undefined));
        expect(ort.map((s) => s.problem)).toEqual(ort.map(() => undefined));
        // Schritte ohne Weg (z. B. Rolle E) gibt es vor Ort genauso
        expect(rzSteps.map((s) => s.nodes.length > 0)).toEqual(
          ort.map((s) => s.nodes.length > 0),
        );
        // Das Gateway ersetzt den Konnektor als Zugang (K)
        expect(ends(rzSteps)).toEqual(
          ends(ort).map((e) => e.map((n) => (n === "kon1" ? "gw1" : n))),
        );
        const nodes = (steps: typeof ort) => steps.flatMap((s) => s.nodes);
        for (const n of other) expect(nodes(rzSteps)).not.toContain(n);
        // Terminalwege laufen über Internet und Router der Praxis; das Gateway nur, wenn der Ablauf einen Zugang (K) hat
        const viaGateway = flow?.steps.some(
          (x) => x.from === "K" || x.to === "K",
        );
        for (const s of rzSteps.filter((x) => x.nodes.includes("kt1")))
          expect(s.nodes).toEqual(
            expect.arrayContaining([
              "net",
              "rt1",
              "sw1",
              ...(viaGateway ? ["gw1"] : []),
            ]),
          );
      },
    );
  });
});
