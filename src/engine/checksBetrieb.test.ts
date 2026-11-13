import { describe, expect, it } from "vitest";
import { loadCatalog, type AnyCard, type Topology } from "../schema";
import { availableActions } from "./actions";
import { runChecks } from "./checks";

const catalog = loadCatalog();

type N = Topology["nodes"][number];
type Over = Record<string, NonNullable<N["config"]>>;
const card = (kind: "hba" | "smcb"): AnyCard => ({
  kind,
  expires: "2027-01-01",
  unlocked: true,
});
const node = (id: string, type: string, extra: Partial<N> = {}): N => ({
  id,
  type,
  fault: false,
  position: { x: 0, y: 0 },
  ...extra,
});
const edge = (a: string, b: string) => ({
  id: `${a}-${b}`,
  fault: false,
  ends: [
    { node: a, port: "p" },
    { node: b, port: "p" },
  ] as [{ node: string; port: string }, { node: string; port: string }],
});

const run = (t: Topology, mode: "simple" | "advanced" = "advanced") =>
  runChecks(t, mode, catalog);
const hits = (t: Topology, id: string) => run(t).filter((f) => f.id === id);

/** Praxis in Reihe: PC (mit PVS) und KT am Switch, Konnektor zwischen Switch und Router. */
const praxis = (over: Over = {}): Topology => {
  const cfg = (id: string) => ({ config: { ...over[id] } });
  return {
    name: "t",
    description: "",
    simDate: "2026-11-01",
    zones: [],
    nodes: [
      node("pc", "pc", cfg("pc")),
      node("pvs", "pvs"),
      node("kt", "kt", {
        ...cfg("kt"),
        cards: [
          card("hba"),
          card("smcb"),
          { kind: "egk", expires: "2027-01-01" },
        ],
      }),
      node("sw", "switch"),
      node("kon", "kon", cfg("kon")),
      node("rt", "router", cfg("rt")),
      node("net", "internet"),
      node("vpn", "vpn"),
      node("zn", "zentral"),
      node("erp", "erp"),
      node("idp", "idp"),
      node("vsdm", "vsdm"),
    ],
    edges: [
      edge("sw", "pc"),
      {
        id: "pvs-pc",
        fault: false,
        ends: [
          { node: "pvs", port: "host" },
          { node: "pc", port: "soft" },
        ] as [{ node: string; port: string }, { node: string; port: string }],
      },
      edge("sw", "kt"),
      edge("sw", "kon"),
      edge("kon", "rt"),
      edge("rt", "net"),
      edge("net", "vpn"),
      edge("vpn", "zn"),
      edge("zn", "erp"),
      edge("zn", "idp"),
      edge("zn", "vsdm"),
    ],
  };
};
/** Parallelbetrieb: Konnektor und Router hängen beide am Switch. */
const parallel = (over: Over = {}) => {
  const t = praxis({ ...over, kon: { mode: "parallel", ...over["kon"] } });
  t.edges = t.edges.filter((e) => e.id !== "kon-rt").concat(edge("sw", "rt"));
  return t;
};
const withNode = (t: Topology, ...n: N[]): Topology => ({
  ...t,
  nodes: [...t.nodes, ...n],
});

describe("Betrieb: Grundlagen", () => {
  it("gesunde Praxis mit gesetzten Standardwerten meldet nichts", () => {
    const ok = praxis({
      kon: { ip: "192.168.10.2", updateOk: true, timeOffset: 0, mode: "reihe" },
      rt: { ip: "192.168.10.1", ipsecAllowed: true },
      pc: { gateway: "192.168.10.2", dns: "192.168.10.2", routeTI: true },
      kt: { paired: true, workplace: "AP-1" },
    });
    expect(run(ok)).toEqual([]);
  });

  it("im Modus Einfach meldet keine Betriebsregel", () => {
    const t = praxis({
      kon: { updateOk: false, timeOffset: 9999 },
      kt: { paired: false },
    });
    expect(run(t).length).toBeGreaterThan(0);
    expect(run(t, "simple")).toEqual([]);
  });
});

describe("P-16 bis P-17a Zugang", () => {
  it("[P-16] positiv und negativ", () => {
    expect(hits(praxis({ kon: { updateOk: false } }), "P-16")).toHaveLength(1);
    expect(hits(praxis({ kon: { updateOk: true } }), "P-16")).toEqual([]);
    expect(hits(praxis(), "P-16")).toEqual([]);
  });

  it("[P-17] Grenze 3600 s: darüber und darunter, auch negativ", () => {
    expect(hits(praxis({ kon: { timeOffset: 3601 } }), "P-17")).toHaveLength(1);
    expect(hits(praxis({ kon: { timeOffset: -4500 } }), "P-17")).toHaveLength(
      1,
    );
    expect(hits(praxis({ kon: { timeOffset: 3600 } }), "P-17")).toEqual([]);
  });

  it("[P-17a] Warnung ab 30, Fehler ab 50 Tagen, vorher und ungesetzt nichts", () => {
    const sync = (d: string) =>
      hits(praxis({ kon: { lastTimeSync: d } }), "P-17a");
    expect(sync("2026-10-03")).toEqual([]); // 29 Tage
    expect(sync("2026-10-02")[0]?.severity).toBe("Warnung"); // 30 Tage
    expect(sync("2026-09-13")[0]?.severity).toBe("Warnung"); // 49 Tage
    expect(sync("2026-09-12")[0]?.severity).toBe("Fehler"); // 50 Tage
    expect(hits(praxis(), "P-17a")).toEqual([]);
  });
});

describe("P-19, P-20 Betriebsart", () => {
  it("[P-19] positiv: Parallel ohne Firewall; negativ: mit Firewall oder in Reihe", () => {
    expect(hits(parallel(), "P-19")).toHaveLength(1);
    expect(hits(withNode(parallel(), node("fw", "fw")), "P-19")).toEqual([]);
    expect(hits(praxis(), "P-19")).toEqual([]);
  });

  it("[P-20] positiv: Parallel ohne Router; negativ: mit Router oder in Reihe", () => {
    const ohne = parallel();
    ohne.nodes = ohne.nodes.filter((n) => n.id !== "rt");
    ohne.edges = ohne.edges.filter((e) => !e.id.includes("rt"));
    expect(hits(ohne, "P-20")).toHaveLength(1);
    expect(hits(parallel(), "P-20")).toEqual([]);
    expect(hits(praxis(), "P-20")).toEqual([]);
  });
});

describe("P-21 IPsec", () => {
  it("[P-21] positiv: Router erreichbar, IPsec gesperrt, auch hinter Firewall", () => {
    const t = praxis({ rt: { ipsecAllowed: false } });
    expect(hits(t, "P-21").map((f) => f.nodes)).toEqual([["kon", "rt"]]);
    const fw = withNode(
      parallel({ rt: { ipsecAllowed: false } }),
      node("fw", "fw"),
    );
    fw.edges = fw.edges
      .filter((e) => e.id !== "sw-rt")
      .concat(edge("sw", "fw"), edge("fw", "rt"));
    expect(hits(fw, "P-21")).toHaveLength(1);
  });

  it("[P-21] negativ: erlaubt, ungesetzt oder Router nicht beim Zugang", () => {
    expect(hits(praxis({ rt: { ipsecAllowed: true } }), "P-21")).toEqual([]);
    expect(hits(praxis(), "P-21")).toEqual([]);
    const fern = withNode(
      praxis(),
      node("r2", "router", { config: { ipsecAllowed: false } }),
    );
    expect(hits(fern, "P-21")).toEqual([]);
  });
});

describe("P-23, P-24 Segment", () => {
  const dhcp = { pc: { dhcp: true } };

  it("[P-23] positiv: DHCP ohne Server; negativ: Zugang oder Router im Segment ist Server", () => {
    expect(hits(praxis(dhcp), "P-23").map((f) => f.nodes)).toEqual([["pc"]]);
    expect(
      hits(praxis({ ...dhcp, kon: { dhcpServer: true } }), "P-23"),
    ).toEqual([]);
    expect(
      hits(parallel({ ...dhcp, rt: { dhcpServer: true } }), "P-23"),
    ).toEqual([]);
    expect(hits(praxis(), "P-23")).toEqual([]);
  });

  it("[P-23] der Router hinter dem Zugang liegt nicht im Segment der Clients", () => {
    expect(
      hits(praxis({ ...dhcp, rt: { dhcpServer: true } }), "P-23"),
    ).toHaveLength(1);
  });

  it("[P-24] positiv: anderes VLAN am selben Switch; negativ: gleiches oder Standard", () => {
    expect(
      hits(praxis({ pc: { vlan: "Gast" } }), "P-24").map((f) => f.nodes),
    ).toEqual([["kon", "pc"]]);
    expect(
      hits(
        praxis({
          pc: { vlan: "Gast" },
          kt: { vlan: "Gast" },
          kon: { vlan: "Gast" },
        }),
        "P-24",
      ),
    ).toEqual([]);
    expect(hits(praxis(), "P-24")).toEqual([]);
  });
});

describe("P-25 bis P-28 Clients", () => {
  it("[P-25] Reihe: Gateway muss der Zugang sein", () => {
    const ip = { kon: { ip: "192.168.10.2" } };
    expect(
      hits(praxis({ ...ip, pc: { gateway: "192.168.10.1" } }), "P-25"),
    ).toHaveLength(1);
    expect(
      hits(praxis({ ...ip, pc: { gateway: "192.168.10.2" } }), "P-25"),
    ).toEqual([]);
    expect(hits(praxis(ip), "P-25")).toEqual([]); // ungesetzt = Standard
    expect(
      hits(parallel({ ...ip, pc: { gateway: "192.168.10.9" } }), "P-25"),
    ).toEqual([]);
  });

  it("[P-26] Parallel: Gateway muss der Router sein", () => {
    const ip = { rt: { ip: "192.168.10.1" } };
    expect(
      hits(parallel({ ...ip, pc: { gateway: "192.168.10.2" } }), "P-26"),
    ).toHaveLength(1);
    expect(
      hits(parallel({ ...ip, pc: { gateway: "192.168.10.1" } }), "P-26"),
    ).toEqual([]);
    expect(
      hits(praxis({ ...ip, pc: { gateway: "192.168.10.2" } }), "P-26"),
    ).toEqual([]);
  });

  it("[P-27] Parallel ohne Route meldet; Reihe und Standard nicht", () => {
    expect(hits(parallel({ pc: { routeTI: false } }), "P-27")).toHaveLength(1);
    expect(hits(parallel({ pc: { routeTI: true } }), "P-27")).toEqual([]);
    expect(hits(parallel(), "P-27")).toEqual([]);
    expect(hits(praxis({ pc: { routeTI: false } }), "P-27")).toEqual([]);
  });

  it("[P-28] fremder DNS meldet als Warnung, Zugang oder ungesetzt nicht", () => {
    const ip = { kon: { ip: "192.168.10.2" } };
    expect(
      hits(praxis({ ...ip, pc: { dns: "8.8.8.8" } }), "P-28")[0]?.severity,
    ).toBe("Warnung");
    expect(
      hits(praxis({ ...ip, pc: { dns: "192.168.10.2" } }), "P-28"),
    ).toEqual([]);
    expect(hits(praxis(ip), "P-28")).toEqual([]);
  });
});

describe("P-29, P-30 Arbeitsplatz und Pairing", () => {
  it("[P-29] Arbeitsplatz ohne Terminal meldet; passend, Standard oder ohne Terminal nicht", () => {
    expect(hits(praxis({ pc: { workplace: "AP-2" } }), "P-29")).toHaveLength(1);
    expect(
      hits(
        praxis({ pc: { workplace: "AP-2" }, kt: { workplace: "AP-2" } }),
        "P-29",
      ),
    ).toEqual([]);
    expect(hits(praxis(), "P-29")).toEqual([]);
    const ohneKt = praxis({ pc: { workplace: "AP-2" } });
    ohneKt.nodes = ohneKt.nodes.filter((n) => n.id !== "kt");
    expect(hits(ohneKt, "P-29")).toEqual([]);
  });

  it("[P-30] nicht gepairt meldet, gepairt und ungesetzt nicht", () => {
    expect(
      hits(praxis({ kt: { paired: false } }), "P-30").map((f) => f.nodes),
    ).toEqual([["kt"]]);
    expect(hits(praxis({ kt: { paired: true } }), "P-30")).toEqual([]);
    expect(hits(praxis(), "P-30")).toEqual([]);
  });
});

describe("Betrieb in availableActions (Modus Erweitert)", () => {
  const action = (
    t: Topology,
    trigger: string,
    id: string,
    mode: "simple" | "advanced" = "advanced",
  ) =>
    availableActions(
      t.nodes.find((n) => n.id === trigger) as N,
      t,
      catalog,
      mode,
    ).find((a) => a.id === id);
  const erezept = (t: Topology, mode: "simple" | "advanced" = "advanced") =>
    action(t, "pc", "erezept-ausstellen", mode);

  it("gesunde Praxis: E-Rezept ausstellen ist möglich", () => {
    expect(erezept(praxis())?.enabled).toBe(true);
  });

  it("[P-27] graut E-Rezept ausstellen aus, im Modus Einfach nicht", () => {
    const t = parallel({ pc: { routeTI: false } });
    expect(erezept(t)?.enabled).toBe(false);
    expect(erezept(t)?.disabledReason).toContain("P-27");
    expect(erezept(t, "simple")?.enabled).toBe(true);
  });

  const unterbrechen: [string, Topology][] = [
    ["P-16", praxis({ kon: { updateOk: false } })],
    ["P-17", praxis({ kon: { timeOffset: 4500 } })],
    ["P-17a", praxis({ kon: { lastTimeSync: "2026-09-01" } })],
    ["P-21", praxis({ rt: { ipsecAllowed: false } })],
    [
      "P-25",
      praxis({ kon: { ip: "192.168.10.2" }, pc: { gateway: "192.168.10.9" } }),
    ],
    [
      "P-26",
      parallel({
        rt: { ip: "192.168.10.1" },
        pc: { gateway: "192.168.10.9" },
      }),
    ],
    ["P-30", praxis({ kt: { paired: false } })],
  ];
  it.each(unterbrechen)(
    "[%s] unterbricht den Pfad: Aktion ausgegraut mit Regel-ID",
    (id, t) => {
      expect(erezept(t)?.enabled).toBe(false);
      expect(erezept(t)?.disabledReason).toContain(id);
      expect(erezept(t, "simple")?.enabled).toBe(true);
    },
  );

  it("[P-17a] schon die Warnung nach 30 Tagen lässt die Aktion zu", () => {
    expect(
      erezept(praxis({ kon: { lastTimeSync: "2026-10-02" } }))?.enabled,
    ).toBe(true);
  });

  it("[P-30] gilt auch, wenn das Terminal selbst auslöst", () => {
    const t = praxis({ kt: { paired: false } });
    expect(action(t, "kt", "vsdm-pruefen")?.enabled).toBe(false);
    expect(action(praxis(), "kt", "vsdm-pruefen")?.enabled).toBe(true);
  });

  it("Regeln ohne Pfadwirkung (P-19, P-23, P-29) sperren nichts", () => {
    const t = parallel({ pc: { dhcp: true, workplace: "AP-2" } });
    expect(erezept(t)?.enabled).toBe(true);
  });
});
