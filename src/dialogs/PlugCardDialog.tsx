import { useState, type SyntheticEvent } from "react";
import { CARD_NAMES } from "../canvas/CardChip";
import type { CardKind } from "../engine/cards";
import type { AnyCard } from "../schema";
import { useTopology, useUi } from "../store";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { useToast } from "../ui/Toast";

/** Name des Dialogs in `useUi.dialog`; so öffnet ihn der Knopf am Terminal. */
export const plugCardDialog = (nodeId: string) => `plugCard:${nodeId}`;

const KINDS: CardKind[] = ["egk", "hba", "smcb"];

/** Karte stecken (K-2): Kartenart, Ablaufdatum (K-3), PIN-Status (K-4, K-7). */
export function PlugCardDialog() {
  const dialog = useUi((s) => s.dialog);
  const close = () => {
    useUi.getState().openDialog(undefined);
  };
  const nodeId = dialog?.startsWith("plugCard:") ? dialog.slice(9) : undefined;
  return (
    <Dialog open={nodeId !== undefined} title="Karte stecken" onClose={close}>
      {nodeId !== undefined && <Form nodeId={nodeId} onDone={close} />}
    </Dialog>
  );
}

function Form({ nodeId, onDone }: { nodeId: string; onDone: () => void }) {
  const simDate = useTopology((s) => s.topology.simDate);
  const plug = useTopology((s) => s.plugCard);
  const toast = useToast();
  const [kind, setKind] = useState<CardKind>("egk");
  const [expires, setExpires] = useState(
    `${String(Number(simDate.slice(0, 4)) + 3)}${simDate.slice(4)}`,
  );
  const [pin, setPin] = useState(true);

  const submit = (e: SyntheticEvent) => {
    e.preventDefault();
    const card: AnyCard =
      kind === "egk"
        ? { kind, expires, pinActive: pin }
        : { kind, expires, unlocked: pin };
    const r = plug(nodeId, card);
    if (r.ok) onDone();
    else toast.show(r.reason);
  };

  return (
    <form onSubmit={submit}>
      <p>
        <label>
          Kartenart{" "}
          <select
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as CardKind);
            }}
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {CARD_NAMES[k]}
              </option>
            ))}
          </select>
        </label>
      </p>
      <p>
        <label>
          Ablaufdatum{" "}
          <input
            type="date"
            required
            value={expires}
            onChange={(e) => {
              setExpires(e.target.value);
            }}
          />
        </label>
      </p>
      <p>
        <label>
          <input
            type="checkbox"
            checked={pin}
            onChange={(e) => {
              setPin(e.target.checked);
            }}
          />{" "}
          {kind === "egk" ? "PIN aktiv" : "per PIN freigeschaltet"}
        </label>
      </p>
      <Button type="submit" variant="primary">
        Stecken
      </Button>
    </form>
  );
}
