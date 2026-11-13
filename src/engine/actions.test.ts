import { describe, expect, it } from "vitest";
import type { AnyCard, Node, Topology } from "../schema";
import { loadCatalog } from "../schema/loadCatalog";
import { availableActions } from "./actions";
import { MESSAGES } from "./cards";
import { bindFlow } from "./simulation";

const catalog = loadCatalog();

const TYPES: Record<string, string> = {
  pvs: "pvs",
  kis: "kis",
  avs: "avs",
  pflege: "pflege",
  ris: "ris",
  lis: "lis",
  pc: "pc",
  tab: "tab",
  kimcm: "kimcm",
  timc: "timc",
  kt: "kt",
  mkt: "mkt",
  cardlink: "cardlink",
  sw: "switch",
  srv: "server",
  ap: "ap",
  kon: "kon",
  rt: "router",
  net: "internet",
  vpn: "vpn",
  zn: "zentral",
  vsdm: "vsdm",
  erp: "erp",
  idp: "idp",
  idpsek: "idpsek",
  kim: "kim",
  tim: "tim",
  epa: "epa",
  popp: "popp",
  erpapp: "erpapp",
  epaapp: "epaapp",
};
const egk = (pinActive = true): AnyCard => ({
  kind: "egk",
  expires: "2027-01-01",
  pinActive,
});
const pin = (kind: "hba" | "smcb", unlocked = true): AnyCard => ({
  kind,
  expires: "2027-01-01",
  unlocked,
});

const CARDS: Record<string, AnyCard[]> = {
  kt: [egk(), pin("hba"), pin("smcb")],
  mkt: [egk(), pin("hba")],
  cardlink: [egk(false)],
  erpapp: [egk(false)],
};

// Praxis mit allen Geräten: alles hängt am Switch, Konnektor → Router → Internet → VPN → Zentrales Netz.
const lan = [
  "pvs",
  "kis",
  "avs",
  "pflege",
  "ris",
  "lis",
  "kimcm",
  "kt",
  "kon",
  "ap",
];
// Dritter Wert `true`: Kante „läuft auf“ (Software auf Rechner).
const links: [string, string, true?][] = [
  ...lan.map((n): [string, string] => ["sw", n]),
  ["pc", "pvs", true],
  ["sw", "srv"],
  ["srv", "kis", true],
  ["tab", "ap"],
  ["cardlink", "kon"],
  ["kon", "rt"],
  ["rt", "net"],
  ["net", "vpn"],
  ["vpn", "zn"],
  ["timc", "net"],
  ["erpapp", "net"],
  ["epaapp", "net"],
  ...["vsdm", "erp", "idp", "idpsek", "kim", "epa", "popp"].map(
    (s): [string, string] => ["zn", s],
  ),
  ...["erp", "idp", "idpsek", "epa", "tim", "popp"].map(
    (s): [string, string] => ["net", s],
  ),
];
const full = (): Topology => ({
  name: "t",
  description: "",
  simDate: "2026-11-01",
  zones: [],
  nodes: Object.entries(TYPES).map(([id, type]) => ({
    id,
    type,
    position: { x: 0, y: 0 },
    fault: false,
    ...(CARDS[id] ? { cards: CARDS[id] } : {}),
  })),
  edges: links.map(([a, b, host]) => ({
    id: `${a}-${b}`,
    fault: false,
    ends: [
      { node: a, port: host ? "soft" : "p" },
      { node: b, port: host ? "host" : "p" },
    ],
  })),
});

const without = (t: Topology, ...ids: string[]): Topology => ({
  ...t,
  nodes: t.nodes.filter((n) => !ids.includes(n.id)),
  edges: t.edges.filter((e) => e.ends.every((x) => !ids.includes(x.node))),
});
const faulty = (t: Topology, id: string): Topology => ({
  ...t,
  nodes: t.nodes.map((n) => (n.id === id ? { ...n, fault: true } : n)),
});
const edit = (t: Topology, id: string, f: (n: Node) => Node): Topology => ({
  ...t,
  nodes: t.nodes.map((n) => (n.id === id ? f(n) : n)),
});
const cards = (t: Topology, id: string, f: (c: AnyCard[]) => AnyCard[]) =>
  edit(t, id, (n) => ({ ...n, cards: f(n.cards ?? []) }));
const drop = (t: Topology, id: string, ...kinds: string[]) =>
  cards(t, id, (c) => c.filter((x) => !kinds.includes(x.kind)));

const state = (t: Topology, trigger: string, action: string) => {
  const node = t.nodes.find((n) => n.id === trigger) as Node;
  return availableActions(node, t, catalog).find((a) => a.id === action);
};

// Je Aktion: Auslöser, eine Störung und die erwartete Begründung (K-3, K-4, K-7 und Bausteine 6.1).
const cases: [
  action: string,
  trigger: string,
  break_: (t: Topology) => Topology,
  reason: string | RegExp,
][] = [
  [
    "erezept-ausstellen",
    "pvs",
    (t) => drop(t, "kt", "hba"),
    "Keine HBA gesteckt.",
  ],
  [
    "eau-senden",
    "pvs",
    (t) => without(t, "kimcm"),
    "KIM-Clientmodul fehlt in der Topologie.",
  ],
  [
    "earztbrief-kim",
    "ris",
    (t) =>
      cards(t, "kt", (c) =>
        c.map((x) => (x.kind === "hba" ? { ...x, unlocked: false } : x)),
      ),
    "HBA ist nicht freigeschaltet.",
  ],
  ["kim-senden", "pflege", (t) => faulty(t, "kim"), /ist ausgefallen/],
  [
    "eau-epa-hochladen",
    "pvs",
    (t) => without(t, "epa"),
    /fehlt in der Topologie/,
  ],
  [
    "befund-epa-hochladen",
    "lis",
    (t) =>
      cards(t, "kt", (c) =>
        c.map((x) => (x.kind === "smcb" ? { ...x, expires: "2026-01-01" } : x)),
      ),
    "SMC-B ist seit 01.01.2026 abgelaufen.",
  ],
  [
    "epa-medikationsliste-einsehen",
    "avs",
    (t) => without(t, "vsdm", "popp"),
    / Oder: /,
  ],
  [
    "notfalldaten-schreiben",
    "kt",
    (t) => drop(t, "kt", "egk"),
    "Keine eGK gesteckt.",
  ],
  [
    "erklaerungen-schreiben",
    "pvs",
    (t) => drop(t, "kt", "hba", "smcb"),
    / Oder: /,
  ],
  ["notfalldaten-lesen", "pvs", (t) => faulty(t, "kon"), /ist ausgefallen/],
  [
    "medikationsplan-schreiben",
    "pvs",
    (t) =>
      cards(t, "kt", (c) => c.map((x) => (x.kind === "egk" ? egk(false) : x))),
    MESSAGES.emp,
  ],
  ["medikationsplan-lesen", "kt", (t) => without(t, "kon"), /Kein Zugang/],
  [
    "medikationsplan-lesen-avs",
    "avs",
    (t) =>
      cards(t, "kt", (c) => c.map((x) => (x.kind === "egk" ? egk(false) : x))),
    MESSAGES.emp,
  ],
  ["vsdm-pruefen", "pvs", (t) => faulty(t, "vpn"), /ist ausgefallen/],
  [
    "erezept-einloesen-egk",
    "avs",
    (t) => without(t, "vsdm"),
    /fehlt in der Topologie/,
  ],
  [
    "erezept-einloesen-code",
    "avs",
    (t) => without(t, "idp"),
    /fehlt in der Topologie/,
  ],
  [
    "erezept-cardlink-einloesen",
    "avs",
    (t) => without(t, "cardlink"),
    /fehlt in der Topologie/,
  ],
  [
    "epa-dokument-pflege",
    "pflege",
    (t) =>
      cards(t, "kt", (c) =>
        c.map((x) => (x.kind === "smcb" ? { ...x, unlocked: false } : x)),
      ),
    "SMC-B ist nicht freigeschaltet.",
  ],
  ["mkt-egk-offline-einlesen", "mkt", (t) => drop(t, "mkt", "hba"), / Oder: /],
  [
    "mkt-daten-uebergeben",
    "mkt",
    (t) => without(t, "pvs", "kis", "avs", "pflege"),
    /fehlt in der Topologie/,
  ],
  [
    "cardlink-vsdm-pruefen",
    "cardlink",
    (t) => drop(t, "kt", "smcb"),
    "Keine SMC-B gesteckt.",
  ],
  ["tim-senden", "timc", (t) => faulty(t, "tim"), /ist ausgefallen/],
  [
    "erezept-app-abrufen",
    "erpapp",
    (t) => without(t, "erp"),
    /fehlt in der Topologie/,
  ],
  [
    "epa-app-ansehen",
    "epaapp",
    (t) => without(t, "idpsek"),
    /fehlt in der Topologie/,
  ],
];

describe("T-402 availableActions: je Aktion aktiv und ausgegraut", () => {
  it("deckt jede Katalogaktion ab", () => {
    expect(cases.map((c) => c[0]).sort()).toEqual(
      catalog.actions.map((a) => a.id).sort(),
    );
  });

  it.each(cases)("%s ist in der vollen Praxis aktiv", (action, trigger) => {
    expect(state(full(), trigger, action)).toMatchObject({ enabled: true });
  });

  it.each(cases)(
    "%s ist ausgegraut mit Begründung",
    (action, trigger, break_, reason) => {
      const s = state(break_(full()), trigger, action);
      expect(s?.enabled).toBe(false);
      if (typeof reason === "string") expect(s?.disabledReason).toBe(reason);
      else expect(s?.disabledReason).toMatch(reason);
    },
  );
});

describe("T-402 Pfad, Karten, Terminal", () => {
  it("K-3: abgelaufene Karte zählt als nicht gesteckt, Datum aus simDate", () => {
    const t = { ...full(), simDate: "2027-06-01" };
    expect(state(t, "pvs", "erezept-ausstellen")?.disabledReason).toBe(
      "HBA ist seit 01.01.2027 abgelaufen.",
    );
  });

  it("K-4: gesperrte SMC-B sperrt PIN-pflichtige Aktionen", () => {
    const t = cards(full(), "kt", (c) =>
      c.map((x) => (x.kind === "smcb" ? { ...x, unlocked: false } : x)),
    );
    expect(state(t, "pvs", "kim-senden")?.disabledReason).toBe(
      "SMC-B ist nicht freigeschaltet.",
    );
  });

  it("K-7: ohne eGK-PIN keine Medikationsplan-Aktion", () => {
    const t = cards(full(), "kt", (c) =>
      c.map((x) => (x.kind === "egk" ? egk(false) : x)),
    );
    expect(state(t, "kt", "medikationsplan-lesen")?.disabledReason).toBe(
      MESSAGES.emp,
    );
    expect(state(t, "kt", "notfalldaten-lesen")?.enabled).toBe(true);
  });

  it("Störung einer Kante unterbricht den Pfad", () => {
    const t = full();
    t.edges = t.edges.map((e) =>
      e.id === "net-vpn" ? { ...e, fault: true } : e,
    );
    expect(state(t, "pvs", "vsdm-pruefen")).toMatchObject({
      enabled: false,
      disabledReason: "Verbindung ist ausgefallen.",
    });
  });

  it("zwei Terminals ohne Zuordnung: Terminal wählen, mit Arbeitsplatz nicht", () => {
    let t = full();
    t = {
      ...t,
      nodes: [
        ...t.nodes,
        {
          id: "kt2",
          type: "kt",
          position: { x: 0, y: 0 },
          fault: false,
          cards: CARDS.kt,
        },
      ],
      edges: [
        ...t.edges,
        {
          id: "sw-kt2",
          fault: false,
          ends: [
            { node: "sw", port: "p" },
            { node: "kt2", port: "p" },
          ],
        },
      ],
    };
    expect(state(t, "pvs", "erezept-ausstellen")?.chooseTerminal).toEqual([
      "kt",
      "kt2",
    ]);
    t = edit(
      edit(t, "pvs", (n) => ({ ...n, config: { workplace: "AP-1" } })),
      "kt",
      (n) => ({ ...n, config: { workplace: "AP-1" } }),
    );
    const s = state(t, "pvs", "erezept-ausstellen");
    expect(s?.enabled).toBe(true);
    expect(s?.chooseTerminal).toBeUndefined();
  });

  it("Terminalwahl zählt nur Karten aus dem erfüllten any-Zweig", () => {
    // Befugnis über PoPP (kein VSDM): die eGK in zwei Terminals ist dafür egal.
    let t = without(full(), "vsdm");
    t = {
      ...t,
      nodes: [
        ...t.nodes,
        {
          id: "kt2",
          type: "kt",
          position: { x: 0, y: 0 },
          fault: false,
          cards: [egk()],
        },
      ],
      edges: [
        ...t.edges,
        {
          id: "sw-kt2",
          fault: false,
          ends: [
            { node: "sw", port: "p" },
            { node: "kt2", port: "p" },
          ],
        },
      ],
    };
    const s = state(t, "avs", "epa-medikationsliste-einsehen");
    expect(s?.enabled).toBe(true);
    expect(s?.chooseTerminal).toBeUndefined();
  });

  it("Karten auf verschiedene Terminals des Zugangs verteilt zählen zusammen (6.1)", () => {
    let t = drop(full(), "kt", "egk");
    t = {
      ...t,
      nodes: [
        ...t.nodes,
        {
          id: "kt2",
          type: "kt",
          position: { x: 0, y: 0 },
          fault: false,
          cards: [egk()],
        },
      ],
      edges: [
        ...t.edges,
        {
          id: "sw-kt2",
          fault: false,
          ends: [
            { node: "sw", port: "p" },
            { node: "kt2", port: "p" },
          ],
        },
      ],
    };
    const s = state(t, "pvs", "notfalldaten-lesen");
    expect(s?.enabled).toBe(true);
    expect(s?.chooseTerminal).toBeUndefined();
  });

  it("Preset praxis: Karten auf kt1 und kt2 verteilt, Aktionen am PVS aktiv", () => {
    const t = catalog.presets.find((p) => p.id === "praxis")
      ?.topology as Topology;
    const pvs = t.nodes.find((n) => n.type === "pvs") as Node;
    const byId = new Map(
      availableActions(pvs, t, catalog).map((a) => [a.id, a]),
    );
    expect(byId.get("vsdm-pruefen")?.enabled).toBe(true);
    expect(byId.get("notfalldaten-lesen")?.enabled).toBe(true);
  });

  it("6.0 Issue #70: Menü und Player wählen dasselbe Terminal (Preset praxis, E-Rezept ausstellen)", () => {
    const t = catalog.presets.find((p) => p.id === "praxis")
      ?.topology as Topology;
    const pvs = t.nodes.find((n) => n.type === "pvs") as Node;
    const a = availableActions(pvs, t, catalog).find(
      (x) => x.id === "erezept-ausstellen",
    );
    const action = catalog.actions.find((x) => x.id === "erezept-ausstellen");
    const flow = catalog.flows.find((f) => f.id === action?.flow) as never;
    expect(a?.chooseTerminal).toBeUndefined();
    const steps = bindFlow(flow, pvs, t, catalog, a?.terminal);
    expect(steps.map((s) => s.problem?.kind)).not.toContain("terminal-waehlen");
  });

  it("6.0 Issue #70: Karten in verschiedenen Terminals binden kein Terminal vor", () => {
    const base = catalog.presets.find((p) => p.id === "praxis")
      ?.topology as Topology;
    const pvs = base.nodes.find((n) => n.type === "pvs") as Node;
    const all = base.nodes.flatMap((n) => n.cards ?? []);
    const hba = all.find((c) => c.kind === "hba") as AnyCard;
    const smcb = all.find((c) => c.kind === "smcb") as AnyCard;
    const [k1, k2] = base.nodes.filter((n) => n.type === "kt");
    let t = base;
    for (const n of [k1, k2]) t = drop(t, n?.id ?? "", "hba", "smcb");
    t = cards(t, k1?.id ?? "", (c) => [...c, hba]);
    t = cards(t, k2?.id ?? "", (c) => [...c, smcb]);
    const a = state(t, pvs.id, "erezept-ausstellen");
    expect(a?.enabled).toBe(true);
    expect(a?.terminal).toBeUndefined();
    expect(a?.chooseTerminal).toBeUndefined();
  });

  it("PC und Tablet bieten die Aktionen ihrer Software an", () => {
    const ids = (t: Topology, n: string) =>
      availableActions(t.nodes.find((x) => x.id === n) as Node, t, catalog).map(
        (a) => a.id,
      );
    expect(ids(full(), "pc")).toContain("erezept-ausstellen");
    expect(ids(full(), "pc")).not.toContain("erezept-einloesen-code");
    expect(ids(full(), "tab")).toContain("erezept-ausstellen");
    // PC und PVS hängen am Switch: ein ausgefallenes PVS nimmt dem PC die Aktionen.
    const viaSwitch = faulty(
      {
        ...without(full(), "kis", "avs"),
        edges: [
          ...without(full(), "kis", "avs").edges,
          {
            id: "pc-sw",
            fault: false,
            ends: [
              { node: "pc", port: "p" },
              { node: "sw", port: "p" },
            ],
          },
        ],
      },
      "pvs",
    );
    expect(ids(viaSwitch, "pc")).not.toContain("erezept-ausstellen");
    expect(ids(without(full(), "pvs", "kis", "avs"), "pc")).toEqual([]);
  });
});
