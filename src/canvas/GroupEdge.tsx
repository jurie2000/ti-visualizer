import {
  BaseEdge,
  EdgeLabelRenderer,
  useInternalNode,
  type EdgeProps,
} from "@xyflow/react";
import { useUi } from "../store";
import { boxOf } from "./ConnectionEdge";
import { HiddenToggle } from "./HiddenToggle";
import { routePath } from "./route";
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
  const route = useUi((s) => s.view.route);
  if (!from || !to || !data) return null;

  const a = boxOf(from);
  const b = boxOf(to);
  const { d: path, mid } = routePath(a, b, route);
  const { x, y } = mid;

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
