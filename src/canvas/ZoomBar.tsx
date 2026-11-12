import { Panel, useReactFlow, useStore } from "@xyflow/react";
import { LayoutGrid, Minus, Plus } from "lucide-react";
import { arrange } from "../engine/layout";
import { simLocked, useCatalog, useSim, useTopology } from "../store";
import { Button } from "../ui/Button";
import { NODE_SIZE } from "./deviceStyle";

/** Zoomleiste wie im Mockup: Verkleinern, Prozent, Vergrößern, Übersicht, dazu Sortieren. */
export function ZoomBar() {
  const { zoomIn, zoomOut, fitView, getNodes } = useReactFlow();
  const catalog = useCatalog((s) => s.catalog);
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
          Übersicht
        </Button>
        <Button
          className="tiv-zoom__fit"
          disabled={locked}
          onClick={() => {
            const t = useTopology.getState();
            // gemessene Kachelgrößen (Kartenmarken, Anschlüsse, Namenszeilen)
            const measured = new Map(
              getNodes().flatMap((n) =>
                n.measured?.width && n.measured.height
                  ? [
                      [
                        n.id,
                        { width: n.measured.width, height: n.measured.height },
                      ],
                    ]
                  : [],
              ),
            );
            t.replace(arrange(t.topology, catalog, NODE_SIZE, measured));
            // erst nach dem Neuzeichnen, sonst passt fitView auf die alten Positionen
            setTimeout(() => void fitView(), 30);
          }}
        >
          <LayoutGrid size={15} aria-hidden="true" />
          Sortieren
        </Button>
      </div>
    </Panel>
  );
}
