import { describe, expect, it } from "vitest";
import {
  loadCatalog,
  type Catalog,
  type Selector,
  type Topology,
} from "../schema";
import { MESSAGES, autoPorts, isWlan, validateConnection } from "./rules";

const catalog = loadCatalog();

const node = (id: string, type: string) => ({
  id,
  type,
  fault: false,
  position: { x: 0, y: 0 },
});
type Link = [edge: string, a: string, pa: string, b: string, pb: string];
const topo = (nodes: [string, string][], links: Link[] = []): Topology => ({
  name: "t",
  description: "",
  simDate: "2026-11-01",
  nodes: nodes.map(([id, type]) => node(id, type)),
  edges: links.map(([id, a, pa, b, pb]) => ({
    id,
    ends: [
      { node: a, port: pa },
      { node: b, port: pb },
    ],
    fault: false,
  })),
  zones: [],
});
const check = (t: Topology, a: string, b: string, c: Catalog = catalog) =>
  validateConnection(t, a, undefined, b, undefined, c);
const pair = (x: string, y: string) =>
  topo([
    ["x", x],
    ["y", y],
  ]);
const msg = (id: string) =>
  [
    ...catalog.baseChecks,
    ...catalog.reasonRules,
    ...catalog.exclusionRules,
  ].find((r) => r.id === id) as { message: string };

const placeable = catalog.deviceTypes.filter((t) => t.placeable);
const members = (s: Selector) =>
  new Set(
    "types" in s
      ? s.types
      : placeable
          .filter((t) => t.capabilities.includes(s.capability))
          .map((t) => t.id),
  );
const covers = (a: Selector, b: Selector, x: string, y: string) =>
  (members(a).has(x) && members(b).has(y)) ||
  (members(a).has(y) && members(b).has(x));

describe("Regel-Engine: Grundprüfungen und Ausschlüsse (T-105)", () => {
  it("[G-1] ein Gerät lässt sich nicht mit sich selbst verbinden", () => {
    const t = topo([["p", "pvs"]]);
    expect(check(t, "p", "p")).toEqual({
      ok: false,
      reason: msg("G-1").message,
      ruleId: "G-1",
    });
  });

  it("[G-2] zwei Geräte lassen sich nur einmal verbinden", () => {
    const t = topo(
      [
        ["p", "pvs"],
        ["s", "switch"],
      ],
      [["e1", "p", "eth0", "s", "p1"]],
    );
    const r = check(t, "s", "p");
    expect(r).toMatchObject({ ok: false, ruleId: "G-2" });
    expect(r.reason).toBe(msg("G-2").message);
  });

  it("[G-3] ohne freien verträglichen Anschluss nennt die Meldung das Gerät", () => {
    const t = topo(
      [
        ["p", "pvs"],
        ["s", "switch"],
        ["r", "router"],
      ],
      [["e1", "p", "eth0", "s", "p1"]],
    );
    const r = check(t, "p", "r");
    expect(r).toMatchObject({ ok: false, ruleId: "G-3" });
    expect(r.reason).toBe(
      msg("G-3").message.replace(
        "‹Gerät›",
        catalog.deviceTypes.find((d) => d.id === "pvs")?.name ?? "",
      ),
    );
  });

  it("[G-3] Router mit belegten LAN-Anschlüssen bleibt für ein KT nur der WAN-Anschluss: abgelehnt", () => {
    const sw = (i: number): [string, string] => [`s${String(i)}`, "switch"];
    const t = topo(
      [["k", "kt"], ["r", "router"], sw(1), sw(2), sw(3), sw(4)],
      [1, 2, 3, 4].map((i): Link => {
        const n = String(i);
        return [`e${n}`, "r", `lan${n}`, `s${n}`, "p1"];
      }),
    );
    const r = check(t, "k", "r");
    expect(r).toMatchObject({ ok: false, ruleId: "G-3" });
    expect(r.reason).toContain("Router");
  });

  it("[G-3] ein genannter Anschluss muss existieren, frei und verträglich sein", () => {
    const t = topo(
      [
        ["p", "pvs"],
        ["s", "switch"],
        ["q", "pvs"],
      ],
      [["e1", "s", "p1", "q", "eth0"]],
    );
    const go = (pa?: string, pb?: string) =>
      validateConnection(t, "p", pa, "s", pb, catalog);
    expect(go("eth0", "p2").ok).toBe(true);
    expect(go("nix", "p2").reason).toBe(MESSAGES.noPort);
    expect(go("eth0", "nix").reason).toBe(MESSAGES.noPort);
    expect(go("eth0", "p1")).toMatchObject({ ok: false, ruleId: "G-3" });
    expect(go("usb0", "p2")).toMatchObject({ ok: false, ruleId: "G-3" });
  });

  it("[G-3] Anschlüsse mit „mehrfach“ bleiben trotz Kante frei", () => {
    const t = topo(
      [
        ["p", "pvs"],
        ["k", "kon"],
        ["q", "kis"],
      ],
      [["e1", "q", "eth0", "k", "lan"]],
    );
    expect(check(t, "p", "k").ok).toBe(true);
  });

  it("[G-4] ein Kartenterminal arbeitet nur mit einem Zugang zusammen", () => {
    const t = topo(
      [
        ["kt", "kt"],
        ["k1", "kon"],
        ["k2", "hskon"],
        ["pv", "pvs"],
      ],
      [["e1", "kt", "lan0", "k1", "lan"]],
    );
    const r = check(t, "kt", "k2");
    expect(r).toMatchObject({ ok: false, ruleId: "G-4" });
    expect(r.reason).toBe(msg("G-4").message);
    // ein Nachbar, der kein Zugang ist, löst G-4 nicht aus (hier fehlt nur der Anschluss)
    const t2 = topo(
      [
        ["kt", "kt"],
        ["s", "switch"],
        ["k2", "kon"],
      ],
      [["e1", "kt", "lan0", "s", "p1"]],
    );
    expect(check(t2, "kt", "k2").ruleId).toBe("G-3");
    expect(check(t, "kt", "k1").ruleId).toBe("G-2");
    expect(check(t, "pv", "k2").ok).toBe(true);
  });

  it("[X-1] Konnektor und TI-Gateway nicht in derselben Topologie", () => {
    const t = topo([
      ["k", "kon"],
      ["g", "gateway"],
      ["p", "pvs"],
    ]);
    for (const [a, b] of [
      ["p", "k"],
      ["g", "p"],
    ] as const)
      expect(check(t, a, b)).toEqual({
        ok: false,
        reason: msg("X-1").message,
        ruleId: "X-1",
      });
    // ohne Gegenstück bleibt der Konnektor verbindbar
    expect(
      check(
        topo([
          ["k", "kon"],
          ["p", "pvs"],
        ]),
        "p",
        "k",
      ).ok,
    ).toBe(true);
  });

  it("unbekannte Geräte werden abgelehnt", () => {
    const t = topo([["p", "pvs"]]);
    expect(check(t, "p", "nix").reason).toBe(MESSAGES.notFound);
    expect(check(t, "nix", "p").reason).toBe(MESSAGES.notFound);
  });
});

describe("Regel-Engine: Begründungsregeln (T-105)", () => {
  const cases: [id: string, a: string, b: string][] = [
    ["V-4", "pvs", "vsdm"],
    ["V-5", "kt", "erp"],
    ["V-6", "pvs", "kis"],
    ["V-7", "switch", "erp"],
    ["V-8", "switch", "internet"],
    ["V-9", "erp", "kim"],
    ["V-10", "kon", "gateway"],
    ["V-12", "pvs", "vpn"],
    ["V-14", "mkt", "switch"],
    ["V-15", "erpapp", "pvs"],
    ["V-16", "dns", "switch"],
    ["V-17", "kon", "hskon"],
    ["V-18", "kt", "mkt"],
    ["V-19", "tim", "vpn"],
    ["V-20", "router", "router"],
  ];

  it.each(cases)(
    "[%s] %s an %s wird mit der Regelmeldung abgelehnt",
    (id, a, b) => {
      for (const [x, y] of [
        [a, b],
        [b, a],
      ] as const) {
        expect(check(pair(x, y), "x", "y")).toEqual({
          ok: false,
          reason: msg(id).message,
          ruleId: id,
        });
      }
    },
  );

  it("[V-6] die erlaubten Primärsystem-Paare sind ausgenommen", () => {
    expect(check(pair("pc", "kis"), "x", "y").ok).toBe(true);
    expect(check(pair("lis", "kis"), "x", "y").ok).toBe(true);
    expect(check(pair("pc", "ris"), "x", "y").ruleId).toBe("V-6");
  });

  it("[V-17] Konnektor an Gateway gehört zu V-10, nicht zu V-17", () => {
    expect(check(pair("hskon", "gateway"), "x", "y").ruleId).toBe("V-10");
  });

  it("ohne Begründungsregel nennt die Meldung die erlaubten Partner", () => {
    const r = check(pair("kk", "pvs"), "x", "y");
    expect(r.ok).toBe(false);
    expect(r.ruleId).toBeUndefined();
    const kim = catalog.deviceTypes.find((t) => t.id === "kim")?.name ?? "";
    expect(r.reason).toMatch(/^Diese Verbindung gibt es in der TI nicht\. /);
    expect(r.reason).toContain(`kann verbunden werden mit: ${kim}.`);
  });

  it("ohne Begründungsregel und ohne Partner sagt die Meldung das", () => {
    const r = check(pair("egk", "pvs"), "x", "y");
    expect(r.reason).toContain(MESSAGES.noPartner);
  });
});

describe("Regel-Engine: Erlaubnisliste (T-105)", () => {
  // Offene Frage (siehe PR T-105): Regelwerk 4.2 erlaubt Mobiles KT – KIS per
  // USB, das KIS hat nach 2.2 aber nur LAN-Anschlüsse. T-108 (A-5) deckt das auf.
  const gap = (x: string, y: string) => x === "mkt" && y === "kis";
  const allowed = catalog.connectionRules.flatMap((rule) =>
    placeable.flatMap((x) =>
      placeable
        .filter(
          (y) =>
            members(rule.a).has(x.id) &&
            members(rule.b).has(y.id) &&
            !gap(x.id, y.id),
        )
        .map((y) => ({ rule: rule.id, x: x.id, y: y.id })),
    ),
  );

  it.each(allowed)(
    "[$rule] $x – $y ist gültig, in beide Richtungen",
    ({ x, y }) => {
      for (const [p, q] of [
        [x, y],
        [y, x],
      ] as const) {
        const r = check(pair(p, q), "x", "y");
        expect(r.ok, r.reason).toBe(true);
        expect(r.reason).toBeUndefined();
        const rule = catalog.connectionRules.find((c) => c.id === r.ruleId);
        expect(rule && covers(rule.a, rule.b, x, y)).toBe(true);
      }
    },
  );

  it("offene Frage: Mobiles KT – KIS ist erlaubt, scheitert aber am fehlenden USB-Anschluss", () => {
    expect(check(pair("mkt", "kis"), "x", "y")).toMatchObject({
      ok: false,
      ruleId: "G-3",
    });
  });

  it("Konsistenz: keine Begründungsregel erfasst ein erlaubtes Paar", () => {
    for (const x of placeable)
      for (const y of placeable) {
        const ok = catalog.connectionRules.some((r) =>
          covers(r.a, r.b, x.id, y.id),
        );
        if (!ok) continue;
        for (const r of catalog.reasonRules) {
          const hit =
            covers(r.a, r.b, x.id, y.id) &&
            !r.except?.some((e) => covers(e.a, e.b, x.id, y.id));
          expect(hit, `${r.id}: ${x.id}/${y.id}`).toBe(false);
        }
      }
  });

  it("Ungerichtet (D15): beide Richtungen liefern dasselbe Ergebnis", () => {
    for (const x of placeable)
      for (const y of placeable) {
        const fwd = check(pair(x.id, y.id), "x", "y");
        const back = check(pair(y.id, x.id), "y", "x");
        expect(fwd).toEqual(back);
      }
  });

  it("Switch–Firewall steht doppelt: es gilt die Regel mit dem stärkeren Status", () => {
    const sw = catalog.connectionRules.find((r) => r.id === "erl-switch-lan");
    const fw = catalog.connectionRules.find((r) => r.id === "erl-fw-lan");
    expect([sw?.status, fw?.status]).toEqual(["plausibel", "bestätigt"]);
    for (const [x, y] of [
      ["switch", "fw"],
      ["fw", "switch"],
    ] as const)
      expect(check(pair(x, y), "x", "y")).toEqual({
        ok: true,
        ruleId: "erl-fw-lan",
      });
  });

  it("bei gleichem Status gilt die erste Regel im Katalog", () => {
    const c = structuredClone(catalog);
    const sw = c.connectionRules.find((r) => r.id === "erl-switch-lan");
    const fw = c.connectionRules.find((r) => r.id === "erl-fw-lan");
    if (sw && fw) fw.status = sw.status;
    expect(check(pair("switch", "fw"), "x", "y", c).ruleId).toBe(
      "erl-switch-lan",
    );
  });
});

describe("Regel-Engine: Anschlussarten der Erlaubnisliste (T-105)", () => {
  const go = (
    a: string,
    pa: string | undefined,
    b: string,
    pb: string | undefined,
  ) => validateConnection(pair(a, b), "x", pa, "y", pb, catalog);

  it("KT, Primärsystem und Switch hängen am Router-LAN, nicht am WAN", () => {
    expect(go("kt", "lan0", "router", "lan1").ok).toBe(true);
    expect(go("kt", "lan0", "router", "wan")).toMatchObject({
      ok: false,
      ruleId: "G-3",
    });
    expect(go("pvs", "eth0", "router", "wan").ok).toBe(false);
    expect(go("switch", "p1", "router", "wan").ok).toBe(false);
    expect(go("fw", "lan", "router", "wan").ok).toBe(false);
    expect(go("fw", "wan", "router", "lan2").ok).toBe(true);
  });

  it("Zugang verbindet mit seinem WAN-Anschluss und dem Router-LAN", () => {
    expect(go("kon", "wan", "router", "lan1").ok).toBe(true);
    expect(go("kon", "lan", "router", "lan1").ok).toBe(false);
    expect(go("router", "lan1", "hskon", "wan").ok).toBe(true);
    expect(go("kon", "wan", "router", "wan").ok).toBe(false);
  });

  it("Router-WAN führt ins Internet, das Tablet hängt am WLAN", () => {
    expect(go("router", "wan", "internet", "netz").ok).toBe(true);
    expect(go("router", "lan1", "internet", "netz").ok).toBe(false);
    expect(go("tab", "wlan0", "router", "wlan").ok).toBe(true);
    expect(go("tab", "wlan0", "ap", "wlan").ok).toBe(true);
  });
});

describe("autoPorts (A-3)", () => {
  it("[A-3] wählt das erste freie verträgliche Anschlusspaar", () => {
    const t = pair("kt", "router");
    expect(autoPorts(t, "x", "y", catalog)).toEqual({ a: "lan0", b: "lan1" });
    expect(autoPorts(t, "y", "x", catalog)).toEqual({ a: "lan1", b: "lan0" });
  });

  it("[A-3] überspringt belegte Anschlüsse", () => {
    const t = topo(
      [
        ["x", "pvs"],
        ["y", "switch"],
        ["z", "pvs"],
      ],
      [["e1", "y", "p1", "z", "eth0"]],
    );
    expect(autoPorts(t, "x", "y", catalog)).toEqual({ a: "eth0", b: "p2" });
  });

  it("[A-3] liefert nichts ohne freies Paar oder bekanntes Gerät", () => {
    const t = topo(
      [
        ["x", "pvs"],
        ["y", "switch"],
        ["z", "switch"],
      ],
      [["e1", "x", "eth0", "z", "p1"]],
    );
    expect(autoPorts(t, "x", "y", catalog)).toBeUndefined();
    expect(autoPorts(t, "x", "nix", catalog)).toBeUndefined();
    expect(autoPorts(t, "nix", "x", catalog)).toBeUndefined();
    expect(autoPorts(pair("pvs", "vsdm"), "x", "y", catalog)).toBeUndefined();
  });

  it("[A-3] Konnektor-LAN ist mehrfach und bleibt wählbar", () => {
    const t = topo(
      [
        ["x", "pvs"],
        ["y", "kon"],
        ["z", "kis"],
      ],
      [["e1", "y", "lan", "z", "eth0"]],
    );
    expect(autoPorts(t, "x", "y", catalog)).toEqual({ a: "eth0", b: "lan" });
  });
});

describe("WLAN-Erkennung (A-4)", () => {
  const t = topo(
    [
      ["tab", "tab"],
      ["ap", "ap"],
      ["pv", "pvs"],
      ["s", "switch"],
    ],
    [
      ["w", "tab", "wlan0", "ap", "wlan"],
      ["c", "pv", "eth0", "s", "p1"],
      ["u", "tab", "usb0", "gone", "x"],
    ],
  );
  const edge = (id: string) =>
    t.edges.find((e) => e.id === id) as Topology["edges"][number];

  it("[A-4] eine Verbindung über wifi ist eine WLAN-Verbindung", () => {
    expect(isWlan(edge("w"), t, catalog)).toBe(true);
  });

  it("[A-4] Kabel- und unbekannte Verbindungen sind keine", () => {
    expect(isWlan(edge("c"), t, catalog)).toBe(false);
    expect(isWlan(edge("u"), t, catalog)).toBe(false);
  });
});
