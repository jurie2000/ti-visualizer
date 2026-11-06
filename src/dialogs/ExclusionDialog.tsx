import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";

type Props = { open: boolean; reason: string; onClose: () => void };

/** X-1: Konnektor und TI-Gateway schließen sich in einer Topologie aus. Der Dialog erklärt das Lernmodell. */
export function ExclusionDialog({ open, reason, onClose }: Props) {
  return (
    <Dialog
      open={open}
      title="Konnektor und TI-Gateway schließen sich aus"
      onClose={onClose}
    >
      <p>{reason}</p>
      <p>
        Eine Topologie bildet hier genau eine Einrichtung ab. Die gematik
        beschreibt das TI-Gateway als Alternative zum Konnektor. Ein Verbot
        beider nebeneinander steht dort nicht, das Lernmodell vereinfacht an
        dieser Stelle (Regel X-1).
      </p>
      <p>
        Entfernen Sie das andere Gerät, wenn Sie den Zugang wechseln möchten.
      </p>
      <Button variant="primary" onClick={onClose}>
        Verstanden
      </Button>
    </Dialog>
  );
}
