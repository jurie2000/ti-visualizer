import { ViewportPortal, useReactFlow } from "@xyflow/react";
import { Package, PackageX } from "lucide-react";
import { useEffect, type CSSProperties } from "react";
import { stepDelayMs } from "../engine/simulation";
import { useSim, useUi } from "../store";
import { boxOf } from "./ConnectionEdge";
import { routePath } from "./route";

/**
 * Paket der Simulation (FR-9, D6): wandert je Schritt Verbindung für
 * Verbindung von Gerät zu Gerät. `hop` ist die Teilstrecke, auf der es gerade
 * ist (die Canvas hebt diese Kante hervor). Ohne Abspielen steht es am Ziel,
 * bei gestörtem Schritt am letzten erreichten Gerät (anderes Icon, nicht nur
 * Farbe). Bei reduzierter Bewegung zeigt die Canvas stattdessen die Textmarke
 * am Gerät (canvas.css).
 */
export function SimPacket({
  hop,
  onHop,
}: {
  hop: number;
  onHop: (hop: number) => void;
}) {
  const { getInternalNode } = useReactFlow();
  const { sim, steps } = useSim();
  const route = useUi((s) => s.view.route);
  const step = steps[sim.step];
  const running = sim.status === "running";

  // Im Modus Einfach fehlen versteckte Geräte des Pfads
  const boxes = (step?.nodes ?? []).flatMap((id) => {
    const n = getInternalNode(id);
    return n ? [boxOf(n)] : [];
  });
  const hops = boxes.length - 1;

  useEffect(() => {
    onHop(running ? 0 : Math.max(hops - 1, -1));
    return () => {
      onHop(-1);
    };
  }, [sim.step, running, hops, onHop]);

  const a = boxes[hop];
  const b = boxes[hop + 1];
  if (sim.status === "cancelled" || !step || !a || !b) return null;

  // Das Paket folgt dem Weg der Kante (Mockup: Schritt auf `edgePath`)
  const { d } = routePath(a, b, route);
  const failed = step.problem?.kind === "ausgefallen";
  const Icon = failed ? PackageX : Package;

  return (
    <ViewportPortal>
      <div
        key={`${String(sim.step)}-${String(hop)}`}
        aria-hidden="true"
        className={`tiv-packet${running ? " is-moving" : ""}${failed ? " is-failed" : ""}`}
        onAnimationEnd={() => {
          if (hop < hops - 1) onHop(hop + 1);
        }}
        style={
          {
            offsetPath: `path("${d}")`,
            "--tiv-packet-ms": `${String((stepDelayMs(sim.tempo) * 0.75) / hops)}ms`,
          } as CSSProperties
        }
      >
        <Icon size={16} />
      </div>
    </ViewportPortal>
  );
}
