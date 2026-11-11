import { useState } from "react";
import { autoPorts, isFree, portPairs } from "../engine/rules";
import { useCatalog, useTopology } from "../store";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { useToast } from "../ui/Toast";

export interface PickPair {
  a: string;
  b: string;
}

type Props = { pair: PickPair | undefined; onClose: () => void };

/** Anschlüsse wählen (A-3, Modus Erweitert). Ein belegter Anschluss bleibt wählbar: G-3 meldet dann, warum es nicht geht. */
export function PortPicker({ pair, onClose }: Props) {
  return (
    <Dialog
      open={pair !== undefined}
      title="Anschlüsse wählen"
      onClose={onClose}
    >
      {pair && <Form pair={pair} onClose={onClose} />}
    </Dialog>
  );
}

function Form({ pair, onClose }: { pair: PickPair; onClose: () => void }) {
  const topology = useTopology((s) => s.topology);
  const connect = useTopology((s) => s.connect);
  const catalog = useCatalog((s) => s.catalog);
  const toast = useToast();
  const pairs = portPairs(topology, pair.a, pair.b, catalog);
  const start = autoPorts(topology, pair.a, pair.b, catalog) ?? pairs[0];
  const [pa, setPa] = useState(start?.a);
  const [pbRaw, setPb] = useState(start?.b);
  const [error, setError] = useState<string>();

  const portsOf = (id: string, ids: readonly string[]) => {
    const node = topology.nodes.find((n) => n.id === id);
    const device = catalog.deviceTypes.find((d) => d.id === node?.type);
    return {
      title: node?.label ?? device?.name ?? id,
      ports: (device?.ports ?? []).filter((p) => ids.includes(p.id)),
    };
  };
  const forB = pairs.filter((p) => p.a === pa).map((p) => p.b);
  // Nach Wechsel am Gerät A: B nur, wenn es zu A passt, sonst das erste passende
  const pb = pbRaw && forB.includes(pbRaw) ? pbRaw : forB[0];

  const groups = [
    {
      id: pair.a,
      side: "a",
      ids: [...new Set(pairs.map((p) => p.a))],
      value: pa,
    },
    { id: pair.b, side: "b", ids: forB, value: pb },
  ] as const;

  const submit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!pa || !pb) return;
    const r = connect(pair.a, pair.b, { a: pa, b: pb });
    if (r.ok) {
      // Der Toast liegt außerhalb des modalen Dialogs: erst schließen, dann melden.
      onClose();
      toast.show(
        `Verbunden: ${portsOf(pair.a, []).title} mit ${portsOf(pair.b, []).title}.`,
      );
    } else setError(r.reason);
  };

  return (
    <form onSubmit={submit}>
      {groups.map(({ id, side, ids, value }) => {
        const { title, ports } = portsOf(id, ids);
        return (
          <fieldset key={side} className="tiv-ports">
            <legend>{title}</legend>
            {ports.map((p) => (
              <label key={p.id}>
                <input
                  type="radio"
                  name={`port-${side}`}
                  checked={value === p.id}
                  onChange={() => {
                    setError(undefined);
                    if (side === "a") setPa(p.id);
                    else setPb(p.id);
                  }}
                />{" "}
                {p.name}
                {isFree(topology, id, p) ? "" : " (belegt)"}
              </label>
            ))}
          </fieldset>
        );
      })}
      {error && <p role="alert">{error}</p>}
      <Button type="submit" variant="primary">
        Verbinden
      </Button>
    </form>
  );
}
