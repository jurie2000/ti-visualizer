import { Panel, useReactFlow, useStore } from "@xyflow/react";
import { LayoutGrid, Minus, Plus } from "lucide-react";
import { arrange, simLocked, useSim, useTopology } from "../store";
import { Button } from "../ui/Button";

/** Zoomleiste wie im Mockup: Verkleinern, Prozent, Vergrößern, Einpassen, dazu Anordnen. */
export function ZoomBar() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const zoom = useStore((s) => s.transform[2]);
  const locked = simLocked(useSim((s) => s.sim));
  return (
    <Panel position="bottom-left" className="tiv-zoom">
      <div role="group" aria-label="Ansicht" className="tiv-zoom__bar">
        <Button
          className="tiv-zoom__round"
          aria-label="Verkleinern"
          onClick={() => void zoomOut()}
        >
          <Minus size={16} aria-hidden="true" />
        </Button>
        <span className="tiv-zoom__level" aria-live="off">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          className="tiv-zoom__round"
          aria-label="Vergrößern"
          onClick={() => void zoomIn()}
        >
          <Plus size={16} aria-hidden="true" />
        </Button>
        <Button className="tiv-zoom__fit" onClick={() => void fitView()}>
          Einpassen
        </Button>
        <Button
          className="tiv-zoom__fit"
          disabled={locked}
          onClick={() => {
            const t = useTopology.getState();
            t.replace(arrange(t.topology));
          }}
        >
          <LayoutGrid size={15} aria-hidden="true" />
          Anordnen
        </Button>
      </div>
    </Panel>
  );
}
