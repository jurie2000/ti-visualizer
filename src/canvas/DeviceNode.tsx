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
import { plugCardDialog } from "../dialogs/PlugCardDialog";
import { isFree } from "../engine/rules";
import { useSettings, useTopology, useUi } from "../store";
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
