import { describe, expect, it } from "vitest";
import { loadCatalog, type Topology } from "../schema";
import { runChecks } from "./checks";

const catalog = loadCatalog();

type N = Topology["nodes"][number];
const node = (id: string, type: string, config?: N["config"]): N => ({
  id,
  type,
  fault: false,
  position: { x: 0, y: 0 },
  ...(config ? { config } : {}),
});
const edge = (id: string, a: string, b: string) => ({
  id,
  fault: false,
  ends: [
    { node: a, port: "p" },
    { node: b, port: "p" },
  ] as [{ node: string; port: string }, { node: string; port: string }],
});

const MASK = "255.255.255.0";
/** Praxis mit IPs: Router .1, Konnektor .2, PC .10, KT .11. */
const addressed = (): Topology => ({
  name: "t",
  description: "",
  simDate: "2026-11-01",
  zones: [],
  nodes: [
    node("pc", "pc", {
      ip: "192.168.10.10",
      mask: MASK,
      gateway: "192.168.10.2",
    }),
    node("kt", "kt", { ip: "192.168.10.11", mask: MASK, pairedWith: "kon" }),
    node("sw", "switch"),
    node("kon", "kon", { ip: "192.168.10.2", mask: MASK }),
    node("rt", "router", { ip: "192.168.10.1", mask: MASK }),
    node("vpn", "vpn"),
  ],
  edges: [
    edge("e1", "pc", "sw"),
    edge("e2", "kt", "sw"),
    edge("e3", "sw", "kon"),
    edge("e4", "kon", "rt"),
    edge("e5", "rt", "vpn"),
  ],
});
/** Setzt Konfigfelder am Knoten `id`. */
const withCfg = (id: string, cfg: Record<string, string>) => {
  const t = addressed();
  t.nodes = t.nodes.map((n) =>
    n.id === id ? { ...n, config: { ...n.config, ...cfg } } : n,
  );
  return t;
};
const only = (
  t: Topology,
  id: string,
  mode: "simple" | "advanced" = "advanced",
) => runChecks(t, mode, catalog).filter((f) => f.id === id);
const nodesOf = (t: Topology, id: string) => only(t, id).map((f) => f.nodes);

describe("Adressierung P-8 bis P-15", () => {
  it("[P-8] ungültige IP meldet, gültige nicht", () => {
    for (const bad of ["999.1.1.1", "1.2.3", "a.b.c.d", "01.2.3.4", ""])
      expect(nodesOf(withCfg("pc", { ip: bad }), "P-8")).toEqual([["pc"]]);
    expect(only(addressed(), "P-8")).toEqual([]);
  });

  it("[P-9] gleiche IP meldet beide Geräte einmal, verschiedene nicht", () => {
    expect(nodesOf(withCfg("kt", { ip: "192.168.10.10" }), "P-9")).toEqual([
      ["kt", "pc"],
    ]);
    expect(only(addressed(), "P-9")).toEqual([]);
  });

  it("[P-9] ungültige IPs gelten nicht als Konflikt (P-8)", () => {
    const t = withCfg("kt", { ip: "x" });
    t.nodes = t.nodes.map((n) =>
      n.id === "pc" ? { ...n, config: { ip: "x" } } : n,
    );
    expect(only(t, "P-9")).toEqual([]);
  });

  it("[P-10] Lücke, /0, /32 und Unsinn melden, /24 und /16 nicht", () => {
    for (const bad of ["255.0.255.0", "0.0.0.0", "255.255.255.255", "abc"])
      expect(nodesOf(withCfg("pc", { mask: bad }), "P-10")).toEqual([["pc"]]);
    expect(only(withCfg("pc", { mask: "255.255.0.0" }), "P-10")).toEqual([]);
    expect(only(addressed(), "P-10")).toEqual([]);
  });

  it("[P-11] Netz- und Broadcastadresse melden, Hostadresse nicht", () => {
    expect(only(withCfg("kt", { ip: "192.168.10.0" }), "P-11")).toHaveLength(1);
    expect(only(withCfg("kt", { ip: "192.168.10.255" }), "P-11")).toHaveLength(
      1,
    );
    const wide = { mask: "255.255.254.0" };
    expect(
      only(withCfg("kt", { ip: "192.168.11.255", ...wide }), "P-11"),
    ).toHaveLength(1);
    expect(
      only(withCfg("kt", { ip: "192.168.10.255", ...wide }), "P-11"),
    ).toEqual([]);
    expect(only(addressed(), "P-11")).toEqual([]);
  });

  it("[P-11] ohne Maske gilt der Standard /24", () => {
    const t = addressed();
    t.nodes = t.nodes.map((n) =>
      n.id === "kt" ? { ...n, config: { ip: "192.168.10.255" } } : n,
    );
    expect(only(t, "P-11")).toHaveLength(1);
  });

  it("[P-12] ungültiges Gateway meldet, gültiges oder fehlendes nicht", () => {
    expect(nodesOf(withCfg("pc", { gateway: "192.168.10" }), "P-12")).toEqual([
      ["pc"],
    ]);
    expect(only(addressed(), "P-12")).toEqual([]);
  });

  it("[P-13] Gateway außerhalb des eigenen Subnetzes meldet, innerhalb nicht", () => {
    expect(nodesOf(withCfg("pc", { gateway: "10.0.0.1" }), "P-13")).toEqual([
      ["pc"],
    ]);
    expect(only(addressed(), "P-13")).toEqual([]);
  });

  it("[P-13] ungültige Werte meldet P-8/P-12, nicht P-13", () => {
    expect(only(withCfg("pc", { gateway: "x" }), "P-13")).toEqual([]);
    expect(
      only(withCfg("pc", { ip: "x", gateway: "10.0.0.1" }), "P-13"),
    ).toEqual([]);
  });

  it("[P-14] Gateway ohne Gerät mit dieser IP meldet, vorhandenes nicht", () => {
    expect(
      nodesOf(withCfg("pc", { gateway: "192.168.10.99" }), "P-14"),
    ).toEqual([["pc"]]);
    expect(only(addressed(), "P-14")).toEqual([]);
  });

  it("[P-14] das eigene Gerät zählt nicht als Gateway", () => {
    expect(
      only(withCfg("pc", { gateway: "192.168.10.10" }), "P-14"),
    ).toHaveLength(1);
  });

  it("[P-15] Client in anderem Subnetz als der Zugang meldet Gerät und Zugang", () => {
    const t = withCfg("pc", { ip: "192.168.20.10", gateway: "192.168.20.1" });
    expect(nodesOf(t, "P-15")).toEqual([["kon", "pc"]]);
  });

  it("[P-15] Kartenterminal zählt, gleiches Subnetz nicht", () => {
    expect(nodesOf(withCfg("kt", { ip: "10.1.1.11" }), "P-15")).toEqual([
      ["kon", "kt"],
    ]);
    expect(only(addressed(), "P-15")).toEqual([]);
  });

  it("[P-15] /16-Maske am Client reicht, solange die IP im Netz des Zugangs liegt", () => {
    expect(only(withCfg("pc", { mask: "255.255.0.0" }), "P-15")).toEqual([]);
  });

  it("[P-15] ohne bestimmbaren Zugang oder ohne IP keine Meldung", () => {
    const t = addressed();
    t.nodes = t.nodes.filter((n) => n.id !== "kon");
    t.edges = t.edges.filter((e) => e.id !== "e3" && e.id !== "e4");
    expect(only(t, "P-15")).toEqual([]);
    const u = addressed();
    u.nodes = u.nodes.map((n) => (n.id === "pc" ? { ...n, config: {} } : n));
    expect(only(u, "P-15")).toEqual([]);
  });

  it("[P-8] bis [P-15] melden im Modus Einfach nicht", () => {
    const t = withCfg("pc", { ip: "999.1.1.1", mask: "x", gateway: "y" });
    const pick = (mode: "simple" | "advanced") =>
      runChecks(t, mode, catalog).filter((f) => /^P-(8|9|1[0-5])$/.test(f.id));
    expect(pick("simple")).toEqual([]);
    expect(pick("advanced").length).toBeGreaterThan(0);
  });
});
