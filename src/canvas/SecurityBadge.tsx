import { Panel } from "@xyflow/react";
import { ShieldAlert } from "lucide-react";
import { useMemo } from "react";
import { runChecks } from "../engine/checks";
import { useCatalog, useSettings, useTopology, useUi } from "../store";
import { Button } from "../ui/Button";

/** Zugang zur Sicherheitsprüfung oben rechts, nur wenn es Befunde gibt. */
export function SecurityBadge() {
  const topology = useTopology((s) => s.topology);
  const catalog = useCatalog((s) => s.catalog);
  const mode = useSettings((s) => s.mode);
  const count = useMemo(
    () => runChecks(topology, mode, catalog).length,
    [topology, mode, catalog],
  );
  if (count === 0) return null;
  return (
    <Panel position="top-right" className="tiv-security">
      <Button
        className="tiv-security__btn"
        onClick={() => {
          useUi.getState().openDialog("security");
        }}
      >
        <ShieldAlert size={16} aria-hidden="true" />
        Sicherheitsprüfung: {count} {count === 1 ? "Befund" : "Befunde"}
      </Button>
    </Panel>
  );
}
