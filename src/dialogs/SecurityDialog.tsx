import { CircleAlert, Info, TriangleAlert } from "lucide-react";
import { describeEdge } from "../canvas/edgeKind";
import { runChecks, type Finding, type Severity } from "../engine/checks";
import { useCatalog, useOpen, useSettings, useTopology, useUi } from "../store";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";

// Icon und Wort, nie nur Farbe (D10)
const ICON: Record<Severity, typeof Info> = {
  Fehler: CircleAlert,
  Warnung: TriangleAlert,
  Hinweis: Info,
};

/**
 * Sicherheitsprüfung (FR-19): Befunde nach Schwere. Ein Klick wählt das
 * betroffene Gerät (oder die Verbindung) auf der Canvas aus.
 */
export function SecurityDialog() {
  const open = useUi((s) => s.dialog === "security");
  const close = () => {
    useUi.getState().openDialog(undefined);
  };
  // Der Inhalt (und damit die Prüfung) entsteht erst, wenn der Dialog offen ist.
  return (
    <Dialog open={open} title="Sicherheitsprüfung" onClose={close}>
      <Befunde onClose={close} />
    </Dialog>
  );
}

function Befunde({ onClose }: { onClose: () => void }) {
  const topology = useTopology((s) => s.topology);
  const catalog = useCatalog((s) => s.catalog);
  const mode = useSettings((s) => s.mode);
  const imported = useOpen((s) => s.imported);
  const select = useUi((s) => s.select);

  const findings = runChecks(topology, mode, catalog);
  // Regelwerk 11: Kabel zwischen Endgeräten und Tunnel ohne Netzgeräte dazwischen
  const direct =
    mode === "advanced"
      ? topology.edges.filter((e) => {
          const kind = describeEdge(e, topology, catalog).kind;
          return kind === "tcp" || kind === "vpn";
        })
      : [];

  const focus = (f: Finding) => {
    const node = f.nodes[0];
    const edge = f.edges[0];
    if (node) select({ kind: "node", id: node });
    else if (edge) select({ kind: "edge", id: edge });
  };
  const label = (id: string) => topology.nodes.find((n) => n.id === id)?.label;

  return (
    <>
      {findings.length === 0 && <p>Keine Befunde.</p>}
      <ul>
        {findings.map((f) => {
          const Icon = ICON[f.severity];
          return (
            <li key={f.key}>
              <Icon aria-hidden="true" /> <strong>{f.severity}</strong>:{" "}
              {f.name}
              <p>{f.explanation}</p>
              {f.nodes.length > 0 && (
                <p>Betrifft: {f.nodes.map((n) => label(n) ?? n).join(", ")}</p>
              )}
              {(f.nodes.length > 0 || f.edges.length > 0) && (
                <Button
                  onClick={() => {
                    focus(f);
                  }}
                >
                  {`${f.name} auswählen`}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      {direct.length > 0 && (
        <section aria-label="Vereinfachte Direktverbindungen">
          <h3>Vereinfachte Direktverbindungen</h3>
          <p>
            Diese Verbindungen sind für den Lernzweck direkt gezeichnet. Im
            echten Netz laufen sie über Switch oder Router.
          </p>
          <ul>
            {direct.map((e) => (
              <li key={e.id}>
                <Button
                  onClick={() => {
                    select({ kind: "edge", id: e.id });
                  }}
                >
                  {describeEdge(e, topology, catalog).description}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {imported && (
        <section aria-label="Importbefunde">
          <h3>Importbefunde aus {imported.fileName}</h3>
          <ul>
            {imported.list.map((f, i) => {
              const Icon = ICON[f.severity];
              return (
                <li key={i}>
                  <Icon aria-hidden="true" /> {f.severity}: {f.message}
                </li>
              );
            })}
          </ul>
        </section>
      )}
      <Button variant="primary" onClick={onClose}>
        Schließen
      </Button>
    </>
  );
}
