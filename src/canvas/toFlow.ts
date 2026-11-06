import type { Edge as FlowEdge, Node as FlowNode } from "@xyflow/react";
import type { Catalog, Node as TopoNode, Point, Topology } from "../schema";
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
export interface ConnectionEdgeData extends Record<string, unknown> {
  kind: EdgeKind;
  label: string;
  fault: boolean;
}

export type DeviceFlowNode = FlowNode<DeviceNodeData, "device">;
export type ConnectionFlowEdge = FlowEdge<ConnectionEdgeData, "connection">;

/**
 * Bildet die Topologie auf React-Flow-Elemente ab. Die Topologie bleibt die
 * einzige Wahrheit; `drag` hält nur die Zwischenpositionen während des Ziehens.
 */
export function toFlow(
  topology: Topology,
  catalog: Catalog,
  selection: Selection,
  drag: Record<string, Point> = {},
): { nodes: DeviceFlowNode[]; edges: ConnectionFlowEdge[] } {
  const nodes: DeviceFlowNode[] = [];
  for (const node of topology.nodes) {
    const device = catalog.deviceTypes.find((d) => d.id === node.type);
    if (!device) continue;
    const name = node.label ?? device.name;
    nodes.push({
      id: node.id,
      type: "device",
      position: drag[node.id] ?? node.position,
      initialWidth: NODE_SIZE.width,
      initialHeight: NODE_SIZE.height,
      selected: selection?.kind === "node" && selection.id === node.id,
      ariaLabel: `${device.abbr}: ${name}${node.fault ? ", gestört" : ""}`,
      data: {
        node,
        device,
        category: catalog.categories.find((c) => c.id === device.category),
      },
    });
  }

  const edges: ConnectionFlowEdge[] = topology.edges.map((edge) => {
    const { kind, label, description } = describeEdge(edge, topology, catalog);
    const [a, b] = edge.ends;
    return {
      id: edge.id,
      type: "connection",
      source: a.node,
      target: b.node,
      selected: selection?.kind === "edge" && selection.id === edge.id,
      ariaLabel: description,
      data: { kind, label: edge.label ?? label, fault: edge.fault },
    };
  });
  return { nodes, edges };
}
