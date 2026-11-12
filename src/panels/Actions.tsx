import { simLocked, useSim, useTopology, useUi } from "../store";
import { Button } from "../ui/Button";

/**
 * Aktionsknöpfe unter dem Detail (Mockup `hasDetailActions`): Ausfall und Entfernen eines
 * Geräts, Trennen und Löschen einer Verbindung. Wie im Kontextmenü und bei Entf (Regelwerk 7):
 * Störungen sind auch während der Simulation möglich und brechen sie ab, Entfernen ist gesperrt.
 */
export function Actions({
  kind,
  id,
  fault,
}: {
  kind: "node" | "edge";
  id: string;
  fault: boolean;
}) {
  const locked = simLocked(useSim((s) => s.sim));
  const { toggleFault, removeNode, removeEdge } = useTopology.getState();
  const node = kind === "node";
  return (
    <div className="tiv-dactions">
      <Button
        onClick={() => {
          toggleFault(id);
        }}
      >
        {node
          ? fault
            ? "Wieder in Betrieb nehmen"
            : "Ausfall simulieren"
          : fault
            ? "Verbindung wiederherstellen"
            : "Verbindung trennen"}
      </Button>
      <Button
        disabled={locked}
        onClick={() => {
          (node ? removeNode : removeEdge)(id);
          useUi.getState().select(undefined);
        }}
      >
        {node ? "Gerät entfernen" : "Verbindung löschen"}
      </Button>
    </div>
  );
}
