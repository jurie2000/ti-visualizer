import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { loadCatalog, type Topology } from "../schema";
import { runChecks, type Finding } from "./checks";

const catalog = loadCatalog();

type N = Topology["nodes"][number];
const node = (id: string, type: string, extra: Partial<N> = {}): N => ({
  id,
  type,
  fault: false,
  position: { x: 0, y: 0 },
  ...extra,
});
const edge = (id: string, a: string, b: string, fault = false) => ({
  id,
  fault,
  ends: [
    { node: a, port: "p" },
    { node: b, port: "p" },
  ] as [{ node: string; port: string }, { node: string; port: string }],
});
const topo = (
  nodes: N[],
  edges: Topology["edges"] = [],
  simDate = "2026-11-01",
): Topology => ({
  name: "t",
  description: "",
  simDate,
  nodes,
  edges,
  zones: [],
});
/** Ändert die Felder des Knotens `id` in `t`. */
const patch = (t: Topology, id: string, extra: Partial<N>) => {
  t.nodes = t.nodes.map((n) => (n.id === id ? { ...n, ...extra } : n));
};
const breakEdge = (t: Topology, id: string) => {
  t.edges = t.edges.map((e) => (e.id === id ? { ...e, fault: true } : e));
};
const ids = (fs: Finding[]) => fs.map((f) => f.id);
const run = (t: Topology, mode: "simple" | "advanced" = "advanced") =>
  runChecks(t, mode, catalog);

/** Gesunde Praxis: PVS, KT und Konnektor am Switch, Router mit Weg zum VPN. */
const healthy = () =>
  topo(
    [
      node("pvs", "pvs"),
      node("kt", "kt", { config: { pairedWith: "kon" } }),
      node("sw", "switch"),
      node("kon", "kon"),
      node("rt", "router"),
      node("vpn", "vpn"),
    ],
    [
      edge("e1", "pvs", "sw"),
      edge("e2", "kt", "sw"),
      edge("e3", "sw", "kon"),
      edge("e4", "kon", "rt"),
      edge("e5", "rt", "vpn"),
    ],
  );

describe("runChecks Grundlagen", () => {
  it("meldet bei gesunder Topologie nichts, in beiden Modi", () => {
    expect(run(healthy())).toEqual([]);
    expect(run(healthy(), "simple")).toEqual([]);
  });

  it("leere Topologie meldet nichts (auch kein P-4)", () => {
    expect(run(topo([]))).toEqual([]);
  });

  it("Gerät mit unbekanntem Typ und Kante ins Leere stürzen nicht ab", () => {
    const t = topo([node("x", "gibtsnicht")], [edge("e", "x", "weg")]);
    expect(() => run(t)).not.toThrow();
  });

  it("jede Regel des Teils Zustand steht im Katalog", () => {
    const wanted = [
      "P-1",
      "P-2",
      "P-3",
      "P-4",
      "P-5",
      "P-6",
      "P-7",
      "P-18",
      "P-22",
      "P-31",
      "P-32",
      "P-33",
    ];
    const have = catalog.checks.map((c) => c.id);
    for (const id of wanted) expect(have).toContain(id);
  });

  it("onlyAdvanced-Regeln melden im Modus Einfach nicht", () => {
    const c = {
      ...catalog,
      checks: catalog.checks.map((k) =>
        k.id === "P-7" ? { ...k, onlyAdvanced: true } : k,
      ),
    };
    const t = topo([node("kon", "kon"), node("lose", "pvs")]);
    expect(ids(runChecks(t, "advanced", c))).toContain("P-7");
    expect(ids(runChecks(t, "simple", c))).not.toContain("P-7");
  });

  it("sortiert nach Schwere, dann Katalogreihenfolge, dann Gerät", () => {
    const t = topo([
      node("b", "pvs", { fault: true }),
      node("a", "pvs", { fault: true }),
    ]);
    const out = run(t);
    expect(out.map((f) => f.severity)).toEqual([
      "Fehler",
      "Fehler",
      "Warnung",
      "Hinweis",
      "Hinweis",
    ]);
    expect(out.map((f) => f.key)).toEqual([
      "P-1:a",
      "P-1:b",
      "P-4:-",
      "P-7:a",
      "P-7:b",
    ]);
  });

  it("Property: Ergebnis hängt nicht von der Reihenfolge der Knoten und Kanten ab", () => {
    const base = topo(
      [
        node("pvs", "pvs", { fault: true }),
        node("kt", "kt", {
          config: { pairedWith: "kon" },
          cards: [{ kind: "smcb", expires: "2020-01-01", unlocked: false }],
        }),
        node("sw", "switch"),
        node("kon", "kon"),
        node("gw", "gateway"),
        node("ap", "ap"),
        node("lose", "pc"),
      ],
      [
        edge("e1", "pvs", "sw"),
        edge("e2", "kt", "sw", true),
        edge("e3", "sw", "kon"),
        edge("e4", "ap", "sw"),
        edge("e5", "kt", "gw"),
      ],
    );
    const expected = run(base);
    expect(expected.length).toBeGreaterThan(5);
    fc.assert(
      fc.property(
        fc.shuffledSubarray(base.nodes, {
          minLength: base.nodes.length,
          maxLength: base.nodes.length,
        }),
        fc.shuffledSubarray(base.edges, {
          minLength: base.edges.length,
          maxLength: base.edges.length,
        }),
        (nodes, edges) => {
          expect(run({ ...base, nodes, edges })).toEqual(expected);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("alle Presets haben im Modus Erweitert keinen Fehler aus dem Teil Zustand", () => {
    for (const p of catalog.presets)
      expect(
        run(p.topology).filter((f) => f.severity === "Fehler"),
        p.id,
      ).toEqual([]);
  });
});

describe("P-1 Gerät ausgefallen", () => {
  it("[P-1] positiv: ausgefallenes Gerät", () => {
    const t = healthy();
    patch(t, "kon", { fault: true });
    const f = run(t).filter((x) => x.id === "P-1");
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ nodes: ["kon"], severity: "Fehler" });
  });
  it("[P-1] negativ: laufende Geräte", () => {
    expect(ids(run(healthy()))).not.toContain("P-1");
  });
});

describe("P-2 Verbindung unterbrochen", () => {
  it("[P-2] positiv: nennt Kante und beide Geräte", () => {
    const t = healthy();
    breakEdge(t, "e1");
    const f = run(t).filter((x) => x.id === "P-2");
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ edges: ["e1"], nodes: ["pvs", "sw"] });
  });
  it("[P-2] negativ: intakte Kanten", () => {
    expect(ids(run(healthy()))).not.toContain("P-2");
  });
});

describe("P-3 Karte abgelaufen", () => {
  const withCard = (expires: string, kind: "egk" | "smcb" = "egk") => {
    const t = healthy();
    patch(t, "kt", {
      cards: [
        kind === "egk" ? { kind, expires } : { kind, expires, unlocked: true },
      ],
    });
    return t;
  };
  it("[P-3] positiv: Ablauf vor simDate", () => {
    const f = run(withCard("2026-10-31")).filter((x) => x.id === "P-3");
    expect(f).toHaveLength(1);
    expect(f[0]?.nodes).toEqual(["kt"]);
  });
  it("[P-3] negativ: Ablauf am simDate gilt noch (wie K-3)", () => {
    expect(ids(run(withCard("2026-11-01")))).not.toContain("P-3");
  });
  it("[P-3] je Karte ein Befund, auch bei zwei abgelaufenen im selben Gerät", () => {
    const t = withCard("2020-01-01");
    patch(t, "kt", {
      cards: [
        { kind: "egk", expires: "2020-01-01" },
        { kind: "smcb", expires: "2020-01-01", unlocked: true },
      ],
    });
    expect(run(t).filter((x) => x.id === "P-3")).toHaveLength(2);
  });
});

describe("P-4 kein Zugang", () => {
  it("[P-4] positiv: Geräte, aber kein Zugang", () => {
    const f = run(topo([node("pvs", "pvs")])).filter((x) => x.id === "P-4");
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ severity: "Warnung", nodes: [] });
  });
  it("[P-4] negativ: TI-Gateway zählt als Zugang", () => {
    expect(ids(run(topo([node("g", "gateway")])))).not.toContain("P-4");
  });
  it("[P-4] ein ausgefallener Zugang ist trotzdem vorhanden (P-1 meldet ihn)", () => {
    const out = ids(run(topo([node("k", "kon", { fault: true })])));
    expect(out).not.toContain("P-4");
    expect(out).toContain("P-1");
  });
});

describe("P-5 Kartenterminal erreicht Zugang nicht", () => {
  it("[P-5] positiv: Terminal ohne Kante zum Netz", () => {
    const t = healthy();
    t.edges = t.edges.filter((e) => e.id !== "e2");
    const f = run(t).filter((x) => x.id === "P-5");
    expect(f.map((x) => x.nodes)).toEqual([["kt"]]);
  });
  it("[P-5] positiv: gepairt mit Gerät, das kein Zugang ist", () => {
    const t = healthy();
    patch(t, "kt", { config: { pairedWith: "pvs" } });
    expect(ids(run(t))).toContain("P-5");
  });
  it("[P-5] positiv: zwei Zugänge, Terminal ohne Pairing und ohne direkte Kante", () => {
    const t = healthy();
    patch(t, "kt", { config: {} });
    t.nodes.push(node("kon2", "hskon"));
    t.edges.push(edge("e9", "kon2", "rt"));
    expect(ids(run(t))).toContain("P-5");
  });
  it("[P-5] negativ: Weg über Switch zum gepairten Zugang", () => {
    expect(ids(run(healthy()))).not.toContain("P-5");
  });
  it("[P-5] negativ: mehrere Zugänge, Terminal erreicht den gepairten", () => {
    const t = healthy();
    t.nodes.push(node("kon2", "hskon"));
    t.edges.push(edge("e9", "kon2", "rt"));
    expect(ids(run(t))).not.toContain("P-5");
  });
  it("[P-5] negativ: Ausfall auf dem Weg meldet P-2, nicht P-5", () => {
    const t = healthy();
    breakEdge(t, "e2");
    const out = ids(run(t));
    expect(out).toContain("P-2");
    expect(out).not.toContain("P-5");
  });
  it("[P-5] negativ: mobiles Terminal arbeitet offline", () => {
    const t = healthy();
    t.nodes.push(node("mkt", "mkt"));
    expect(run(t).filter((x) => x.id === "P-5")).toEqual([]);
  });
  it("[P-5] negativ: ohne jeden Zugang meldet nur P-4", () => {
    const out = ids(run(topo([node("kt", "kt")])));
    expect(out).toContain("P-4");
    expect(out).not.toContain("P-5");
  });
});

describe("P-6 WLAN im Segment von Terminal oder Zugang", () => {
  const wlan = (apVlan?: string) => {
    const t = healthy();
    t.nodes.push(node("ap", "ap", apVlan ? { config: { vlan: apVlan } } : {}));
    t.edges.push(edge("e8", "ap", "sw"));
    return t;
  };
  it("[P-6] positiv: AP am selben Switch, gleiches (Standard-)VLAN", () => {
    const f = run(wlan()).filter((x) => x.id === "P-6");
    expect(f).toHaveLength(1);
    expect(f[0]?.nodes).toEqual(["ap", "kon", "kt"]);
  });
  it("[P-6] negativ: AP in eigenem VLAN", () => {
    expect(ids(run(wlan("Gast")))).not.toContain("P-6");
  });
  it("[P-6] negativ: AP hinter dem Router liegt in einem anderen Segment", () => {
    const t = healthy();
    t.nodes.push(node("ap", "ap"));
    t.edges.push(edge("e8", "ap", "rt"));
    expect(ids(run(t))).not.toContain("P-6");
  });
  it("[P-6] negativ: AP ohne Terminal und Zugang im Segment", () => {
    const t = topo(
      [node("ap", "ap"), node("sw", "switch")],
      [edge("e", "ap", "sw")],
    );
    expect(ids(run(t))).not.toContain("P-6");
  });
});

describe("P-7 Gerät ohne Verbindung", () => {
  it("[P-7] positiv: loses Gerät", () => {
    const t = healthy();
    t.nodes.push(node("lose", "pc"));
    const f = run(t).filter((x) => x.id === "P-7");
    expect(f.map((x) => x.nodes)).toEqual([["lose"]]);
    expect(f[0]?.severity).toBe("Hinweis");
  });
  it("[P-7] negativ: jedes Gerät hat eine Kante", () => {
    expect(ids(run(healthy()))).not.toContain("P-7");
  });
  it("[P-7] negativ: unterbrochene Kante zählt als Verbindung (P-2 meldet sie)", () => {
    const t = topo(
      [node("a", "kon"), node("b", "pvs")],
      [edge("e", "a", "b", true)],
    );
    expect(ids(run(t))).not.toContain("P-7");
  });
});

describe("P-7 Kante ins Leere", () => {
  it("[P-7] Kante zu unbekanntem Knoten verbindet nicht", () => {
    const t = topo([node("a", "pc")], [edge("e", "a", "weg", true)]);
    const out = run(t);
    expect(out.filter((x) => x.id === "P-7").map((x) => x.nodes)).toEqual([
      ["a"],
    ]);
    expect(out.find((x) => x.id === "P-2")?.nodes).toEqual(["a"]);
  });
});

describe("P-18 gSMC-K-Zertifikat abgelaufen", () => {
  const cert = (type: string, certExpires?: string) => {
    const t = healthy();
    t.nodes[3] = node(
      "kon",
      type,
      certExpires ? { config: { certExpires } } : {},
    );
    return t;
  };
  it("[P-18] positiv: Ablauf vor simDate, auch im Modus Einfach", () => {
    for (const mode of ["advanced", "simple"] as const)
      expect(
        run(cert("kon", "2026-10-31"), mode).filter((x) => x.id === "P-18"),
      ).toHaveLength(1);
  });
  it("[P-18] negativ: gültig, am simDate oder ungesetzt (Standard)", () => {
    expect(ids(run(cert("kon", "2026-11-01")))).not.toContain("P-18");
    expect(ids(run(cert("kon")))).not.toContain("P-18");
  });
  it("[P-18] negativ: TI-Gateway hat keine gSMC-K, ein Streuwert zählt nicht", () => {
    expect(ids(run(cert("gateway", "2020-01-01")))).not.toContain("P-18");
  });
  it("[P-18] negativ: Streuwert an einem Primärsystem zählt nicht", () => {
    const t = healthy();
    t.nodes[0] = node("pvs", "pvs", { config: { certExpires: "2020-01-01" } });
    expect(ids(run(t))).not.toContain("P-18");
  });
});

describe("P-22 HBA oder SMC-B nicht freigeschaltet", () => {
  const withPin = (unlocked: boolean | undefined, expires = "2030-01-01") => {
    const t = healthy();
    patch(t, "kt", {
      cards: [
        {
          kind: "hba",
          expires,
          ...(unlocked === undefined ? {} : { unlocked }),
        },
      ],
    });
    return t;
  };
  it("[P-22] positiv: gesperrt, und ungesetzt zählt als gesperrt (wie K-4)", () => {
    expect(ids(run(withPin(false)))).toContain("P-22");
    expect(ids(run(withPin(undefined)))).toContain("P-22");
  });
  it("[P-22] negativ: freigeschaltet", () => {
    expect(ids(run(withPin(true)))).not.toContain("P-22");
  });
  it("[P-22] negativ: abgelaufene Karte meldet nur P-3", () => {
    const out = ids(run(withPin(false, "2020-01-01")));
    expect(out).toContain("P-3");
    expect(out).not.toContain("P-22");
  });
  it("[P-22] negativ: eGK hat keine Freischaltung", () => {
    const t = healthy();
    patch(t, "kt", {
      cards: [{ kind: "egk", expires: "2030-01-01", pinActive: false }],
    });
    expect(ids(run(t))).not.toContain("P-22");
  });
});

describe("P-31 Terminal mit mehr als einem Zugang gepairt", () => {
  const twoDirect = () => {
    const t = healthy();
    t.nodes.push(node("kon2", "hskon"));
    t.edges.push(edge("e8", "kt", "kon"), edge("e9", "kt", "kon2"));
    return t;
  };
  it("[P-31] positiv: direkte Kanten zu zwei Zugängen", () => {
    const f = run(twoDirect()).filter((x) => x.id === "P-31");
    expect(f).toHaveLength(1);
    expect(f[0]?.nodes).toEqual(["kon", "kon2", "kt"]);
  });
  it("[P-31] positiv: gepairt mit A, direkt verbunden mit B", () => {
    const t = healthy();
    t.nodes.push(node("kon2", "hskon"));
    t.edges.push(edge("e9", "kt", "kon2"));
    expect(ids(run(t))).toContain("P-31");
  });
  it("[P-31] negativ: ein Zugang, direkt und gepairt (derselbe)", () => {
    const t = healthy();
    t.edges.push(edge("e8", "kt", "kon"));
    expect(ids(run(t))).not.toContain("P-31");
  });
  it("[P-31] negativ: zwei Zugänge im Netz, Terminal nur mit einem gepairt", () => {
    const t = healthy();
    t.nodes.push(node("kon2", "hskon"));
    t.edges.push(edge("e9", "kon2", "rt"));
    expect(ids(run(t))).not.toContain("P-31");
  });
});

describe("P-32 Konnektor und TI-Gateway", () => {
  it("[P-32] positiv: beide Arten, ein Befund mit allen Zugängen", () => {
    for (const k of ["kon", "hskon"]) {
      const t = topo([node("k", k), node("g", "gateway")]);
      const f = run(t).filter((x) => x.id === "P-32");
      expect(f).toHaveLength(1);
      expect(f[0]?.nodes).toEqual(["g", "k"]);
    }
  });
  it("[P-32] negativ: nur Konnektor oder nur Gateway, auch mehrere gleicher Art", () => {
    expect(
      ids(run(topo([node("k", "kon"), node("k2", "hskon")]))),
    ).not.toContain("P-32");
    expect(ids(run(topo([node("g", "gateway")])))).not.toContain("P-32");
  });
});

describe("P-33 Zugang ohne Weg ins Internet", () => {
  const zugang = (edges: [string, string][], extra: N[] = []) =>
    topo(
      [node("kon", "kon"), node("sw", "switch"), ...extra],
      edges.map(([a, b], i) => edge(`e${String(i)}`, a, b)),
    );
  it("[P-33] positiv: Zugang ohne Router und VPN", () => {
    const f = run(zugang([])).filter((x) => x.id === "P-33");
    expect(f.map((x) => x.nodes)).toEqual([["kon"]]);
  });
  it("[P-33] positiv: Router nur hinter einem Primärsystem erreichbar zählt nicht", () => {
    const t = zugang(
      [
        ["kon", "pvs"],
        ["pvs", "rt"],
      ],
      [node("pvs", "pvs"), node("rt", "router")],
    );
    expect(ids(run(t))).toContain("P-33");
  });
  it("[P-33] negativ: direkt am Router", () => {
    const t = zugang([["kon", "rt"]], [node("rt", "router")]);
    expect(ids(run(t))).not.toContain("P-33");
  });
  it("[P-33] negativ: direkt am VPN-Zugangsdienst (vereinfacht)", () => {
    const t = zugang([["kon", "vpn"]], [node("vpn", "vpn")]);
    expect(ids(run(t))).not.toContain("P-33");
  });
  it("[P-33] negativ: Router über Switch erreichbar", () => {
    const t = zugang(
      [
        ["kon", "sw"],
        ["sw", "rt"],
      ],
      [node("rt", "router")],
    );
    expect(ids(run(t))).not.toContain("P-33");
  });
  it("[P-33] je Zugang einzeln: zweiter Zugang ohne Weg wird genannt", () => {
    const t = zugang(
      [["kon", "rt"]],
      [node("rt", "router"), node("k2", "hskon")],
    );
    expect(
      run(t)
        .filter((x) => x.id === "P-33")
        .map((x) => x.nodes),
    ).toEqual([["k2"]]);
  });
  it("[P-33] ein Ausfall ändert nichts (P-1/P-2 melden ihn)", () => {
    const t = zugang([["kon", "rt"]], [node("rt", "router", { fault: true })]);
    expect(ids(run(t))).not.toContain("P-33");
  });
});
