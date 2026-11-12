import {
  BaseEdge,
  EdgeLabelRenderer,
  useInternalNode,
  type EdgeProps,
  type InternalNode,
} from "@xyflow/react";
import { useUi } from "../store";
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

/**
 * Kante je Verbindungsart (Farbe, Stärke, Strichmuster aus `--tiv-edge-<art>`),
 * schwebend zwischen den Rändern der Knoten, mit Label in der Mitte.
 *
 * Sammelkanten (T-207) zeichnet `GroupEdge`, sie nutzt `boxOf`.
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
  if (!from || !to || !data) return null;

  const a = boxOf(from);
  const b = boxOf(to);
  const { d: path, mid } = routePath(a, b, route, data.hub);
  const { x, y } = mid;
  // Beschriftung „Wichtige“: einfache Ethernet- und WLAN-Labels entfallen; Störung und Auswahl bleiben (Mockup `trivial`)
  const trivial = !data.fault && (data.kind === "phys" || data.kind === "wlan");
  const showLabel =
    labels === "all" ||
    (labels === "key" && (!trivial || selected)) ||
    (labels === "none" && data.fault);

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
