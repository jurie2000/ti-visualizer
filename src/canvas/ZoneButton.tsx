import { useReactFlow } from "@xyflow/react";
import { simLocked, useSim, useTopology, useUi } from "../store";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { NODE_SIZE } from "./deviceStyle";

const PAD = 24;
const TITLE = 28;
const DEFAULT = { w: 280, h: 180 };

/**
 * Legt eine Zone an (FR-15): um die gewählten Geräte (Mehrfachauswahl mit
 * Strg/⌘ oder Auswahlrahmen), sonst in der Mitte der Ansicht. Danach ist die
 * Zone gewählt, Name und Farbe stehen im Detailpanel.
 */
export function ZoneButton() {
  const { getNodes, screenToFlowPosition } = useReactFlow();
  const addZone = useTopology((s) => s.addZone);
  const locked = simLocked(useSim((s) => s.sim));
  const toast = useToast();
  const create = (view: Element | null) => {
    const picked = getNodes().filter((n) => n.selected && n.type === "device");
    let area = { x: 0, y: 0, ...DEFAULT };
    if (picked.length > 0) {
      const xs = picked.map((n) => n.position.x);
      const ys = picked.map((n) => n.position.y);
      const x = Math.min(...xs) - PAD;
      const y = Math.min(...ys) - PAD - TITLE;
      area = {
        x,
        y,
        w: Math.max(...xs) + NODE_SIZE.width + PAD - x,
        h: Math.max(...ys) + NODE_SIZE.height + PAD - y,
      };
    } else {
      const r = view?.getBoundingClientRect();
      const c = screenToFlowPosition({
        x: r ? r.left + r.width / 2 : 0,
        y: r ? r.top + r.height / 2 : 0,
      });
      area = {
        ...area,
        x: Math.round(c.x - DEFAULT.w / 2),
        y: Math.round(c.y - DEFAULT.h / 2),
      };
    }
    const r = addZone(area);
    if (!r.ok) toast.show(r.reason);
    else if (r.id) useUi.getState().select({ kind: "zone", id: r.id });
  };
  return (
    <Button
      disabled={locked}
      onClick={(e) => {
        create(e.currentTarget.closest(".react-flow"));
      }}
    >
      Zone anlegen
    </Button>
  );
}
