import { resolveGuard, useOpen } from "../store";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { useToast } from "../ui/Toast";

/** Schutz vor dem Ersetzen: ungespeicherten Stand erst speichern, verwerfen oder abbrechen. */
export function UnsavedGuardDialog() {
  const open = useOpen((s) => s.guard !== undefined);
  const toast = useToast();
  const answer = (choice: "save" | "discard" | "cancel") => {
    resolveGuard(choice).catch(() => {
      toast.show("Speichern fehlgeschlagen.", "error");
    });
  };
  return (
    <Dialog
      open={open}
      title="Ungespeicherte Änderungen"
      onClose={() => {
        answer("cancel");
      }}
    >
      <p>
        Ungespeicherte Änderungen — erst speichern? Ohne Speichern geht der
        bisherige Stand beim Ersetzen verloren.
      </p>
      <Button
        variant="primary"
        onClick={() => {
          answer("save");
        }}
      >
        Speichern
      </Button>{" "}
      <Button
        onClick={() => {
          answer("discard");
        }}
      >
        Verwerfen
      </Button>{" "}
      <Button
        onClick={() => {
          answer("cancel");
        }}
      >
        Abbrechen
      </Button>
    </Dialog>
  );
}
