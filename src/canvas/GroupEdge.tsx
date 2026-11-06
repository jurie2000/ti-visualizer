import {
  BaseEdge,
  EdgeLabelRenderer,
  useInternalNode,
  type EdgeProps,
} from "@xyflow/react";
import { boxOf, onBorder } from "./ConnectionEdge";
import { HiddenToggle } from "./HiddenToggle";
import type { GroupFlowEdge } from "./toFlow";

/**
 * Sammelkante im Modus Einfach (Regelwerk 3 und 11): doppelte Linie. Das Label
 * ist ein Knopf, der die ausgeblendeten Geräte auf dem Weg ein- und ausklappt.
 */
export function GroupEdge({
  id,
  source,
  target,
  data,
}: EdgeProps<GroupFlowEdge>) {
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
        className="tiv-edge"
        style={{
          stroke: "var(--tiv-edge-sammel)",
          strokeWidth: "var(--tiv-edge-sammel-width)",
        }}
      />
      {/* heller Kern macht die Linie doppelt */}
      <BaseEdge
        id={`${id}-kern`}
        path={path}
        className="tiv-edge"
        style={{
          stroke: "var(--color-bg)",
          strokeWidth: "var(--tiv-edge-sammel-core)",
        }}
      />
      <EdgeLabelRenderer>
        <div
          className="tiv-edge-label tiv-edge-label--group nodrag nopan"
          style={{
            transform: `translate(-50%, -50%) translate(${String(x)}px, ${String(y)}px)`,
          }}
        >
          <HiddenToggle
            label={data.label}
            description={data.description}
            hidden={data.hidden}
          />
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
