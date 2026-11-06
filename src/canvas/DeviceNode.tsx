import { Handle, Position, type NodeProps } from "@xyflow/react";
import { AlertTriangle, CircleCheck } from "lucide-react";
import type { CSSProperties } from "react";
import { FALLBACK_ICON, ICONS, categoryColor } from "./deviceStyle";
import type { DeviceFlowNode } from "./toFlow";

/**
 * Gerät auf der Canvas: Kategorie-Leiste (Farbe) und Form (nie nur Farbe),
 * Icon, Kurzname, Name.
 *
 * Erweiterungspunkte:
 * - Handles (T-204): die beiden unsichtbaren Handles in der Mitte tragen die
 *   Kanten. T-204 macht sie bedienbar (Größe, `pointer-events`), ohne dass
 *   sich Lage oder Aussehen der Kanten ändern; die Kanten laufen schwebend
 *   (siehe `ConnectionEdge`).
 * - Karten-Chips (T-205): `.tiv-node__slot` unter dem Namen, `data.node.cards`.
 */
export function DeviceNode({ data, selected }: NodeProps<DeviceFlowNode>) {
  const { node, device, category } = data;
  const shape = category?.shape ?? "box";
  return (
    <div
      className={`tiv-node tiv-shape-${shape}${selected ? " is-selected" : ""}${node.fault ? " is-fault" : ""}`}
      style={{ "--cat": categoryColor(device.category) } as CSSProperties}
    >
      <div className="tiv-node__body">
        <span className="tiv-node__bar" aria-hidden="true" />
        <div className="tiv-node__text">
          <span className="tiv-node__abbr">
            <DeviceIcon id={device.icon} />
            {device.abbr}
            {selected && (
              <CircleCheck
                size={14}
                aria-hidden="true"
                className="tiv-node__selected"
              />
            )}
            {node.fault && (
              <AlertTriangle
                size={14}
                aria-hidden="true"
                className="tiv-node__fault"
              />
            )}
          </span>
          <span className="tiv-node__name">{node.label ?? device.name}</span>
          <div className="tiv-node__slot" />
        </div>
      </div>
      <Handle
        type="target"
        position={Position.Top}
        className="tiv-handle"
        isConnectable={false}
      />
      <Handle
        type="source"
        position={Position.Top}
        className="tiv-handle"
        isConnectable={false}
      />
    </div>
  );
}

function DeviceIcon({ id }: { id: string }) {
  const Icon = ICONS[id] ?? FALLBACK_ICON;
  return <Icon size={16} aria-hidden="true" />;
}
