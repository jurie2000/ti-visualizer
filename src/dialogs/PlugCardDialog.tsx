import { Check, Circle, CreditCard, KeyRound } from "lucide-react";
import { useState, type SyntheticEvent } from "react";
import { CARD_NAMES } from "../canvas/CardChip";
import type { CardKind } from "../engine/cards";
import type { AnyCard, Catalog, Node } from "../schema";
import { useCatalog, useTopology, useUi } from "../store";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { useToast } from "../ui/Toast";

/** Name des Dialogs in `useUi.dialog`; so öffnet ihn der Knopf am Terminal. */
export const plugCardDialog = (nodeId: string) => `plugCard:${nodeId}`;

type DeviceType = Catalog["deviceTypes"][number];

const ALL: CardKind[] = ["egk", "hba", "smcb"];

/** Kartenarten, die ein Gerät noch aufnimmt (K-2). K-6: NFC-Geräte lesen nur die eGK. */
export function missingKinds(
  node: Node | undefined,
  device: DeviceType | undefined,
) {
  const nfcOnly = !device?.capabilities.includes("cardSlots");
  const candidates = nfcOnly ? ALL.slice(0, 1) : ALL;
  return {
    nfcOnly,
    candidates,
    free: candidates.filter((k) => !node?.cards?.some((c) => c.kind === k)),
  };
}

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
  // K-2: nur Arten anbieten, die noch fehlen; steckt alles, bleibt die Auswahl
  // voll und die Engine meldet die Belegung.
  const { nfcOnly, candidates, free } = missingKinds(node, device);
  const kinds = free.length ? free : candidates;
  const names = new Map(
    useCatalog((s) => s.catalog.deviceTypes).map((d) => [d.id, d.name]),
  );
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
    // K-6: bei NFC gibt es keine PIN-Auswahl; die Engine setzt `pinActive` dort selbst.
    const card: AnyCard =
      kind === "egk"
        ? { kind, expires, ...(!nfcOnly && { pinActive: pin }) }
        : { kind, expires, unlocked: pin };
    const r = plug(nodeId, card);
    // Der Toast liegt außerhalb des modalen Dialogs: erst schließen, dann melden.
    onDone();
    if (!r.ok) toast.show(r.reason);
  };

  return (
    <form className="tiv-plug" onSubmit={submit}>
      <p className="tiv-plug__lead">
        Wähle die Karte, ihr Ablaufdatum und den PIN-Status. Nach dem Stecken
        steckt die Karte im Terminal.
      </p>
      <fieldset className="tiv-plug__kinds">
        <legend>Kartenart</legend>
        {kinds.map((k) => {
          const Icon = k === "hba" ? KeyRound : CreditCard;
          return (
            <label key={k} className="tiv-plug__kind">
              <input
                type="radio"
                name="kind"
                value={k}
                checked={kind === k}
                onChange={() => {
                  setKind(k);
                }}
              />
              <Icon size={18} aria-hidden="true" />
              <span>
                <strong>{CARD_NAMES[k]}</strong>
                <span>{names.get(k)}</span>
              </span>
            </label>
          );
        })}
      </fieldset>
      <label className="tiv-plug__field">
        Ablaufdatum
        <input
          type="date"
          required
          value={expires}
          onChange={(e) => {
            setExpires(e.target.value);
          }}
        />
      </label>
      {!nfcOnly && (
        <label className="tiv-plug__pin">
          <input
            type="checkbox"
            checked={pin}
            onChange={(e) => {
              setPin(e.target.checked);
            }}
          />
          {pin ? (
            <Check size={16} aria-hidden="true" />
          ) : (
            <Circle size={16} aria-hidden="true" />
          )}
          {kind === "egk" ? "PIN aktiv" : "per PIN freigeschaltet"}
        </label>
      )}
      <Button type="submit" variant="primary">
        Stecken
      </Button>
    </form>
  );
}
