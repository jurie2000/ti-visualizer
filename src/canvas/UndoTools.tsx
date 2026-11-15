import { Panel } from "@xyflow/react";
import { Redo2, Undo2 } from "lucide-react";
import { useState } from "react";
import { simLocked, useSim, useTopology } from "../store";

/**
 * Bedienfeld oben links (#173, U-1): ein Schritt zurück oder vor. Aufbau und Einklappen wie die
 * Zonenleiste (Klassen `tiv-drawbar__*`); ohne Schritt ist der Knopf deaktiviert.
 */
export function UndoTools() {
  const canUndo = useTopology((s) => s.past.length > 0);
  const canRedo = useTopology((s) => s.future.length > 0);
  const locked = simLocked(useSim((s) => s.sim));
  const [open, setOpen] = useState(false);

  return (
    <Panel position="top-left" className="tiv-undobar">
      <div
        role="group"
        aria-label="Rückgängig"
        className={`tiv-drawbar__bar${open ? " is-open" : ""}`}
      >
        <button
          type="button"
          className="tiv-drawbar__title"
          aria-expanded={open}
          onClick={() => {
            setOpen(!open);
          }}
        >
          Rückgängig
        </button>
        <button
          type="button"
          className="tiv-drawbar__btn"
          disabled={locked || !canUndo}
          title="Einen Schritt zurück"
          aria-label="Einen Schritt zurück"
          onClick={() => {
            useTopology.getState().undo();
          }}
        >
          <Undo2 size={15} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="tiv-drawbar__btn"
          disabled={locked || !canRedo}
          title="Einen Schritt vor"
          aria-label="Einen Schritt vor"
          onClick={() => {
            useTopology.getState().redo();
          }}
        >
          <Redo2 size={15} aria-hidden="true" />
        </button>
      </div>
    </Panel>
  );
}
