import type { NodeProps } from "@xyflow/react";
import { CircleCheck } from "lucide-react";
import type { ZoneFlowNode } from "./toFlow";
import "./zone.css";

/** Zone auf der Canvas (FR-15): Rahmen, Name; Auswahl zeigt Häkchen und dickeren Rahmen, nicht nur Farbe. Name als Text, nie als HTML (D10). */
export function ZoneNode({ data, selected }: NodeProps<ZoneFlowNode>) {
  const { zone } = data;
  return (
    <div
      className={`tiv-zone tiv-zone--${zone.tone}${zone.shape === "ellipse" ? " is-ellipse" : ""}${selected ? " is-selected" : ""}`}
    >
      <span className="tiv-zone__name">
        {zone.label ?? "Zone"}
        {selected && (
          <CircleCheck size={14} aria-hidden="true" className="tiv-zone__sel" />
        )}
      </span>
    </div>
  );
}
