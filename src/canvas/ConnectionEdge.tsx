import {
  BaseEdge,
  EdgeLabelRenderer,
  useInternalNode,
  useReactFlow,
  type EdgeProps,
  type InternalNode,
} from "@xyflow/react";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { LIMITS, type Point } from "../schema";
import { useTopology, useUi } from "../store";
import { NODE_SIZE } from "./deviceStyle";
import { polyline, routePath, type Box } from "./route";
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
/** Stelle `p` an Index `i`: `add` fügt ein, sonst ersetzt es den Punkt dort. */
const withPoint = (pts: Point[], add: boolean, i: number, p: Point) =>
  add
    ? [...pts.slice(0, i), p, ...pts.slice(i)]
    : pts.map((q, j) => (j === i ? p : q));
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
  const pressed = useRef(false);
  const [drag, setDrag] = useState<{
    add: boolean;
    i: number;
    p: Point;
  } | null>(null);
  // Nach Einfügen oder Entfernen wandert der Fokus auf den passenden Griff
  const [focus, setFocus] = useState<{ key: string } | null>(null);
  useEffect(() => {
    if (!focus) return;
    document
      .querySelector<SVGElement>(`[data-handle="${id}:${focus.key}"]`)
      ?.focus();
  }, [focus, id]);
  if (!from || !to || !data) return null;

  const a = boxOf(from);
  const b = boxOf(to);
  const base = data.waypoints;
  // Beim Ziehen zeigt die Linie den Zwischenstand, gespeichert wird beim Loslassen
  const pts = drag ? withPoint(base, drag.add, drag.i, drag.p) : base;
  const { d: path, mid } = routePath(a, b, route, data.hub, pts);
  const { x, y } = mid;
  // Beschriftung „Wichtige“: einfache Ethernet- und WLAN-Labels entfallen; Störung und Auswahl bleiben (Mockup `trivial`)
  const trivial = !data.fault && (data.kind === "phys" || data.kind === "wlan");
  const showLabel =
    labels === "all" ||
    (labels === "key" && (!trivial || selected)) ||
    (labels === "none" && data.fault);

  // Griffe: vorhandene Punkte und je Abschnitt ein Einfüge-Griff in dessen Mitte (L-6);
  // ohne Gelenkpunkte sitzt der eine Einfüge-Griff in der Linienmitte
  const line = polyline(a, b, base);
  const adds: Point[] =
    base.length >= LIMITS.waypoints
      ? []
      : line
        ? line.slice(0, -1).map((s, i) => {
            const e = line[i + 1] as Point;
            return { x: (s.x + e.x) / 2, y: (s.y + e.y) / 2 };
          })
        : [mid];
  const handles = [
    ...base.map((p, i) => ({ add: false, i, p })),
    ...adds.map((p, i) => ({ add: true, i, p })),
  ];
  const place = (e: PointerEvent, add: boolean, i: number) => {
    const p = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    setDrag({
      add,
      i,
      p: { x: clamp(Math.round(p.x)), y: clamp(Math.round(p.y)) },
    });
  };
  const commit = (add: boolean, i: number, p: Point) => {
    setFocus({ key: `p${String(i)}` });
    setWaypoints(id, withPoint(base, add, i, p));
  };
  const remove = (i: number) => {
    setFocus({
      key: base.length > 1 ? `p${String(Math.min(i, base.length - 2))}` : "a0",
    });
    setWaypoints(
      id,
      base.filter((_, j) => j !== i),
    );
  };
  const onKey = (e: KeyboardEvent, add: boolean, i: number, h: Point) => {
    const d = ARROWS[e.key];
    const insert = add && (e.key === "Enter" || e.key === " ");
    const del = !add && (e.key === "Delete" || e.key === "Backspace");
    if (!d && !insert && !del) return;
    e.preventDefault();
    e.stopPropagation();
    if (del) remove(i);
    else if (d) commit(add, i, { x: clamp(h.x + d.x), y: clamp(h.y + d.y) });
    else commit(add, i, h);
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
        handles.map((h) => {
          const key = `${h.add ? "a" : "p"}${String(h.i)}`;
          const dragged = drag?.add === h.add && drag.i === h.i;
          const at = dragged ? drag.p : h.p;
          return (
            <circle
              key={key}
              data-handle={`${id}:${key}`}
              className={`tiv-waypoint nodrag nopan${h.add ? " is-add" : ""}`}
              cx={at.x}
              cy={at.y}
              r={h.add ? 5 : 7}
              tabIndex={0}
              role="button"
              aria-label={
                h.add
                  ? `Gelenkpunkt einfügen, Abschnitt ${String(h.i + 1)} von ${String(base.length + 1)}, Eingabetaste legt ihn an, Pfeiltasten verschieben`
                  : `Gelenkpunkt ${String(h.i + 1)} von ${String(base.length)}, mit den Pfeiltasten verschieben, Entf entfernt ihn`
              }
              onPointerDown={(e) => {
                e.stopPropagation();
                e.currentTarget.setPointerCapture(e.pointerId);
                pressed.current = true;
              }}
              onPointerMove={(e) => {
                if (pressed.current) place(e, h.add, h.i);
              }}
              onPointerUp={() => {
                pressed.current = false;
                if (drag) commit(drag.add, drag.i, drag.p);
                setDrag(null);
              }}
              onPointerCancel={() => {
                pressed.current = false;
                setDrag(null);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (!h.add) remove(h.i);
              }}
              onKeyDown={(e) => {
                onKey(e, h.add, h.i, h.p);
              }}
            />
          );
        })}
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
