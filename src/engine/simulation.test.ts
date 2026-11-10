import { describe, expect, it } from "vitest";
import type { AnyCard, Node, Topology } from "../schema";
import { loadCatalog } from "../schema/loadCatalog";
import {
  IDLE,
  bindFlow,
  simStep,
  stepDelayMs,
  type Sim,
  type SimEvent,
} from "./simulation";

const catalog = loadCatalog();

// Alle Geräte, Knoten-ID = Typ-ID: Konnektor → Router → Internet → VPN → Zentrales Netz.
const card = (kind: "egk" | "hba" | "smcb"): AnyCard =>
  kind === "egk"
    ? { kind, expires: "2027-01-01", pinActive: true }
    : { kind, expires: "2027-01-01", unlocked: true };
const TYPES = [
  ...["pvs", "avs", "kimcm", "kt", "kon", "mkt", "cardlink", "timc"],
  ...["erpapp", "epaapp", "switch", "router", "internet", "vpn", "zentral"],
  ...["vsdm", "erp", "idp", "idpsek", "kim", "epa", "tim", "vzd", "kk"],
];
const LINKS: [string, string][] = [
  ...["pvs", "avs", "kimcm", "kt", "kon"].map((n): [string, string] => [
    "switch",
    n,
  ]),
  ["mkt", "pvs"],
  ["cardlink", "kon"],
  ["kon", "router"],
  ["router", "internet"],
  ["internet", "vpn"],
  ["vpn", "zentral"],
  ["timc", "internet"],
  ["erpapp", "internet"],
  ["epaapp", "internet"],
  ["internet", "tim"],
  ["internet", "erp"],
  ["internet", "idpsek"],
  ["internet", "epa"],
  ...["vsdm", "erp", "idp", "kim", "epa", "vzd", "kk"].map(
    (s): [string, string] => ["zentral", s],
  ),
];
const build = (skip: string[] = []): Topology => ({
  name: "t",
  description: "",
  simDate: "2026-11-01",
  zones: [],
  nodes: TYPES.filter((id) => !skip.includes(id)).map((id) => ({
    id,
    type: id,
    position: { x: 0, y: 0 },
    fault: false,
    ...(id === "kt" ? { cards: [card("egk"), card("hba"), card("smcb")] } : {}),
  })),
  edges: LINKS.filter(([a, b]) => ![a, b].some((x) => skip.includes(x))).map(
    ([a, b]) => ({
      id: `${a}-${b}`,
      fault: false,
      ends: [
        { node: a, port: "p" },
        { node: b, port: "p" },
      ],
    }),
  ),
});

const bind = (flow: string, trigger: string, t = build()) =>
  bindFlow(
    catalog.flows.find((f) => f.id === flow) as never,
    t.nodes.find((n) => n.id === trigger) as Node,
    t,
    catalog,
  );

const TRIGGER: Record<string, string> = {
  tim: "timc",
  erezeptEinloesen: "avs",
  erezeptEinloesenCode: "avs",
  cardlinkErp: "avs",
  cardlinkVsdm: "cardlink",
  mobkt: "mkt",
  appErezept: "erpapp",
  appEpa: "epaapp",
};
const ROLE: Record<string, string> = { K: "kon", T: "kt" };
// Regelwerk 6.0 kennt hier keinen Weg: Krankenkasse (zweimal) und CardLink↔Smartphone laufen außerhalb der Pfadregel.
const NO_PATH = new Set([
  "tim:1",
  "tim:2",
  "eau:4",
  "eau:5",
  "cardlinkErp:1",
  "cardlinkVsdm:1",
]);

describe("bindFlow (Regelwerk 7, FR-8)", () => {
  it.each(catalog.flows.map((f) => f.id))(
    "Ablauf %s: Schrittfolge und Enden entsprechen dem Katalog",
    (id) => {
      const flow = catalog.flows.find((f) => f.id === id);
      const trigger = TRIGGER[id] ?? "pvs";
      const bound = bind(id, trigger);
      expect(bound.map((s) => s.label)).toEqual(
        flow?.steps.map((s) => s.label),
      );
      const node = (r: string) => (r === "P" ? trigger : (ROLE[r] ?? r));
      flow?.steps.forEach((s, i) => {
        const nodes = bound[i]?.nodes ?? [];
        if (NO_PATH.has(`${id}:${String(i)}`)) {
          expect(nodes).toEqual([]);
          return;
        }
        expect([nodes[0], nodes.at(-1)], `${id} Schritt ${String(i)}`).toEqual([
          node(s.from),
          node(s.to),
        ]);
      });
    },
  );

  it("tim: Empfängerseite liegt außerhalb der Topologie, ohne Problem", () => {
    const steps = bind("tim", "timc");
    expect(steps[1]).toEqual(expect.objectContaining({ nodes: [] }));
    expect(steps[2]?.problem).toBeUndefined();
    expect(steps[0]?.nodes).toEqual(["timc", "internet", "tim"]);
  });

  it("Ablauf appEpa: ePA-App erreicht das Aktensystem", () => {
    expect(bind("appEpa", "epaapp", build(["erpapp"]))[1]?.nodes.at(-1)).toBe(
      "epa",
    );
  });

  it("P→IDP läuft über Zugang und VPN-Zugangsdienst (6.0)", () => {
    const step = bind("erezept", "pvs")[4];
    expect(step?.nodes).toContain("kon");
    expect(step?.nodes).toContain("vpn");
    expect(step?.edges).toHaveLength((step?.nodes.length ?? 0) - 1);
  });

  it.each(["notfalldaten", "emp"])(
    "Ablauf %s läuft ohne VPN und Fachdienst",
    (id) => {
      const t = build(["vpn", "zentral", "vsdm", "erp", "idp", "epa", "kim"]);
      const nodes = bind(id, "pvs", t).flatMap((s) => s.nodes);
      expect(nodes.length).toBeGreaterThan(0);
      for (const n of nodes)
        expect(["pvs", "switch", "kon", "kt"]).toContain(n);
    },
  );

  it("mehrere Terminals ohne Wahl: T bleibt ungebunden, mit Wahl gebunden", () => {
    const t = build();
    const two: Topology = {
      ...t,
      nodes: [
        ...t.nodes,
        { ...(t.nodes.find((n) => n.id === "kt") as Node), id: "kt2" },
      ],
      edges: [
        ...t.edges,
        {
          id: "sw-kt2",
          fault: false,
          ends: [
            { node: "switch", port: "p" },
            { node: "kt2", port: "p" },
          ],
        },
      ],
    };
    const flow = catalog.flows.find((f) => f.id === "notfalldaten") as never;
    const pvs = two.nodes.find((n) => n.id === "pvs") as Node;
    expect(bindFlow(flow, pvs, two, catalog)[1]?.nodes).toEqual([]);
    expect(bindFlow(flow, pvs, two, catalog, "kt2")[1]?.nodes.at(-1)).toBe(
      "kt2",
    );
  });

  it("Störung auf dem Weg: Schritt ohne Pfad statt erfundener Kante", () => {
    const t = build();
    const down: Topology = {
      ...t,
      nodes: t.nodes.map((n) => (n.id === "vpn" ? { ...n, fault: true } : n)),
    };
    expect(bind("erezept", "pvs", down)[4]).toMatchObject({
      nodes: [],
      problem: { kind: "ausgefallen", at: "vpn" },
    });
  });

  it("fehlendes Gerät: Schritt ohne Pfad statt Absturz", () => {
    expect(bind("erezept", "pvs", build(["erp"])).at(-1)).toMatchObject({
      nodes: [],
      problem: { kind: "fehlt" },
    });
  });
});

describe("Zustandsautomat (FR-9, FR-10)", () => {
  const run = (...evs: SimEvent[]) =>
    evs.reduce<Sim>((s, e) => simStep(s, e, 3), IDLE);

  it("läuft von idle über running und paused bis done", () => {
    expect(run("start")).toMatchObject({ status: "running", step: 0 });
    expect(run("start", "pause")).toMatchObject({ status: "paused" });
    expect(run("start", "pause", "resume")).toMatchObject({
      status: "running",
    });
    expect(run("start", "next", "next")).toMatchObject({
      step: 2,
      status: "running",
    });
    expect(run("start", "next", "next", "next")).toMatchObject({
      status: "done",
      step: 2,
    });
  });

  it("Schritt zurück bleibt bei 0 und öffnet done wieder", () => {
    expect(run("start", "prev")).toMatchObject({ step: 0 });
    expect(run("start", "next", "prev")).toMatchObject({ step: 0 });
    expect(run("start", "next", "next", "next", "prev")).toMatchObject({
      status: "paused",
      step: 2,
    });
  });

  it("Tempo ändert die Verweildauer", () => {
    expect(run({ tempo: 2 }).tempo).toBe(2);
    expect(stepDelayMs(2)).toBeLessThan(stepDelayMs(0.5));
  });

  it.each<[string, SimEvent[]]>([
    ["idle", []],
    ["running", ["start"]],
    ["paused", ["start", "pause"]],
    ["done", ["start", "next", "next", "next"]],
    ["cancelled", ["cancel"]],
  ])("Abbrechen aus %s führt nach cancelled", (_, evs) => {
    expect(run(...evs, "cancel").status).toBe("cancelled");
  });

  it("cancelled ist endgültig", () => {
    expect(run("cancel", "start", "resume", "next").status).toBe("cancelled");
  });
});
