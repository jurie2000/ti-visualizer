import { useEffect } from "react";
import {
  dismissAutosave,
  restoreAutosave,
  useAutosave,
} from "../store/autosave";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { useToast } from "../ui/Toast";

/**
 * Fragt beim Start nach dem Autosave (FR-5, D34): wiederherstellen oder
 * Ablehnung eines kaputten Stands (Hinweis zum ersten Start: AutosaveHint).
 * Meldet außerdem einmal, wenn das Sichern nicht möglich ist.
 */
export function AutosaveDialog({ onRestored }: { onRestored: () => void }) {
  const start = useAutosave((s) => s.start);
  const failed = useAutosave((s) => s.failed);
  const toast = useToast();
  useEffect(() => {
    if (failed)
      toast.show(
        "Der Autosave ist nicht möglich (Speicher voll oder privater Modus). Speichern Sie als Datei.",
        "error",
      );
  }, [failed, toast]);

  const close = () => {
    void dismissAutosave();
  };
  return (
    <Dialog
      open={start !== undefined && start.kind !== "hinweis"}
      title={
        start?.kind === "wiederherstellen"
          ? "Letzten Stand wiederherstellen?"
          : "Autosave nicht lesbar"
      }
      onClose={close}
    >
      {start?.kind === "wiederherstellen" && (
        <>
          <p>
            Beim letzten Besuch wurde ein Arbeitsstand in diesem Browser
            gesichert. Möchten Sie ihn wiederherstellen?
          </p>
          {start.findings.length > 0 && (
            <>
              <p>Beim Prüfen ist Folgendes aufgefallen:</p>
              <ul>
                {start.findings.map((f, i) => (
                  <li key={i}>
                    {f.severity}: {f.message}
                  </li>
                ))}
              </ul>
            </>
          )}
          <Button
            variant="primary"
            onClick={() => {
              restoreAutosave();
              onRestored();
            }}
          >
            Wiederherstellen
          </Button>{" "}
          <Button onClick={close}>Verwerfen</Button>
        </>
      )}
      {start?.kind === "abgelehnt" && (
        <>
          <p>
            Der gesicherte Stand wurde nicht übernommen: {start.reason} Er wurde
            gelöscht.
          </p>
          <Button variant="primary" onClick={close}>
            Verstanden
          </Button>
        </>
      )}
    </Dialog>
  );
}
