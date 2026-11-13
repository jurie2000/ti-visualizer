import type { Edge as FlowEdge, Node as FlowNode } from "@xyflow/react";
import { containedNodes } from "../engine/zones";
import type {
  Catalog,
  Node as TopoNode,
  Point,
  Tone,
  Topology,
  Zone,
} from "../schema";
import type { Selection } from "../store";
import { NODE_SIZE } from "./deviceStyle";
import { describeEdge, type EdgeKind } from "./edgeKind";

type DeviceType = Catalog["deviceTypes"][number];

export interface DeviceNodeData extends Record<string, unknown> {
  /** Der Knoten der Topologie: Erweiterungen (Karten-Chips, T-205) lesen ihn von hier. */
  node: TopoNode;
  device: DeviceType;
  category: Catalog["categories"][number] | undefined;
}
export interface ZoneNodeData extends Record<string, unknown> {
  zone: Zone;
}
export interface ConnectionEdgeData extends Record<string, unknown> {
  kind: EdgeKind;
  label: string;
  fault: boolean;
  /** Ende mit den meisten Kanten: dort läuft die Schiene der Kantenführung „Gebündelt“. */
  hub: "a" | "b";
}

export type ZoneFlowNode = FlowNode<ZoneNodeData, "zone">;
export type DeviceFlowNode = FlowNode<DeviceNodeData, "device">;
export type ConnectionFlowEdge = FlowEdge<ConnectionEdgeData, "connection">;

export const TONE_NAME: Record<Tone, string> = {
  sage: "Salbei",
  accent: "Akzent",
  neutral: "Neutral",
};

/**
 * Bildet die Topologie auf React-Flow-Elemente ab. Die Topologie bleibt die
 * einzige Wahrheit; `drag` hält nur die Zwischenpositionen während des Ziehens.
 * Beide Modi zeigen alle Geräte und Verbindungen (Regelwerk 11).
 */
export function toFlow(
  topology: Topology,
  catalog: Catalog,
  selection: Selection,
  drag: Record<string, Point> = {},
): {
  nodes: (ZoneFlowNode | DeviceFlowNode)[];
  edges: ConnectionFlowEdge[];
} {
  const nodes: (ZoneFlowNode | DeviceFlowNode)[] = [];
  // Zonen zuerst und mit stark negativem zIndex: sie liegen hinter Geräten und Kanten
  for (const zone of topology.zones) {
    const selected = selection?.kind === "zone" && selection.id === zone.id;
    const count = containedNodes(zone, topology.nodes, NODE_SIZE).length;
    nodes.push({
      id: zone.id,
      type: "zone",
      position: drag[zone.id] ?? { x: zone.area.x, y: zone.area.y },
      width: zone.area.w,
      height: zone.area.h,
      // Die Größe steht fest; der Anfasser rechnet damit (T-716)
      measured: { width: zone.area.w, height: zone.area.h },
      // React Flow hebt gewählte Knoten um 1000: so bleibt auch eine gewählte Zone hinter den Geräten
      zIndex: -2000,
      selected,
      domAttributes: { "aria-roledescription": "Zone" },
      ariaLabel: `Zone: ${zone.label ?? "ohne Namen"}, ${TONE_NAME[zone.tone]}, ${zone.shape === "ellipse" ? "Ellipse, " : ""}${String(count)} Geräte${selected ? ", ausgewählt" : ""}`,
      data: { zone },
    });
  }
  for (const node of topology.nodes) {
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
      },
    });
  }

  const edges: ConnectionFlowEdge[] = topology.edges.map(
    (edge): ConnectionFlowEdge => {
      const selected = selection?.kind === "edge" && selection.id === edge.id;
      const { kind, label, description } = describeEdge(
        edge,
        topology,
        catalog,
        selected,
      );
      const [a, b] = edge.ends;
      const degree = (id: string) =>
        topology.edges.filter((e) => e.ends.some((x) => x.node === id)).length;
      return {
        id: edge.id,
        type: "connection",
        source: a.node,
        target: b.node,
        selected,
        domAttributes: { "aria-roledescription": "Verbindung" },
        ariaLabel: description,
        data: {
          kind,
          label: edge.label ?? label,
          fault: edge.fault,
          hub: degree(b.node) >= degree(a.node) ? "b" : "a",
        },
      };
    },
  );
  return { nodes, edges };
}
