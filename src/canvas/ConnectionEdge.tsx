import {
  BaseEdge,
  EdgeLabelRenderer,
  useInternalNode,
  useReactFlow,
  type EdgeProps,
  type InternalNode,
} from "@xyflow/react";
import { useState, type KeyboardEvent, type PointerEvent } from "react";
import { LIMITS, type Point } from "../schema";
import { useTopology, useUi } from "../store";
import { NODE_SIZE } from "./deviceStyle";
import { routePath, type Box } from "./route";
import type { ConnectionFlowEdge } from "./toFlow";

export const boxOf = (n: InternalNode): Box => {
  const w = n.measured.width ?? NODE_SIZE.width;
  const h = n.measured.height ?? NODE_SIZE.height;
  return {
    cx: n.internals.positionAbsolute.x + w / 2,
    cy: n.internals.positionAbsolute.y + h / 2,
    hw: w / 2,
    hh: h / 2,
  };
};

const STEP = 10;
const clamp = (v: number) => Math.max(-LIMITS.coord, Math.min(LIMITS.coord, v));
const ARROWS: Record<string, Point> = {
  ArrowLeft: { x: -STEP, y: 0 },
  ArrowRight: { x: STEP, y: 0 },
  ArrowUp: { x: 0, y: -STEP },
  ArrowDown: { x: 0, y: STEP },
};

/**
 * Kante je Verbindungsart (Farbe, Stärke, Strichmuster aus `--tiv-edge-<art>`),
 * schwebend zwischen den Rändern der Knoten, mit Label in der Mitte.
 */
export function ConnectionEdge({
  id,
  source,
  target,
  data,
  selected,
}: EdgeProps<ConnectionFlowEdge>) {
  const from = useInternalNode(source);
  const to = useInternalNode(target);
  const route = useUi((s) => s.view.route);
  const labels = useUi((s) => s.view.labels);
  const setWaypoints = useTopology((s) => s.setWaypoints);
  const { screenToFlowPosition } = useReactFlow();
  const [drag, setDrag] = useState<{ i: number; p: Point } | null>(null);
  if (!from || !to || !data) return null;

  const a = boxOf(from);
  const b = boxOf(to);
  const base = data.waypoints;
  // Beim Ziehen zeigt die Linie den Zwischenstand, gespeichert wird beim Loslassen
  const pts = drag
    ? base.length > 0
      ? base.map((p, i) => (i === drag.i ? drag.p : p))
      : [drag.p]
    : base;
  const { d: path, mid } = routePath(a, b, route, data.hub, pts);
  const { x, y } = mid;
  // Beschriftung „Wichtige“: einfache Ethernet- und WLAN-Labels entfallen; Störung und Auswahl bleiben (Mockup `trivial`)
  const trivial = !data.fault && (data.kind === "phys" || data.kind === "wlan");
  const showLabel =
    labels === "all" ||
    (labels === "key" && (!trivial || selected)) ||
    (labels === "none" && data.fault);

  // Ohne Gelenkpunkte bietet die Mitte einen Griff an, Ziehen legt den ersten an
  const handles = pts.length > 0 ? pts : [mid];
  const place = (e: PointerEvent, i: number) => {
    const p = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    setDrag({ i, p: { x: clamp(Math.round(p.x)), y: clamp(Math.round(p.y)) } });
  };
  const move = (i: number, p: Point) => {
    setWaypoints(
      id,
      handles.map((h, j) => (j === i ? p : h)),
    );
  };
  const onKey = (e: KeyboardEvent, i: number) => {
    const d = ARROWS[e.key];
    const h = handles[i];
    if (!d || !h) return;
    e.preventDefault();
    e.stopPropagation();
    move(i, { x: clamp(h.x + d.x), y: clamp(h.y + d.y) });
  };

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        className={`tiv-edge${selected ? " is-selected" : ""}${data.fault ? " is-fault" : ""}`}
        style={{
          stroke: `var(--tiv-edge-${data.kind})`,
          // Auswahl: dicker, nicht nur farbig
          strokeWidth: selected
            ? `calc(var(--tiv-edge-${data.kind}-width) + 3)`
            : `var(--tiv-edge-${data.kind}-width)`,
          strokeDasharray: `var(--tiv-edge-${data.kind}-dash)`,
        }}
      />
      {selected &&
        handles.map((h, i) => (
          <circle
            key={i}
            className="tiv-waypoint nodrag nopan"
            cx={h.x}
            cy={h.y}
            r={7}
            tabIndex={0}
            role="button"
            aria-label={`Gelenkpunkt ${String(i + 1)} von ${String(handles.length)}, mit den Pfeiltasten verschieben`}
            onPointerDown={(e) => {
              e.stopPropagation();
              e.currentTarget.setPointerCapture(e.pointerId);
              place(e, i);
            }}
            onPointerMove={(e) => {
              if (drag) place(e, i);
            }}
            onPointerUp={() => {
              if (drag) move(i, drag.p);
              setDrag(null);
            }}
            onKeyDown={(e) => {
              onKey(e, i);
            }}
          />
        ))}
      <EdgeLabelRenderer>
        {showLabel && (
          <div
            className={`tiv-edge-label nodrag nopan${data.fault ? " is-fault" : ""}${selected ? " is-selected" : ""}`}
            style={{
              transform: `translate(-50%, -50%) translate(${String(x)}px, ${String(y)}px)`,
            }}
          >
            {data.label}
            {data.fault && " · gestört"}
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}
