import { ViewportPortal, useReactFlow } from "@xyflow/react";
import { Package } from "lucide-react";
import type { CSSProperties } from "react";
import { stepDelayMs } from "../engine/simulation";
import { useSim } from "../store";
import { boxOf, onBorder } from "./ConnectionEdge";

/**
 * Paket der Simulation (FR-9, D6): wandert je Schritt entlang des Pfads von
 * Gerät zu Gerät. Ohne Abspielen steht es am Ziel des Schritts. Bei reduzierter
 * Bewegung zeigt die Canvas stattdessen die Textmarke am Gerät (canvas.css).
 */
export function SimPacket() {
  const { getInternalNode } = useReactFlow();
  const { sim, steps } = useSim();
  const step = steps[sim.step];
  if (sim.status === "idle" || sim.status === "cancelled" || !step) return null;

  // Im Modus Einfach fehlen versteckte Geräte des Pfads
  const boxes = step.nodes.flatMap((id) => {
    const n = getInternalNode(id);
    return n ? [boxOf(n)] : [];
  });
  const [first, second] = boxes;
  const last = boxes[boxes.length - 1];
  const beforeLast = boxes[boxes.length - 2];
  if (!first || !second || !last || !beforeLast) return null;

  const points = [
    onBorder(first, second),
    ...boxes.slice(1, -1).map((b) => ({ x: b.cx, y: b.cy })),
    onBorder(last, beforeLast),
  ];
  const d = points
    .map((p, i) => `${i ? "L" : "M"} ${String(p.x)},${String(p.y)}`)
    .join(" ");

  return (
    <ViewportPortal>
      <div
        key={sim.step}
        aria-hidden="true"
        className={`tiv-packet${sim.status === "running" ? " is-moving" : ""}`}
        style={
          {
            offsetPath: `path("${d}")`,
            "--tiv-packet-ms": `${String(stepDelayMs(sim.tempo) * 0.75)}ms`,
          } as CSSProperties
        }
      >
        <Package size={16} />
      </div>
    </ViewportPortal>
  );
}
