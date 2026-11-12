import {
  Background,
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
  simLocked,
  useCatalog,
  useSettings,
  useSim,
  useTopology,
  useUi,
} from "../store";
import { useToast } from "../ui/Toast";
import { ExclusionDialog } from "../dialogs/ExclusionDialog";
import { PortPicker } from "../dialogs/PortPicker";
import { ConnectionEdge } from "./ConnectionEdge";
import { DeviceNode } from "./DeviceNode";
import { ZoneButton } from "./ZoneButton";
import { ZoneTools } from "./ZoneTools";
import { ZoneNode } from "./ZoneNode";
import { GroupEdge } from "./GroupEdge";
import { ZoomBar } from "./ZoomBar";
import { SimPacket } from "./SimPacket";
import { SimPlayer } from "./SimPlayer";
import { containedNodes } from "../engine/zones";
import { DRAG_TYPE, NODE_SIZE, categoryColor } from "./deviceStyle";
import {
  toFlow,
  type DeviceFlowNode,
  type ConnectionFlowEdge,
  type GroupFlowEdge,
  type ZoneFlowNode,
} from "./toFlow";
import { useConnecting } from "./useConnecting";
import { useContextMenu } from "./useContextMenu";
import "./canvas.css";

const nodeTypes: NodeTypes = { device: DeviceNode, zone: ZoneNode };
const edgeTypes: EdgeTypes = {
  connection: ConnectionEdge,
  group: GroupEdge,
};

const ariaLabelConfig = {
  "node.a11yDescription.default":
    "Enter oder Leertaste wählt das Gerät oder die Zone, danach verschieben die Pfeiltasten es. Mit Umschalt geht es in größeren Schritten. Die Taste V wählt ein Gerät als Quelle einer Verbindung, V am Zielgerät verbindet.",
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
    `Nach ${{ up: "oben", down: "unten", left: "links", right: "rechts" }[direction] ?? direction} verschoben, neue Position x ${String(x)}, y ${String(y)}`,
  "edge.a11yDescription.default": "Enter oder Leertaste wählt die Verbindung.",
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
 * Verbinden (T-204) steckt in `useConnecting`, das Kontextmenü (T-404) in `useContextMenu`.
 */
export function Canvas() {
  const topology = useTopology((s) => s.topology);
  const moveNodes = useTopology((s) => s.moveNodes);
  const moveZone = useTopology((s) => s.moveZone);
  const addNode = useTopology((s) => s.addNode);
  const { screenToFlowPosition } = useReactFlow();
  const toast = useToast();
  const catalog = useCatalog((s) => s.catalog);
  const mode = useSettings((s) => s.mode);
  const selection = useUi((s) => s.selection);
  const sim = useSim((s) => s.sim);
  const simSteps = useSim((s) => s.steps);
  const reduceMotion = useSettings((s) => s.reduceMotion);
  const locked = simLocked(sim);
  const select = useUi((s) => s.select);
  // Positionen während des Ziehens: erst beim Loslassen geht ein Schritt in den Verlauf
  const [drag, setDrag] = useState<Record<string, Point>>({});
  // Gemessene Größen von React Flow. Ohne sie verlieren neu gebaute Knoten ihre
  // Maße, und React Flow blendet die Kanten aus (z. B. während des Ziehens).
  const [sizes, setSizes] = useState<
    Record<string, { width: number; height: number }>
  >({});

  // Teilstrecke des Pakets im aktuellen Schritt, -1 ohne Paket
  const [hop, setHop] = useState(-1);

  const connecting = useConnecting();
  const menu = useContextMenu();

  const flow = useMemo(
    () => toFlow(topology, catalog, selection, drag, mode),
    [topology, catalog, selection, drag, mode],
  );
  const { isolated } = flow;
  // Aktueller Schritt der Simulation: Kanten, Knoten und das Gerät eines E-Schritts
  const lit =
    sim.status === "idle" || sim.status === "cancelled"
      ? undefined
      : simSteps[sim.step];
  const litNodes = new Set([
    ...(lit?.nodes ?? []),
    ...(lit?.anchor ? [lit.anchor] : []),
  ]);
  // Sammelkante (Modus Einfach): leuchtet, wenn beide Enden auf dem Pfad liegen
  const edges = useMemo(
    () =>
      flow.edges.map((e) =>
        lit?.edges.includes(e.id) ||
        (e.type === "group" && litNodes.has(e.source) && litNodes.has(e.target))
          ? {
              ...e,
              className: lit?.edges[hop] === e.id ? "is-sim is-hop" : "is-sim",
              ariaLabel: `${e.ariaLabel ?? ""}, aktueller Schritt`,
            }
          : e,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- litNodes folgt aus lit
    [flow.edges, lit, hop],
  );
  const nodes = useMemo(
    () =>
      flow.nodes.map((n) => {
        const measured = sizes[n.id];
        return measured ? { ...n, measured } : n;
      }),
    [flow.nodes, sizes],
  );

  const onNodesChange = (
    changes: NodeChange<DeviceFlowNode | ZoneFlowNode>[],
  ) => {
    const dropped: Record<string, Point> = {};
    for (const c of changes) {
      if (c.type === "position" && c.position) {
        const position = {
          x: Math.round(c.position.x),
          y: Math.round(c.position.y),
        };
        const zone = topology.zones.find((z) => z.id === c.id);
        if (zone) {
          // Geräte in der Zone ziehen mit (FR-15), der Store bucht alles als einen Schritt
          const inside = containedNodes(zone, topology.nodes, NODE_SIZE);
          if (c.dragging) {
            const dx = position.x - zone.area.x;
            const dy = position.y - zone.area.y;
            setDrag((d) => ({
              ...d,
              [c.id]: position,
              ...Object.fromEntries(
                inside.map((n) => [
                  n.id,
                  { x: n.position.x + dx, y: n.position.y + dy },
                ]),
              ),
            }));
          } else {
            moveZone(c.id, position);
            const gone = new Set([c.id, ...inside.map((n) => n.id)]);
            setDrag((d) =>
              Object.fromEntries(
                Object.entries(d).filter(([id]) => !gone.has(id)),
              ),
            );
          }
        } else if (c.dragging) setDrag((d) => ({ ...d, [c.id]: position }));
        else dropped[c.id] = position;
      } else if (c.type === "dimensions" && c.dimensions) {
        const size = c.dimensions;
        setSizes((m) => ({ ...m, [c.id]: size }));
      } else if (c.type === "select" && c.selected) {
        const isZone = topology.zones.some((z) => z.id === c.id);
        select({ kind: isZone ? "zone" : "node", id: c.id });
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
  const shown = nodes.map((n) =>
    litNodes.has(n.id)
      ? {
          ...n,
          className: "is-sim",
          ariaLabel: `${n.ariaLabel ?? ""}, aktueller Schritt`,
        }
      : n.id === connecting.source
        ? { ...n, className: "is-source" }
        : n,
  );

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
    if (locked) {
      toast.show("Während der Simulation ist die Topologie gesperrt.");
      return;
    }
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
        className={reduceMotion ? "is-reduced-motion" : undefined}
        nodesDraggable={!locked}
        nodesConnectable={!locked}
        onConnect={connecting.onConnect}
        onConnectEnd={connecting.onConnectEnd}
        onClickConnectStart={connecting.onClickConnectStart}
        onClickConnectEnd={connecting.onClickConnectEnd}
        onNodeClick={connecting.onNodeClick}
        isValidConnection={connecting.isValidConnection}
        onKeyDown={(e) => {
          if (!locked) connecting.onKeyDown(e);
          menu.onKeyDown(e);
        }}
        onNodeContextMenu={menu.onNodeContextMenu}
        onEdgeContextMenu={menu.onEdgeContextMenu}
        onPaneClick={() => {
          connecting.cancelClick();
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
        {!reduceMotion && <SimPacket hop={hop} onHop={setHop} />}
        {isolated.length > 0 && (
          <Panel position="top-left" className="tiv-hint">
            {isolated.length === 1
              ? `${isolated[0] ?? ""} ist nur im Modus Erweitert sichtbar`
              : `${String(isolated.length)} Geräte nur im Modus Erweitert sichtbar: ${isolated.join(", ")}`}
          </Panel>
        )}
        <ZoneTools />
        <Panel position="top-right">
          <ZoneButton />
        </Panel>
        <ZoomBar />
        <MiniMap
          pannable
          zoomable
          nodeColor={(n) => {
            if (n.type === "zone") return "transparent";
            const device = (n as DeviceFlowNode).data.device;
            return categoryColor(device.category);
          }}
        />
      </ReactFlow>
      <SimPlayer />
      {menu.element}
      <ExclusionDialog
        open={connecting.exclusion !== undefined}
        reason={connecting.exclusion ?? ""}
        onClose={connecting.closeExclusion}
      />
      <PortPicker pair={connecting.picking} onClose={connecting.closePicking} />
    </>
  );
}
