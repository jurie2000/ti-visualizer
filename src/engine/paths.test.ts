import { describe, expect, it } from "vitest";
import type { Node, Topology } from "../schema";
import { resolvePath, terminalFor, zugangOf } from "./paths";

// Kleiner Fixture-Katalog: nur, was die Pfadsuche liest (Kategorie, Fähigkeiten).
const dt = (id: string, category: string, capabilities: string[] = []) => ({
  id,
  abbr: id,
  name: id,
  category,
  placeable: true,
  icon: "box",
  visibleSimple: true,
  capabilities,
  ports: [],
  source: ["arch"],
  status: "bestätigt" as const,
});
const catalog = {
  deviceTypes: [
    dt("pvs", "primary", ["netConfig:client"]),
    dt("timc", "primary"),
    dt("kt", "terminal", ["cardSlots"]),
    dt("mkt", "terminal", ["cardSlots"]),
    dt("cardlink", "terminal", ["nfcCard"]),
    dt("switch", "lan"),
    dt("router", "lan"),
    dt("kon", "network", ["zugang"]),
    dt("vpn", "network"),
    dt("internet", "network"),
    dt("zentral", "network"),
    dt("erp", "service"),
    dt("tim", "service"),
    dt("popp", "service"),
    dt("dns", "zentral"),
    dt("erpapp", "versicherte", ["nfcCard"]),
  ],
};

type N = [id: string, type: string, config?: Node["config"], fault?: boolean];
function topo(nodes: N[], edges: [string, string, boolean?][]): Topology {
  return {
    name: "t",
    description: "",
    simDate: "2026-11-01",
    zones: [],
    nodes: nodes.map(([id, type, config, fault]) => ({
      id,
      type,
      position: { x: 0, y: 0 },
      fault: fault ?? false,
      ...(config ? { config } : {}),
    })),
    edges: edges.map(([a, b, fault]) => ({
      id: `${a}-${b}`,
      ends: [
        { node: a, port: "p" },
        { node: b, port: "p" },
      ],
      fault: fault ?? false,
    })),
  };
}

// Praxis: pvs - switch - kon - router - internet - vpn - zentral - erp
const praxis = (): Topology =>
  topo(
    [
      ["pvs", "pvs"],
      ["sw", "switch"],
      ["kon", "kon"],
      ["rt", "router"],
      ["net", "internet"],
      ["vpn", "vpn"],
      ["zn", "zentral"],
      ["erp", "erp"],
    ],
    [
      ["pvs", "sw"],
      ["sw", "kon"],
      ["kon", "rt"],
      ["rt", "net"],
      ["net", "vpn"],
      ["vpn", "zn"],
      ["zn", "erp"],
    ],
  );

describe("Pfadregel 6.0", () => {
  it("Rollenfolge Auslöser, LAN, Zugang, Router, Internet, VPN, Zentrales Netz, Dienst", () => {
    const r = resolvePath(praxis(), "pvs", "erp", catalog);
    expect(r).toMatchObject({
      ok: true,
      nodes: ["pvs", "sw", "kon", "rt", "net", "vpn", "zn", "erp"],
      zugang: "kon",
    });
    expect(r.ok && r.edges).toHaveLength(7);
  });

  it("Zentrales Netz ist optional: VPN direkt zum Dienst", () => {
    const t = topo(
      [
        ["pvs", "pvs"],
        ["kon", "kon"],
        ["vpn", "vpn"],
        ["erp", "erp"],
      ],
      [
        ["pvs", "kon"],
        ["kon", "vpn"],
        ["vpn", "erp"],
      ],
    );
    expect(resolvePath(t, "pvs", "erp", catalog).ok).toBe(true);
  });

  it("Weg am Zugang vorbei ist kein TI-Pfad", () => {
    const t = topo(
      [
        ["pvs", "pvs"],
        ["rt", "router"],
        ["net", "internet"],
        ["vpn", "vpn"],
        ["erp", "erp"],
      ],
      [
        ["pvs", "rt"],
        ["rt", "net"],
        ["net", "vpn"],
        ["vpn", "erp"],
      ],
    );
    expect(resolvePath(t, "pvs", "erp", catalog)).toEqual({
      ok: false,
      reason: "kein-weg",
    });
  });

  it("Weg am VPN-Zugangsdienst vorbei ist kein TI-Pfad", () => {
    const t = topo(
      [
        ["pvs", "pvs"],
        ["kon", "kon"],
        ["net", "internet"],
        ["erp", "erp"],
      ],
      [
        ["pvs", "kon"],
        ["kon", "net"],
        ["net", "erp"],
      ],
    );
    expect(resolvePath(t, "pvs", "erp", catalog).ok).toBe(false);
  });

  it("Zugang selbst ist als Ziel erreichbar", () => {
    expect(resolvePath(praxis(), "pvs", "kon", catalog)).toMatchObject({
      ok: true,
      nodes: ["pvs", "sw", "kon"],
    });
  });

  it("Dienste sind keine Durchgangsknoten", () => {
    const t = praxis();
    t.nodes.push({
      id: "dns",
      type: "dns",
      position: { x: 0, y: 0 },
      fault: false,
    });
    t.edges.push({
      id: "erp-dns",
      ends: [
        { node: "erp", port: "p" },
        { node: "dns", port: "p" },
      ],
      fault: false,
    });
    expect(resolvePath(t, "pvs", "dns", catalog).ok).toBe(false);
  });

  it("Ausgeblendete Geräte zählen voll mit", () => {
    // switch, router, internet haben im Katalog visibleSimple false: kein Filter im Pfad
    const hidden = {
      deviceTypes: catalog.deviceTypes.map((d) => ({
        ...d,
        visibleSimple: !["switch", "router", "internet"].includes(d.id),
      })),
    };
    expect(resolvePath(praxis(), "pvs", "erp", hidden).ok).toBe(true);
  });

  it("Ausgefallenes Gerät unterbricht den Pfad und wird genannt", () => {
    const t = praxis();
    (t.nodes.find((n) => n.id === "kon") as Node).fault = true;
    expect(resolvePath(t, "pvs", "erp", catalog)).toEqual({
      ok: false,
      reason: "ausgefallen",
      at: "kon",
    });
  });

  it("Getrennte Kante unterbricht den Pfad und wird genannt", () => {
    const t = praxis();
    (t.edges.find((e) => e.id === "rt-net") as Topology["edges"][0]).fault =
      true;
    expect(resolvePath(t, "pvs", "erp", catalog)).toEqual({
      ok: false,
      reason: "ausgefallen",
      at: "rt-net",
    });
  });

  it("Ausgefallener Auslöser findet keinen Pfad und wird genannt", () => {
    const t = praxis();
    (t.nodes.find((n) => n.id === "pvs") as Node).fault = true;
    expect(resolvePath(t, "pvs", "erp", catalog)).toEqual({
      ok: false,
      reason: "ausgefallen",
      at: "pvs",
    });
  });

  it("Bei mehreren Ausfällen nennt at das erste Element entlang des Weges", () => {
    const t = praxis();
    (t.nodes.find((n) => n.id === "vpn") as Node).fault = true;
    (t.edges.find((e) => e.id === "pvs-sw") as Topology["edges"][0]).fault =
      true;
    expect(resolvePath(t, "pvs", "erp", catalog)).toMatchObject({
      reason: "ausgefallen",
      at: "pvs-sw",
    });
  });

  it("Unbekannter Knoten und gleicher Auslöser und Ziel liefern keinen Weg", () => {
    expect(resolvePath(praxis(), "x", "erp", catalog).ok).toBe(false);
    expect(resolvePath(praxis(), "pvs", "pvs", catalog).ok).toBe(false);
  });
});

describe("Internet-Wege 6.0", () => {
  const app = () =>
    topo(
      [
        ["app", "erpapp"],
        ["net", "internet"],
        ["erp", "erp"],
      ],
      [
        ["app", "net"],
        ["net", "erp"],
      ],
    );

  it("Versicherten-App erreicht den Dienst über das Internet", () => {
    expect(resolvePath(app(), "app", "erp", catalog).ok).toBe(true);
  });

  it("TI-Messenger-Client erreicht den Messenger-Dienst über Router und Internet", () => {
    const t = topo(
      [
        ["c", "timc"],
        ["rt", "router"],
        ["net", "internet"],
        ["tim", "tim"],
      ],
      [
        ["c", "rt"],
        ["rt", "net"],
        ["net", "tim"],
      ],
    );
    expect(resolvePath(t, "c", "tim", catalog).ok).toBe(true);
  });

  it("CardLink erreicht den Zugang über das Internet", () => {
    const t = topo(
      [
        ["cl", "cardlink"],
        ["net", "internet"],
        ["rt", "router"],
        ["kon", "kon"],
      ],
      [
        ["cl", "net"],
        ["net", "rt"],
        ["rt", "kon"],
      ],
    );
    expect(resolvePath(t, "cl", "kon", catalog).ok).toBe(true);
  });

  it("PoPP ist über Router und Internet erreichbar, auch ohne Zugang", () => {
    const t = topo(
      [
        ["pvs", "pvs"],
        ["rt", "router"],
        ["net", "internet"],
        ["popp", "popp"],
      ],
      [
        ["pvs", "rt"],
        ["rt", "net"],
        ["net", "popp"],
      ],
    );
    expect(resolvePath(t, "pvs", "popp", catalog).ok).toBe(true);
  });

  it("PoPP ist auch hinter dem Zugang über Router und Internet erreichbar", () => {
    const t = topo(
      [
        ["pvs", "pvs"],
        ["kon", "kon"],
        ["net", "internet"],
        ["popp", "popp"],
      ],
      [
        ["pvs", "kon"],
        ["kon", "net"],
        ["net", "popp"],
      ],
    );
    expect(resolvePath(t, "pvs", "popp", catalog).ok).toBe(true);
  });

  it("Internet-Gerät im LAN ohne Internet-Strecke hat keinen Weg (pvs - sw - popp)", () => {
    const t = topo(
      [
        ["pvs", "pvs"],
        ["sw", "switch"],
        ["popp", "popp"],
      ],
      [
        ["pvs", "sw"],
        ["sw", "popp"],
      ],
    );
    expect(resolvePath(t, "pvs", "popp", catalog).ok).toBe(false);
  });

  it("Direkte Kante der App zum Dienst gilt (Vereinfachung 4.2)", () => {
    const t = topo(
      [
        ["app", "erpapp"],
        ["erp", "erp"],
      ],
      [["app", "erp"]],
    );
    expect(resolvePath(t, "app", "erp", catalog).ok).toBe(true);
  });

  it("Andere Dienste sind über das Internet allein nicht erreichbar", () => {
    const t = topo(
      [
        ["pvs", "pvs"],
        ["rt", "router"],
        ["net", "internet"],
        ["erp", "erp"],
      ],
      [
        ["pvs", "rt"],
        ["rt", "net"],
        ["net", "erp"],
      ],
    );
    expect(resolvePath(t, "pvs", "erp", catalog).ok).toBe(false);
  });

  it("Internet-Weg der App führt nicht durch Zugang oder VPN", () => {
    const t = topo(
      [
        ["app", "erpapp"],
        ["vpn", "vpn"],
        ["erp", "erp"],
      ],
      [
        ["app", "vpn"],
        ["vpn", "erp"],
      ],
    );
    expect(resolvePath(t, "app", "erp", catalog).ok).toBe(false);
  });
});

describe("Terminal und Zugang 6.0", () => {
  // zwei Zugänge im Netz, ein KT, gepairt mit kon2
  const zwei = (pairedWith?: string, extra: N[] = []) =>
    topo(
      [
        ["pvs", "pvs", { workplace: "AP-1" }],
        ["sw", "switch"],
        ["kon1", "kon"],
        ["kon2", "kon"],
        [
          "kt",
          "kt",
          { workplace: "AP-1", ...(pairedWith ? { pairedWith } : {}) },
        ],
        ...extra,
      ],
      [
        ["pvs", "sw"],
        ["sw", "kon1"],
        ["sw", "kon2"],
        ["sw", "kt"],
      ],
    );

  it("zwei Zugänge im Netz, KT gehört zum gepairten", () => {
    const t = zwei("kon2");
    expect(zugangOf(t, "kt", catalog)).toBe("kon2");
    const r = resolvePath(t, "pvs", "kt", catalog, "local");
    expect(r).toMatchObject({ ok: true, zugang: "kon2" });
    expect(r.ok && r.nodes).not.toContain("kon1");
  });

  it("Bei direkter Verbindung gehört das KT zum verbundenen Zugang", () => {
    const t = topo(
      [
        ["pvs", "pvs"],
        ["kon1", "kon"],
        ["kon2", "kon"],
        ["kt", "kt"],
      ],
      [
        ["pvs", "kon1"],
        ["pvs", "kon2"],
        ["kon1", "kt"],
      ],
    );
    expect(zugangOf(t, "kt", catalog)).toBe("kon1");
    expect(resolvePath(t, "pvs", "kt", catalog, "local")).toMatchObject({
      ok: true,
      nodes: ["pvs", "kon1", "kt"],
    });
  });

  it("KT ohne Pairing und ohne direkten Zugang gehört zu keinem", () => {
    const t = zwei();
    expect(zugangOf(t, "kt", catalog)).toBeUndefined();
    expect(resolvePath(t, "pvs", "kt", catalog, "local").ok).toBe(false);
  });

  it("Pairing mit einem Nicht-Zugang zählt nicht", () => {
    expect(zugangOf(zwei("sw"), "kt", catalog)).toBeUndefined();
  });

  it("local-Pfad (NFDM/eMP) führt über den Zugang bis zum Terminal, ohne VPN und Dienst", () => {
    const r = resolvePath(zwei("kon1"), "pvs", "kt", catalog, "local");
    expect(r).toMatchObject({
      ok: true,
      nodes: ["pvs", "sw", "kon1", "sw", "kt"],
    });
  });

  it("local-Pfad am Zugang vorbei zählt nicht", () => {
    const t = topo(
      [
        ["pvs", "pvs"],
        ["sw", "switch"],
        ["kon", "kon"],
        ["kt", "kt", { pairedWith: "kon" }],
      ],
      [
        ["pvs", "sw"],
        ["sw", "kt"],
        ["sw", "kon"],
        ["kon", "kt"],
      ],
    );
    // kt hängt am sw und am kon: der Weg führt über kon, nicht direkt über sw
    const r = resolvePath(t, "pvs", "kt", catalog, "local");
    expect(r.ok && r.nodes).toContain("kon");
    const ohne = topo(
      [
        ["pvs", "pvs"],
        ["sw", "switch"],
        ["kon", "kon"],
        ["kt", "kt", { pairedWith: "kon" }],
      ],
      [
        ["pvs", "sw"],
        ["sw", "kt"],
      ],
    );
    expect(resolvePath(ohne, "pvs", "kt", catalog, "local").ok).toBe(false);
  });

  it("TI-Pfad eines KT läuft nur über seinen gepairten Zugang", () => {
    const t = zwei("kon2", [
      ["vpn", "vpn"],
      ["erp", "erp"],
    ]);
    const edge = (a: string, b: string) => ({
      id: `${a}-${b}`,
      ends: [
        { node: a, port: "p" },
        { node: b, port: "p" },
      ] as Topology["edges"][0]["ends"],
      fault: false,
    });
    t.edges.push(edge("kon1", "vpn"), edge("kon2", "vpn"), edge("vpn", "erp"));
    const r = resolvePath(t, "kt", "erp", catalog);
    expect(r.ok && r.nodes).toContain("kon2");
    expect(r.ok && r.nodes).not.toContain("kon1");
    (t.nodes.find((n) => n.id === "kon2") as Node).fault = true;
    expect(resolvePath(t, "kt", "erp", catalog).ok).toBe(false);
  });

  it("Zugang als Auslöser hat einen Weg zum VPN-Zugangsdienst", () => {
    const t = topo(
      [
        ["pvs", "pvs"],
        ["kon", "kon"],
        ["vpn", "vpn"],
      ],
      [
        ["pvs", "kon"],
        ["kon", "vpn"],
      ],
    );
    expect(resolvePath(t, "kon", "vpn", catalog)).toMatchObject({
      ok: true,
      nodes: ["kon", "vpn"],
      zugang: "kon",
    });
  });

  it("Mehrere Terminals: es zählt das mit dem Arbeitsplatz des Auslösers", () => {
    const t = zwei("kon1", [
      ["kt2", "kt", { workplace: "AP-2", pairedWith: "kon1" }],
    ]);
    t.edges.push({
      id: "sw-kt2",
      ends: [
        { node: "sw", port: "p" },
        { node: "kt2", port: "p" },
      ],
      fault: false,
    });
    expect(terminalFor(t, "pvs", catalog)).toEqual({
      status: "one",
      terminal: "kt",
    });
  });

  it("Zugeordnetes Terminal nicht erreichbar: kein Ausweichen auf fremde Arbeitsplätze", () => {
    const t = zwei("kon1", [
      ["kt2", "kt", { workplace: "AP-2", pairedWith: "kon1" }],
    ]);
    (t.nodes.find((n) => n.id === "kt") as Node).fault = true;
    t.edges.push({
      id: "sw-kt2",
      ends: [
        { node: "sw", port: "p" },
        { node: "kt2", port: "p" },
      ],
      fault: false,
    });
    expect(terminalFor(t, "pvs", catalog)).toEqual({ status: "none" });
  });

  it("Mehrere Terminals ohne Zuordnung: die App fragt", () => {
    const t = zwei("kon1", [["kt2", "kt", { pairedWith: "kon1" }]]);
    (t.nodes.find((n) => n.id === "pvs") as Node).config = {};
    t.edges.push({
      id: "sw-kt2",
      ends: [
        { node: "sw", port: "p" },
        { node: "kt2", port: "p" },
      ],
      fault: false,
    });
    expect(terminalFor(t, "pvs", catalog)).toEqual({
      status: "choose",
      candidates: ["kt", "kt2"],
    });
  });

  it("Kein erreichbares Terminal liefert none (mobiles KT ohne Zugang zählt nicht)", () => {
    const t = topo(
      [
        ["pvs", "pvs"],
        ["m", "mkt"],
      ],
      [["pvs", "m"]],
    );
    expect(terminalFor(t, "pvs", catalog)).toEqual({ status: "none" });
  });
});
