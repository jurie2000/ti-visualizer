import {
  BaseEdge,
  EdgeLabelRenderer,
  useInternalNode,
  type EdgeProps,
  type InternalNode,
} from "@xyflow/react";
import { NODE_SIZE } from "./deviceStyle";
import type { ConnectionFlowEdge } from "./toFlow";

interface Box {
  cx: number;
  cy: number;
  hw: number;
  hh: number;
}

const boxOf = (n: InternalNode): Box => {
  const w = n.measured.width ?? NODE_SIZE.width;
  const h = n.measured.height ?? NODE_SIZE.height;
  return {
    cx: n.internals.positionAbsolute.x + w / 2,
    cy: n.internals.positionAbsolute.y + h / 2,
    hw: w / 2,
    hh: h / 2,
  };
};

/** Schnittpunkt der Mittellinie von `a` nach `b` mit dem Rand von `a`. */
function onBorder(a: Box, b: Box) {
  const dx = b.cx - a.cx;
  const dy = b.cy - a.cy;
  if (dx === 0 && dy === 0) return { x: a.cx, y: a.cy };
  const t = Math.min(
    dx === 0 ? Infinity : a.hw / Math.abs(dx),
    dy === 0 ? Infinity : a.hh / Math.abs(dy),
  );
  return { x: a.cx + dx * t, y: a.cy + dy * t };
}

/**
 * Kante je Verbindungsart (Farbe, Stärke, Strichmuster aus `--tiv-edge-<art>`),
 * schwebend zwischen den Rändern der Knoten, mit Label in der Mitte.
 *
 * Erweiterungspunkt (T-207): weitere Kantenarten wie `GroupEdge` kommen als
 * eigene Komponente in `edgeTypes` (Canvas.tsx), diese Datei bleibt unberührt.
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
  if (!from || !to || !data) return null;

  const a = boxOf(from);
  const b = boxOf(to);
  const p1 = onBorder(a, b);
  const p2 = onBorder(b, a);
  const path = `M ${String(p1.x)},${String(p1.y)} L ${String(p2.x)},${String(p2.y)}`;
  const x = (p1.x + p2.x) / 2;
  const y = (p1.y + p2.y) / 2;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        className={`tiv-edge${selected ? " is-selected" : ""}${data.fault ? " is-fault" : ""}`}
        style={{
          stroke: `var(--tiv-edge-${data.kind})`,
          strokeWidth: `var(--tiv-edge-${data.kind}-width)`,
          strokeDasharray: `var(--tiv-edge-${data.kind}-dash)`,
        }}
      />
      <EdgeLabelRenderer>
        <div
          className={`tiv-edge-label nodrag nopan${data.fault ? " is-fault" : ""}`}
          style={{
            transform: `translate(-50%, -50%) translate(${String(x)}px, ${String(y)}px)`,
          }}
        >
          {data.label}
          {data.fault && " · gestört"}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
