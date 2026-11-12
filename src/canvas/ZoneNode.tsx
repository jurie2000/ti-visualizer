import { NodeResizer, type NodeProps } from "@xyflow/react";
import { CircleCheck } from "lucide-react";
import { simLocked, useSim, useTopology, useUi } from "../store";
import { MIN_ZONE } from "./ZoneTools";
import type { ZoneFlowNode } from "./toFlow";
import "./zone.css";

/** Zone auf der Canvas (FR-15): Rahmen, Name; Auswahl zeigt Häkchen und dickeren Rahmen, nicht nur Farbe. Name als Text, nie als HTML (D10). */
export function ZoneNode({ data, selected }: NodeProps<ZoneFlowNode>) {
  const { zone } = data;
  const locked = simLocked(useSim((s) => s.sim));
  const setZone = useTopology((s) => s.setZone);
  const live = (p: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => ({
    id: zone.id,
    x: Math.round(p.x),
    y: Math.round(p.y),
    w: Math.round(p.width),
    h: Math.round(p.height),
  });
  return (
    <div
      className={`tiv-zone tiv-zone--${zone.tone}${zone.shape === "ellipse" ? " is-ellipse" : ""}${selected ? " is-selected" : ""}`}
    >
      {/* Anfasser an Ecken und Kanten nur bei gewählter Zone, per Maus; Form bleibt (T-716) */}
      <NodeResizer
        isVisible={selected && !locked}
        minWidth={MIN_ZONE.w}
        minHeight={MIN_ZONE.h}
        handleClassName="tiv-zone__handle"
        lineClassName="tiv-zone__line"
        onResizeStart={() => {
          useUi
            .getState()
            .setZoneResize(
              live({ ...zone.area, width: zone.area.w, height: zone.area.h }),
            );
        }}
        onResize={(_, p) => {
          useUi.getState().setZoneResize(live(p));
        }}
        onResizeEnd={(_, p) => {
          const r = live(p);
          useUi.getState().setZoneResize(undefined);
          setZone(zone.id, { x: r.x, y: r.y, w: r.w, h: r.h });
        }}
      />
      <span className="tiv-zone__name">
        {zone.label ?? "Zone"}
        {selected && (
          <CircleCheck size={14} aria-hidden="true" className="tiv-zone__sel" />
        )}
      </span>
    </div>
  );
}
