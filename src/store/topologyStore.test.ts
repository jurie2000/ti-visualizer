import { beforeEach, describe, expect, it } from "vitest";
import { MESSAGES } from "../engine/cards";
import { LIMITS } from "../schema";
import { HISTORY_LIMIT, emptyTopology, useTopology } from "./topologyStore";

const s = () => useTopology.getState();
const at = (x: number) => ({ x, y: 0 });
const add = (type: string) => {
  const r = s().addNode(type, at(0));
  if (!r.ok || !r.id) throw new Error("addNode");
  return r.id;
};

beforeEach(() => {
  s().reset(emptyTopology());
});

describe("Topologie-Store (T-201)", () => {
  it("fügt Geräte mit eindeutiger ID hinzu und lehnt Unbekanntes ab", () => {
    expect(add("pc")).toBe("pc-1");
    expect(add("pc")).toBe("pc-2");
    expect(s().addNode("nix", at(0)).ok).toBe(false);
    expect(s().addNode("egk", at(0)).ok).toBe(false);
    expect(s().topology.nodes).toHaveLength(2);
  });

  it("[Regelwerk 8] setzt Standardwerte und zählt die IP weiter", () => {
    const router = add("router");
    const a = add("pc");
    const b = add("pc");
    const ip = (id: string) =>
      s().topology.nodes.find((n) => n.id === id)?.config?.ip;
    expect([ip(router), ip(a), ip(b)]).toEqual([
      "192.168.10.1",
      "192.168.10.10",
      "192.168.10.11",
    ]);
  });

  it("Rückgängig und Wiederholen stellen den Stand schrittweise her", () => {
    add("pc");
    add("switch");
    s().undo();
    expect(s().topology.nodes).toHaveLength(1);
    s().undo();
    expect(s().topology.nodes).toHaveLength(0);
    s().undo();
    expect(s().past).toHaveLength(0);
    s().redo();
    s().redo();
    expect(s().topology.nodes).toHaveLength(2);
    s().redo();
    expect(s().topology.nodes).toHaveLength(2);
  });

  it("eine neue Änderung verwirft die Wiederholen-Schritte", () => {
    add("pc");
    s().undo();
    expect(s().future).toHaveLength(1);
    add("switch");
    expect(s().future).toHaveLength(0);
  });

  it("der Verlauf behält höchstens 80 Schritte (D25)", () => {
    for (let i = 0; i < HISTORY_LIMIT + 20; i++)
      s().setMeta({ name: `n${String(i)}` });
    expect(s().past).toHaveLength(HISTORY_LIMIT);
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) s().undo();
    expect(s().past).toHaveLength(0);
    // ältester erreichbarer Stand: der vor Schritt 20 (die ersten 20 sind verworfen)
    expect(s().topology.name).toBe("n19");
  });

  it("verbindet gültig mit automatischen Anschlüssen und macht es rückgängig", () => {
    const a = add("pc");
    const b = add("switch");
    const r = s().connect(a, b);
    expect(r.ok).toBe(true);
    expect(s().topology.edges).toHaveLength(1);
    s().undo();
    expect(s().topology.edges).toHaveLength(0);
  });

  it("ungültige Verbindung liefert die Begründung und ändert nichts", () => {
    const a = add("pc");
    const b = add("pc");
    const before = s().past.length;
    const r = s().connect(a, b);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason.length).toBeGreaterThan(0);
    expect(s().past).toHaveLength(before);
    expect(s().topology.edges).toHaveLength(0);
  });

  it("Karten stecken über die Karten-Engine, Fehler mit Begründung", () => {
    const kt = add("kt");
    const pc = add("pc");
    const card = { kind: "hba", expires: "2029-12-31" } as const;
    expect(s().plugCard(kt, card).ok).toBe(true);
    expect(s().topology.nodes[0]?.cards).toEqual([card]);
    expect(s().plugCard(kt, card)).toEqual({
      ok: false,
      reason: MESSAGES.full,
    });
    expect(s().plugCard(pc, card)).toEqual({
      ok: false,
      reason: MESSAGES.noSlot,
    });
    s().unplugCard(kt, "hba");
    expect(s().topology.nodes[0]?.cards).toEqual([]);
    s().undo();
    expect(s().topology.nodes[0]?.cards).toEqual([card]);
  });

  it("Gerät entfernen löscht seine Kanten, Rückgängig bringt beides zurück", () => {
    const a = add("pc");
    const b = add("switch");
    s().connect(a, b);
    s().removeNode(a);
    expect(s().topology.edges).toHaveLength(0);
    s().undo();
    expect(s().topology.edges).toHaveLength(1);
  });

  it("verschieben, Störung, Kante entfernen und Ersetzen sind je ein Schritt", () => {
    const a = add("pc");
    const b = add("switch");
    const e = s().connect(a, b);
    const n = s().past.length;
    s().moveNodes({ [a]: at(50) });
    s().toggleFault(a);
    s().toggleFault(a);
    s().removeEdge(e.ok && e.id ? e.id : "");
    s().replace(emptyTopology());
    expect(s().past).toHaveLength(n + 5);
    expect(s().topology.nodes).toHaveLength(0);
    s().undo();
    expect(s().topology.edges).toHaveLength(0);
    expect(s().topology.nodes[0]?.position).toEqual(at(50));
  });

  it("beachtet die Obergrenze der Geräte", () => {
    s().reset({
      ...emptyTopology(),
      nodes: Array.from({ length: LIMITS.nodes }, (_, i) => ({
        id: `x${String(i)}`,
        type: "pc",
        fault: false,
        position: at(0),
      })),
    });
    expect(s().addNode("pc", at(0)).ok).toBe(false);
  });

  it("Aktionen ohne Wirkung legen keinen Schritt an", () => {
    const a = add("pc");
    const n = s().past.length;
    s().unplugCard(a, "egk");
    s().removeNode("gibt-es-nicht");
    s().removeEdge("gibt-es-nicht");
    s().toggleFault("gibt-es-nicht");
    s().moveNodes({});
    expect(s().past).toHaveLength(n);
  });

  it("hält Name, Beschreibung und Positionen in den Schema-Grenzen", () => {
    const a = add("pc");
    expect(s().setMeta({ name: "x".repeat(LIMITS.name + 1) }).ok).toBe(false);
    expect(
      s().setMeta({ description: "x".repeat(LIMITS.description + 1) }).ok,
    ).toBe(false);
    expect(s().setMeta({ name: "ok" }).ok).toBe(true);
    s().moveNodes({ [a]: { x: 1e9, y: -1e9 } });
    expect(s().topology.nodes[0]?.position).toEqual({
      x: LIMITS.coord,
      y: -LIMITS.coord,
    });
  });

  it("verbindet mit gewählten Anschlüssen und lehnt unbekannte oder belegte ab", () => {
    const a = add("pc");
    const b = add("switch");
    const ports = { a: "eth0", b: "p1" };
    expect(s().connect(a, b, ports).ok).toBe(true);
    const e = s().topology.edges[0];
    expect(e?.ends).toEqual([
      { node: a, port: "eth0" },
      { node: b, port: "p1" },
    ]);
    expect(s().connect(a, b, { a: "nix", b: "p2" }).ok).toBe(false);
    const c = add("pc");
    expect(s().connect(c, b, ports).ok).toBe(false);
    expect(s().topology.edges).toHaveLength(1);
  });
});
