import { Pin, PinOff } from "lucide-react";
import type { CSSProperties } from "react";
import {
  DRAG_TYPE,
  FALLBACK_ICON,
  ICONS,
  categoryColor,
} from "../canvas/deviceStyle";
import type { Catalog } from "../schema";

export type DeviceType = Catalog["deviceTypes"][number];

interface Props {
  device: DeviceType;
  pinned: boolean;
  onAdd: (type: string) => void;
  onTogglePin: (type: string) => void;
}

/** Ein Gerätetyp: Knopf zum Hinzufügen (Klick, Enter, Leertaste oder Ziehen) und Knopf zum Anpinnen. */
export function PaletteItem({ device, pinned, onAdd, onTogglePin }: Props) {
  const Icon = ICONS[device.icon] ?? FALLBACK_ICON;
  const PinIcon = pinned ? PinOff : Pin;
  return (
    <li
      className="tiv-palette__item"
      style={{ "--cat": categoryColor(device.category) } as CSSProperties}
    >
      <button
        type="button"
        className="tiv-palette__add"
        draggable
        aria-label={`${device.abbr} ${device.name} hinzufügen`}
        onClick={() => {
          onAdd(device.id);
        }}
        onDragStart={(e) => {
          e.dataTransfer.setData(DRAG_TYPE, device.id);
          e.dataTransfer.effectAllowed = "copy";
        }}
      >
        <Icon size={18} aria-hidden="true" />
        <span className="tiv-palette__text">
          <strong>{device.abbr}</strong> <span>{device.name}</span>
        </span>
      </button>
      <button
        type="button"
        className="tiv-palette__pin"
        aria-pressed={pinned}
        aria-label={`${device.name} anpinnen`}
        onClick={() => {
          onTogglePin(device.id);
        }}
      >
        <PinIcon size={14} aria-hidden="true" />
      </button>
    </li>
  );
}
