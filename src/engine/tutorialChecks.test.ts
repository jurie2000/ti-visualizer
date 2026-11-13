import { describe, expect, it } from "vitest";
import type { AnyCard, Node } from "../schema";
import { stepDone, type TutorialCtx } from "./tutorialChecks";

const node = (id: string, type: string, extra: Partial<Node> = {}): Node => ({
  id,
  type,
  position: { x: 0, y: 0 },
  fault: false,
  ...extra,
});
const edge = (a: string, b: string) => ({
  id: `${a}-${b}`,
  ends: [
    { node: a, port: "p" },
    { node: b, port: "q" },
  ] as [{ node: string; port: string }, { node: string; port: string }],
  fault: false,
});
const ctx = (
  nodes: Node[],
  edges: ReturnType<typeof edge>[] = [],
  apo: string[] = [],
  played: string[] = [],
): TutorialCtx => ({
  topology: {
    name: "",
    description: "",
    simDate: "2026-01-01",
    nodes,
    edges,
    zones: [],
  },
  apo: new Set(apo),
  played: new Set(played),
});
const cards = (...kinds: ("egk" | "hba" | "smcb")[]): AnyCard[] =>
  kinds.map((kind) => ({ kind, expires: "2030-01-01" }));

describe("FR-20 Erledigt-Prüfung der Tutorial-Schritte", () => {
  it("Schritt ohne Aufgabe gilt als erledigt, leere Fläche nicht für Aufgaben", () => {
    expect(stepDone("willkommen", ctx([]))).toBe(true);
    expect(stepDone("primaersystem", ctx([]))).toBe(false);
    const nodes = [node("a", "pvs"), node("c", "pc")];
    expect(stepDone("primaersystem", ctx(nodes))).toBe(false);
    expect(stepDone("primaersystem", ctx(nodes, [edge("a", "c")]))).toBe(true);
  });

  it("verlangt alle drei Karten im Terminal der Praxis", () => {
    const kt = (...c: ("egk" | "hba" | "smcb")[]) =>
      ctx([node("k", "kt", { cards: cards(...c) })]);
    expect(stepDone("karten-stecken", kt("smcb", "egk"))).toBe(false);
    expect(stepDone("karten-stecken", kt("smcb", "hba", "egk"))).toBe(true);
  });

  it("verlangt die Verbindung zum richtigen Gerätetyp, in beliebiger Richtung", () => {
    const nodes = [node("p", "pc"), node("k", "kt"), node("s", "switch")];
    expect(stepDone("praxisnetz", ctx(nodes, [edge("p", "s")]))).toBe(false);
    expect(
      stepDone("praxisnetz", ctx(nodes, [edge("p", "s"), edge("s", "k")])),
    ).toBe(true);
  });

  it("Fachdienste: alle drei am VPN-Zugang", () => {
    const nodes = ["vpn", "idp", "erp", "vsdm"].map((t) => node(t, t));
    const two = [edge("vpn", "idp"), edge("vpn", "erp")];
    expect(stepDone("fachdienste", ctx(nodes, two))).toBe(false);
    expect(
      stepDone("fachdienste", ctx(nodes, [...two, edge("vsdm", "vpn")])),
    ).toBe(true);
  });

  it("Teil 2 zählt nur Geräte im Bereich der Apotheke, Teil 1 nur außerhalb", () => {
    const nodes = [
      node("a", "avs"),
      node("c", "pc"),
      node("p", "pvs"),
      node("d", "pc"),
    ];
    const edges = [edge("a", "c"), edge("p", "d")];
    expect(stepDone("apotheke-nebenan", ctx(nodes, edges))).toBe(false);
    expect(stepDone("apotheke-nebenan", ctx(nodes, edges, ["a", "c"]))).toBe(
      true,
    );
    expect(stepDone("primaersystem", ctx(nodes, edges, ["p", "d"]))).toBe(
      false,
    );
  });

  it("Apotheken-Konnektor: Verbindungen, Pairing des Terminals und Gateway des PCs (P-25)", () => {
    const kt = (pairedWith?: string) =>
      node("t", "kt", { config: pairedWith ? { pairedWith } : {} });
    const avs = (gateway?: string) =>
      node("a", "pc", { config: gateway ? { gateway } : {} });
    const base = [
      node("s", "switch"),
      node("k", "kon", { config: { ip: "192.168.10.16" } }),
      node("v", "vpn"),
    ];
    const edges = [edge("s", "k"), edge("k", "v")];
    const apo = ["s", "k", "t", "a"];
    const done = (...extra: Node[]) =>
      stepDone("apotheken-konnektor", ctx([...base, ...extra], edges, apo));
    expect(done()).toBe(false);
    expect(done(kt("k"), avs("192.168.10.2"))).toBe(false); // Gateway ist der Konnektor der Praxis
    expect(done(kt(), avs("192.168.10.16"))).toBe(false); // Terminal ohne Pairing
    expect(done(kt("k"), avs("192.168.10.16"))).toBe(true);
    // Pairing mit einem Konnektor außerhalb des Bereichs
    expect(
      stepDone(
        "apotheken-konnektor",
        ctx([...base, kt("k"), avs("192.168.10.16")], edges, ["s", "t", "a"]),
      ),
    ).toBe(false);
  });

  it("Aktions-Schritte brauchen die durchgelaufene Aktion", () => {
    expect(stepDone("erstes-erezept", ctx([]))).toBe(false);
    expect(
      stepDone("erstes-erezept", ctx([], [], [], ["erezept-ausstellen"])),
    ).toBe(true);
    expect(
      stepDone("rezept-einloesen", ctx([], [], [], ["erezept-ausstellen"])),
    ).toBe(false);
  });
});
