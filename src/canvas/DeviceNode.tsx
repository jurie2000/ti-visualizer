import { Handle, Position, useConnection, type NodeProps } from "@xyflow/react";
import { AlertTriangle, CircleCheck } from "lucide-react";
import type { CSSProperties } from "react";
import { FALLBACK_ICON, ICONS, categoryColor } from "./deviceStyle";
import { plugCardDialog } from "../dialogs/PlugCardDialog";
import { useUi } from "../store";
import { CardChip } from "./CardChip";
import { HiddenToggle } from "./HiddenToggle";
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
 * - Karten-Chips (T-205): `.tiv-node__slot` unter dem Namen, `data.node.cards`.
 */
export function DeviceNode({ data, selected }: NodeProps<DeviceFlowNode>) {
  const { node, device, category, hidden } = data;
  const nfc = device.capabilities.includes("nfcCard");
  const hasCards = nfc || device.capabilities.includes("cardSlots");
  const shape = category?.shape ?? "box";
  const connecting = useConnection().inProgress;
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
          <div className="tiv-node__slot">
            {node.cards?.map((c) => (
              <CardChip
                key={c.kind}
                nodeId={node.id}
                card={c}
                nfc={nfc}
                owner={node.label ?? device.name}
              />
            ))}
            {hasCards && (
              <button
                type="button"
                className="tiv-chip__plug nodrag nopan"
                aria-label={`Karte stecken: ${node.label ?? device.name}`}
                onClick={() => {
                  useUi.getState().openDialog(plugCardDialog(node.id));
                }}
              >
                Karte stecken
              </button>
            )}
            {hidden.length > 0 && (
              <HiddenToggle
                label={`+${String(hidden.length)} ausgeblendet`}
                description={`+${String(hidden.length)} ausgeblendet an ${node.label ?? device.name}`}
                hidden={hidden}
              />
            )}
          </div>
        </div>
      </div>
      <Handle
        type="target"
        position={Position.Top}
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
