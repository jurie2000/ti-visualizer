import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type EdgeTypes,
  type NodeChange,
  type EdgeChange,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMemo, useState } from "react";
import type { Point } from "../schema";
import { useCatalog, useTopology, useUi } from "../store";
import { ConnectionEdge } from "./ConnectionEdge";
import { DeviceNode } from "./DeviceNode";
import { categoryColor } from "./deviceStyle";
import { toFlow, type DeviceFlowNode, type ConnectionFlowEdge } from "./toFlow";
import "./canvas.css";

// Erweiterungspunkt (T-207): weitere Kantenarten (`group`) hier eintragen.
const nodeTypes: NodeTypes = { device: DeviceNode };
const edgeTypes: EdgeTypes = { connection: ConnectionEdge };

const ariaLabelConfig = {
  "node.a11yDescription.default":
    "Enter oder Leertaste wählt das Gerät, danach verschieben die Pfeiltasten es. Mit Umschalt geht es in größeren Schritten.",
  "node.a11yDescription.keyboardDisabled":
    "Enter oder Leertaste wählt das Gerät.",
  "node.a11yDescription.ariaLiveMessage": ({
    direction,
    x,
    y,
  }: {
    direction: string;
    x: number;
    y: number;
  }) =>
    `Gerät nach ${{ up: "oben", down: "unten", left: "links", right: "rechts" }[direction] ?? direction} verschoben, neue Position x ${String(x)}, y ${String(y)}`,
  "edge.a11yDescription.default": "Enter oder Leertaste wählt die Verbindung.",
  "controls.ariaLabel": "Ansicht",
  "controls.zoomIn.ariaLabel": "Vergrößern",
  "controls.zoomOut.ariaLabel": "Verkleinern",
  "controls.fitView.ariaLabel": "Alles einpassen",
  "minimap.ariaLabel": "Übersichtskarte",
  "handle.ariaLabel": "Anschlusspunkt",
};

/**
 * Die Canvas zeigt die Topologie aus dem Store und schreibt Änderungen nur über
 * Store-Aktionen zurück.
 *
 * Erweiterungspunkte:
 * - T-203 (Drop): `onDrop`/`onDragOver` an `ReactFlow`, Position über
 *   `screenToFlowPosition`, dann `useTopology.addNode`.
 * - T-204 (Verbinden): `onConnect` und `isValidConnection` an `ReactFlow`,
 *   Handles in `DeviceNode` freischalten, `useTopology.connect`.
 */
export function Canvas() {
  const topology = useTopology((s) => s.topology);
  const moveNodes = useTopology((s) => s.moveNodes);
  const catalog = useCatalog((s) => s.catalog);
  const selection = useUi((s) => s.selection);
  const select = useUi((s) => s.select);
  // Positionen während des Ziehens: erst beim Loslassen geht ein Schritt in den Verlauf
  const [drag, setDrag] = useState<Record<string, Point>>({});

  const { nodes, edges } = useMemo(
    () => toFlow(topology, catalog, selection, drag),
    [topology, catalog, selection, drag],
  );

  const onNodesChange = (changes: NodeChange<DeviceFlowNode>[]) => {
    const dropped: Record<string, Point> = {};
    for (const c of changes) {
      if (c.type === "position" && c.position) {
        const position = {
          x: Math.round(c.position.x),
          y: Math.round(c.position.y),
        };
        if (c.dragging) setDrag((d) => ({ ...d, [c.id]: position }));
        else dropped[c.id] = position;
      } else if (c.type === "select" && c.selected) {
        select({ kind: "node", id: c.id });
      }
    }
    const ids = Object.keys(dropped);
    if (ids.length === 0) return;
    moveNodes(dropped);
    setDrag((d) =>
      Object.fromEntries(Object.entries(d).filter(([id]) => !ids.includes(id))),
    );
  };

  const onEdgesChange = (changes: EdgeChange<ConnectionFlowEdge>[]) => {
    for (const c of changes)
      if (c.type === "select" && c.selected) select({ kind: "edge", id: c.id });
  };

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onPaneClick={() => {
        select(undefined);
      }}
      deleteKeyCode={null}
      fitView
      minZoom={0.2}
      maxZoom={2}
      ariaLabelConfig={ariaLabelConfig}
    >
      <Background />
      <Controls showInteractive={false} />
      <MiniMap
        pannable
        zoomable
        nodeColor={(n) => {
          const device = (n as DeviceFlowNode).data.device;
          return categoryColor(device.category);
        }}
      />
    </ReactFlow>
  );
}
