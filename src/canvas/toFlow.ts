import type { Edge as FlowEdge, Node as FlowNode } from "@xyflow/react";
import { collapseHidden } from "../engine/collapse";
import type { Catalog, Node as TopoNode, Point, Topology } from "../schema";
import type { Mode, Selection } from "../store";
import { NODE_SIZE } from "./deviceStyle";
import { describeEdge, type EdgeKind } from "./edgeKind";

type DeviceType = Catalog["deviceTypes"][number];

export interface DeviceNodeData extends Record<string, unknown> {
  /** Der Knoten der Topologie: Erweiterungen (Karten-Chips, T-205) lesen ihn von hier. */
  node: TopoNode;
  device: DeviceType;
  category: Catalog["categories"][number] | undefined;
  /** Namen ausgeblendeter Geräte, die nur an diesem Gerät hängen (Modus Einfach). */
  hidden: string[];
}
export interface ConnectionEdgeData extends Record<string, unknown> {
  kind: EdgeKind;
  label: string;
  fault: boolean;
}

export interface GroupEdgeData extends Record<string, unknown> {
  /** Kurztext am Knopf, z. B. „über Switch“. */
  label: string;
  /** Satz für Screenreader (Name des Knopfs). */
  description: string;
  /** Namen der ausgeblendeten Geräte auf dem Weg. */
  hidden: string[];
}

export type DeviceFlowNode = FlowNode<DeviceNodeData, "device">;
export type ConnectionFlowEdge = FlowEdge<ConnectionEdgeData, "connection">;
export type GroupFlowEdge = FlowEdge<GroupEdgeData, "group">;

/**
 * Bildet die Topologie auf React-Flow-Elemente ab. Die Topologie bleibt die
 * einzige Wahrheit; `drag` hält nur die Zwischenpositionen während des Ziehens.
 * Im Modus Einfach blendet `collapseHidden` Geräte aus und ersetzt ihre Wege
 * durch Sammelkanten (Regelwerk 11).
 */
export function toFlow(
  topology: Topology,
  catalog: Catalog,
  selection: Selection,
  drag: Record<string, Point> = {},
  mode: Mode = "advanced",
): {
  nodes: DeviceFlowNode[];
  edges: (ConnectionFlowEdge | GroupFlowEdge)[];
  /** Namen ausgeblendeter Geräte ohne sichtbaren Nachbarn (Modus Einfach). */
  isolated: string[];
} {
  const view =
    mode === "simple"
      ? collapseHidden(topology, catalog)
      : { ...topology, groups: [], stubs: [], isolated: [] };
  const name = (id: string) => {
    const n = topology.nodes.find((x) => x.id === id);
    const d = catalog.deviceTypes.find((t) => t.id === n?.type);
    return n?.label ?? d?.name ?? id;
  };
  const nodes: DeviceFlowNode[] = [];
  for (const node of view.nodes) {
    const device = catalog.deviceTypes.find((d) => d.id === node.type);
    if (!device) continue;
    const title = node.label ?? device.name;
    const selected = selection?.kind === "node" && selection.id === node.id;
    nodes.push({
      id: node.id,
      type: "device",
      position: drag[node.id] ?? node.position,
      initialWidth: NODE_SIZE.width,
      initialHeight: NODE_SIZE.height,
      selected,
      domAttributes: { "aria-roledescription": "Gerät" },
      ariaLabel: `${device.abbr}: ${title}${node.fault ? ", gestört" : ""}${selected ? ", ausgewählt" : ""}`,
      data: {
        node,
        device,
        category: catalog.categories.find((c) => c.id === device.category),
        hidden: view.stubs
          .filter((s) => s.at === node.id)
          .flatMap((s) => s.hidden.map(name)),
      },
    });
  }

  const edges: (ConnectionFlowEdge | GroupFlowEdge)[] = view.edges.map(
    (edge): ConnectionFlowEdge => {
      const selected = selection?.kind === "edge" && selection.id === edge.id;
      const { kind, label, description } = describeEdge(
        edge,
        topology,
        catalog,
        selected,
      );
      const [a, b] = edge.ends;
      return {
        id: edge.id,
        type: "connection",
        source: a.node,
        target: b.node,
        selected,
        domAttributes: { "aria-roledescription": "Verbindung" },
        ariaLabel: description,
        data: { kind, label: edge.label ?? label, fault: edge.fault },
      };
    },
  );
  for (const g of view.groups) {
    const hidden = g.hidden.map(name);
    edges.push({
      id: g.id,
      type: "group",
      source: g.ends[0],
      target: g.ends[1],
      // keine Kante der Topologie: nicht wählbar, der Knopf am Label bedient sie
      selectable: false,
      focusable: false,
      data: {
        label: `über ${hidden.join(", ")}`,
        description: `Sammelkante ${name(g.ends[0])} zu ${name(g.ends[1])} über ${hidden.join(", ")}`,
        hidden,
      },
    });
  }
  return { nodes, edges, isolated: view.isolated.map(name) };
}
