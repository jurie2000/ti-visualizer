import { beforeEach, describe, expect, it } from "vitest";
import { validateConnection } from "../engine/rules";
import { LIMITS, type Topology } from "../schema";
import { useCatalog } from "./catalogStore";
import { arrange } from "../engine/layout";
import { copyNodes, pasteClip } from "./edit";
import { emptyTopology, useTopology } from "./topologyStore";

const s = () => useTopology.getState();
const catalog = () => useCatalog.getState().catalog;
const add = (type: string, x = 0, y = 0) => {
  const r = s().addNode(type, { x, y });
  if (!r.ok || !r.id) throw new Error("addNode");
  return r.id;
};
const connect = (a: string, b: string) => {
  const r = s().connect(a, b);
  if (!r.ok) throw new Error(r.reason);
};
const edgesOf = (t: Topology) => t.edges.map((e) => e.ends.map((x) => x.node));
const paste = (t: Topology, ids: string[]) => {
  const r = pasteClip(t, copyNodes(t, ids), catalog(), 1);
  if (!r.ok) throw new Error(r.reason);
  return r;
};

beforeEach(() => {
  s().reset(emptyTopology());
});

describe("Editor-Hilfen: Einfügen (FR-16, T-508)", () => {
  it("FR-16 eingefügte Kanten bestehen validateConnection", () => {
    const pc = add("pc", 10, 20);
    const sw = add("switch");
    connect(pc, sw);

    const r = paste(s().topology, [pc, sw]);
    expect(r.ids).toEqual(["pc-2", "switch-2"]);
    expect(edgesOf(r.topology)).toEqual([
      ["pc-1", "switch-1"],
      ["pc-2", "switch-2"],
    ]);
    // die neue Kante ist im Stand ohne sie gültig
    const copied = r.topology.edges[1];
    if (!copied) throw new Error("Kante fehlt");
    const without = { ...r.topology, edges: r.topology.edges.slice(0, 1) };
    const [a, b] = copied.ends;
    expect(
      validateConnection(without, a.node, a.port, b.node, b.port, catalog()).ok,
    ).toBe(true);
    expect(r.topology.nodes[2]?.position).toEqual({ x: 50, y: 60 });
  });

  it("FR-16 ungültige Kanten werden nicht eingefügt", () => {
    const a = add("pc");
    const b = add("pc");
    // PC an PC ist keine erlaubte Verbindung
    const clip = {
      ...copyNodes(s().topology, [a, b]),
      edges: [
        {
          id: "e-x",
          fault: false,
          ends: [
            { node: a, port: "eth0" },
            { node: b, port: "eth0" },
          ] as [{ node: string; port: string }, { node: string; port: string }],
        },
      ],
    };
    const r = pasteClip(s().topology, clip, catalog(), 1);
    if (!r.ok) throw new Error(r.reason);
    expect(r.skippedEdges).toBe(1);
    expect(r.topology.edges).toHaveLength(0);
    expect(r.topology.nodes).toHaveLength(4);
  });

  it("FR-16 Kopie ohne IP und Kopplung, mit Arbeitsplatz und frischer ID", () => {
    const kt = add("kt");
    s().setConfig(kt, { ip: "192.168.10.50", workplace: "Empfang" });
    const r = paste(s().topology, [kt]);
    const copy = r.topology.nodes.find((n) => n.id === r.ids[0]);
    expect(copy?.id).not.toBe(kt);
    expect(copy?.config?.workplace).toBe("Empfang");
    expect(copy?.config).not.toHaveProperty("ip");
    expect(copy?.cards).toBeUndefined();
  });

  it("FR-16 leere Zwischenablage und Geräte-Grenze werden abgelehnt", () => {
    expect(
      pasteClip(s().topology, { nodes: [], edges: [] }, catalog(), 1).ok,
    ).toBe(false);
    add("pc");
    const clip = copyNodes(s().topology, ["pc-1"]);
    const voll = {
      ...s().topology,
      nodes: Array.from({ length: 500 }, (_, i) => ({
        id: `x-${String(i)}`,
        type: "pc",
        position: { x: 0, y: 0 },
        fault: false,
      })),
    };
    expect(pasteClip(voll, clip, catalog(), 1).ok).toBe(false);
  });
});

describe("Editor-Hilfen: Sortieren (FR-16, T-508, T-720a)", () => {
  const size = { width: 148, height: 64 };

  it("T-720a Sortieren ist ein Rückgängig-Schritt für Geräte und Zonen", () => {
    const pc = add("pc", 500, 500);
    const sw = add("switch", -300, 70);
    connect(pc, sw);
    s().addZone({ x: 450, y: 450, w: 300, h: 200 });
    const before = s().topology;
    s().replace(arrange(before, catalog(), size));
    expect(s().past.at(-1)).toEqual(before);
    expect(s().topology.nodes.map((n) => n.position)).not.toEqual(
      before.nodes.map((n) => n.position),
    );
    expect(s().topology.zones[0]?.area).not.toEqual(before.zones[0]?.area);
    s().undo();
    expect(s().topology).toEqual(before);
  });

  it("T-720a Sortieren ohne Geräte legt keinen Schritt an", () => {
    s().replace(arrange(s().topology, catalog(), size));
    expect(s().past).toHaveLength(0);
  });

  it("[FR-16] T-720a Sortieren bleibt bei sehr vielen getrennten Geräten im Koordinatenlimit", () => {
    const nodes = Array.from({ length: 600 }, (_, i) => ({
      id: `n${String(i)}`,
      fault: false,
      type: "pvs",
      position: { x: 0, y: 0 },
    }));
    const t = arrange({ ...emptyTopology(), nodes }, catalog(), size);
    expect(t.nodes.every((n) => n.position.y <= LIMITS.coord)).toBe(true);
  });
});
