import { useState, type SyntheticEvent } from "react";
import { CARD_NAMES } from "../canvas/CardChip";
import type { CardKind } from "../engine/cards";
import type { AnyCard } from "../schema";
import { useCatalog, useTopology, useUi } from "../store";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { useToast } from "../ui/Toast";

/** Name des Dialogs in `useUi.dialog`; so öffnet ihn der Knopf am Terminal. */
export const plugCardDialog = (nodeId: string) => `plugCard:${nodeId}`;

const ALL: CardKind[] = ["egk", "hba", "smcb"];

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
  const node = useTopology((s) =>
    s.topology.nodes.find((n) => n.id === nodeId),
  );
  const device = useCatalog((s) =>
    s.catalog.deviceTypes.find((d) => d.id === node?.type),
  );
  // K-6: NFC-Geräte lesen nur die eGK. K-2: nur Arten anbieten, die noch fehlen;
  // steckt alles, bleibt die Auswahl voll und die Engine meldet die Belegung.
  const nfcOnly = !device?.capabilities.includes("cardSlots");
  const candidates = nfcOnly ? ALL.slice(0, 1) : ALL;
  const free = candidates.filter(
    (k) => !node?.cards?.some((c) => c.kind === k),
  );
  const kinds = free.length ? free : candidates;
  const [kind, setKind] = useState<CardKind>(kinds[0] ?? "egk");
  // Zieldatum: simDate + 3 Jahre, 29.02. wird zum 28.02.
  const [expires, setExpires] = useState(
    `${String(Number(simDate.slice(0, 4)) + 3)}${simDate.slice(4)}`.replace(
      /-02-29$/,
      "-02-28",
    ),
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
            {kinds.map((k) => (
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
      {!nfcOnly && (
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
      )}
      <Button type="submit" variant="primary">
        Stecken
      </Button>
    </form>
  );
}
