import {
  Handle,
  Position,
  useConnection,
  useStore,
  type NodeProps,
} from "@xyflow/react";
import { AlertTriangle, CircleCheck } from "lucide-react";
import type { CSSProperties } from "react";
import { FALLBACK_ICON, ICONS, categoryColor } from "./deviceStyle";
import { isFree } from "../engine/rules";
import { useSettings, useTopology } from "../store";
import { CardMark } from "./CardChip";
import type { DeviceFlowNode } from "./toFlow";

/**
 * Gerät auf der Canvas: Kategorie-Leiste (Farbe) und Form (nie nur Farbe),
 * Icon, Kurzname, Name.
 *
 * Erweiterungspunkte:
 * - Handles (T-204): Die Kanten laufen schwebend (siehe `ConnectionEdge`), die
 *   Handles legen nur fest, wo man verbindet. Quelle: sichtbarer Punkt am
 *   rechten Rand. Ziel: die ganze Kachel, aber nur während ein Zug läuft,
 *   damit das Verschieben des Geräts unberührt bleibt.
 * - Kartenmarken (T-205, T-718): `.tiv-node__slot` unter dem Namen, `data.node.cards`.
 */
export function DeviceNode({ data, selected }: NodeProps<DeviceFlowNode>) {
  const { node, device, category } = data;
  const shape = category?.shape ?? "box";
  // Ziel annehmen beim Ziehen und beim Verbinden per Klick (Punkt, dann Ziel)
  const dragging = useConnection().inProgress;
  const clicked = useStore((s) => s.connectionClickStartHandle !== null);
  const connecting = dragging || clicked;
  const advanced = useSettings((s) => s.mode === "advanced");
  const topology = useTopology((s) => s.topology);
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
          {advanced && (
            <ul className="tiv-ports-row" aria-label="Anschlüsse">
              {device.ports.map((p) => {
                const free = isFree(topology, node.id, p);
                return (
                  <li
                    key={p.id}
                    className={free ? "is-free" : "is-used"}
                    aria-label={`${p.name}: ${free ? "frei" : "belegt"}`}
                  >
                    <span aria-hidden="true">{free ? "○" : "●"}</span>
                    <span aria-hidden="true">{p.name}</span>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="tiv-node__slot">
            {node.cards?.map((c) => (
              <CardMark key={c.kind} nodeId={node.id} card={c} />
            ))}
          </div>
        </div>
      </div>
      <Handle
        type="target"
        position={Position.Top}
        isConnectableStart={false}
        className={`tiv-handle tiv-handle--target${connecting ? " is-active" : ""}`}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="tiv-handle tiv-handle--source"
      />
    </div>
  );
}

function DeviceIcon({ id }: { id: string }) {
  const Icon = ICONS[id] ?? FALLBACK_ICON;
  return <Icon size={16} aria-hidden="true" />;
}
