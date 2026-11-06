import {
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  useReactFlow,
  type EdgeTypes,
  type NodeChange,
  type EdgeChange,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMemo, useState, type DragEvent } from "react";
import type { Point } from "../schema";
import {
  openDropped,
  useCatalog,
  useSettings,
  useTopology,
  useUi,
} from "../store";
import { useToast } from "../ui/Toast";
import { ExclusionDialog } from "../dialogs/ExclusionDialog";
import { ConnectionEdge } from "./ConnectionEdge";
import { DeviceNode } from "./DeviceNode";
import { GroupEdge } from "./GroupEdge";
import { DRAG_TYPE, NODE_SIZE, categoryColor } from "./deviceStyle";
import {
  toFlow,
  type DeviceFlowNode,
  type ConnectionFlowEdge,
  type GroupFlowEdge,
} from "./toFlow";
import { useConnecting } from "./useConnecting";
import "./canvas.css";

const nodeTypes: NodeTypes = { device: DeviceNode };
const edgeTypes: EdgeTypes = {
  connection: ConnectionEdge,
  group: GroupEdge,
};

const ariaLabelConfig = {
  "node.a11yDescription.default":
    "Enter oder Leertaste wählt das Gerät, danach verschieben die Pfeiltasten es. Mit Umschalt geht es in größeren Schritten. Die Taste V wählt das Gerät als Quelle einer Verbindung, V am Zielgerät verbindet.",
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
 * Braucht einen `ReactFlowProvider` darüber (App-Shell, damit die Palette
 * dieselbe Ansicht kennt). Drop aus der Palette: `onDrop` unten.
 *
 * Erweiterungspunkte:
 * Verbinden (T-204) steckt in `useConnecting`.
 */
export function Canvas() {
  const topology = useTopology((s) => s.topology);
  const moveNodes = useTopology((s) => s.moveNodes);
  const addNode = useTopology((s) => s.addNode);
  const { screenToFlowPosition } = useReactFlow();
  const toast = useToast();
  const catalog = useCatalog((s) => s.catalog);
  const mode = useSettings((s) => s.mode);
  const selection = useUi((s) => s.selection);
  const select = useUi((s) => s.select);
  // Positionen während des Ziehens: erst beim Loslassen geht ein Schritt in den Verlauf
  const [drag, setDrag] = useState<Record<string, Point>>({});
  // Gemessene Größen von React Flow. Ohne sie verlieren neu gebaute Knoten ihre
  // Maße, und React Flow blendet die Kanten aus (z. B. während des Ziehens).
  const [sizes, setSizes] = useState<
    Record<string, { width: number; height: number }>
  >({});

  const connecting = useConnecting();

  const flow = useMemo(
    () => toFlow(topology, catalog, selection, drag, mode),
    [topology, catalog, selection, drag, mode],
  );
  const { edges, isolated } = flow;
  const nodes = useMemo(
    () =>
      flow.nodes.map((n) => {
        const measured = sizes[n.id];
        return measured ? { ...n, measured } : n;
      }),
    [flow.nodes, sizes],
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
      } else if (c.type === "dimensions" && c.dimensions) {
        const size = c.dimensions;
        setSizes((m) => ({ ...m, [c.id]: size }));
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

  const onEdgesChange = (
    changes: EdgeChange<ConnectionFlowEdge | GroupFlowEdge>[],
  ) => {
    for (const c of changes)
      if (c.type === "select" && c.selected) select({ kind: "edge", id: c.id });
  };

  // Quelle einer Verbindung per Tastatur: gestrichelter Rahmen (CSS `.is-source`)
  const shown = connecting.source
    ? nodes.map((n) =>
        n.id === connecting.source ? { ...n, className: "is-source" } : n,
      )
    : nodes;

  // Drop aus der Palette: Mauszeiger ist die Mitte des neuen Geräts
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    const type = e.dataTransfer.getData(DRAG_TYPE);
    if (!type) {
      // Datei von außen (Palette-Geräte tragen DRAG_TYPE): öffnen statt Gerät anlegen
      const file = e.dataTransfer.files.item(0);
      if (!file) return;
      e.preventDefault();
      void openDropped(e.dataTransfer.items[0], file).then((reason) => {
        if (reason) toast.show(reason, "error");
      });
      return;
    }
    e.preventDefault();
    const p = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const result = addNode(type, {
      x: Math.round(p.x - NODE_SIZE.width / 2),
      y: Math.round(p.y - NODE_SIZE.height / 2),
    });
    if (!result.ok) toast.show(result.reason);
    else if (result.id) select({ kind: "node", id: result.id });
  };

  return (
    <>
      <ReactFlow
        nodes={shown}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={connecting.onConnect}
        onConnectEnd={connecting.onConnectEnd}
        onClickConnectStart={connecting.onClickConnectStart}
        onClickConnectEnd={connecting.onClickConnectEnd}
        isValidConnection={connecting.isValidConnection}
        onKeyDown={connecting.onKeyDown}
        onPaneClick={() => {
          select(undefined);
        }}
        onDragOver={(e) => {
          const t = e.dataTransfer.types;
          if (!t.includes(DRAG_TYPE) && !t.includes("Files")) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDrop={onDrop}
        deleteKeyCode={null}
        fitView
        minZoom={0.2}
        maxZoom={2}
        ariaLabelConfig={ariaLabelConfig}
      >
        <Background />
        {isolated.length > 0 && (
          <Panel position="top-left" className="tiv-hint">
            {isolated.length === 1
              ? `${isolated[0] ?? ""} ist nur im Modus Erweitert sichtbar`
              : `${String(isolated.length)} Geräte nur im Modus Erweitert sichtbar: ${isolated.join(", ")}`}
          </Panel>
        )}
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
      <ExclusionDialog
        open={connecting.exclusion !== undefined}
        reason={connecting.exclusion ?? ""}
        onClose={connecting.closeExclusion}
      />
    </>
  );
}
