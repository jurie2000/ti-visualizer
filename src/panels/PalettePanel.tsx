import { useReactFlow } from "@xyflow/react";
import { NODE_SIZE } from "../canvas/deviceStyle";
import { useTopology, useUi } from "../store";
import { useToast } from "../ui/Toast";
import { Palette } from "./Palette";

/**
 * Palette in der App-Shell: Enter/Klick setzt das Gerät in die Mitte des
 * sichtbaren Canvas-Bereichs (leicht versetzt, damit Geräte nicht exakt
 * übereinander landen). Läuft innerhalb des `ReactFlowProvider`.
 *
 * Filterpunkt (T-207): hier `filter` an `Palette` übergeben.
 */
export function PalettePanel() {
  const { screenToFlowPosition } = useReactFlow();
  const addNode = useTopology((s) => s.addNode);
  const select = useUi((s) => s.select);
  const toast = useToast();

  const add = (type: string) => {
    const canvas = document.querySelector(".react-flow");
    const rect = canvas?.getBoundingClientRect();
    const center = screenToFlowPosition({
      x: (rect?.left ?? 0) + (rect?.width ?? 0) / 2,
      y: (rect?.top ?? 0) + (rect?.height ?? 0) / 2,
    });
    const shift = (useTopology.getState().topology.nodes.length % 6) * 24;
    const result = addNode(type, {
      x: Math.round(center.x - NODE_SIZE.width / 2 + shift),
      y: Math.round(center.y - NODE_SIZE.height / 2 + shift),
    });
    if (!result.ok) toast.show(result.reason);
    else if (result.id) select({ kind: "node", id: result.id });
  };

  return <Palette onAdd={add} />;
}
