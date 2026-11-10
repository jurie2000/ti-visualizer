import { useState, type SyntheticEvent } from "react";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";

interface Props {
  /** Terminals zur Auswahl (Regelwerk 6.0), leer = Dialog zu. */
  options: { id: string; name: string }[];
  onChoose: (terminalId: string) => void;
  onClose: () => void;
}

/** „Welches Terminal?“: die Karte steckt in mehreren Terminals des Zugangs. */
export function TerminalDialog({ options, onChoose, onClose }: Props) {
  return (
    <Dialog
      open={options.length > 0}
      title="Welches Terminal?"
      onClose={onClose}
    >
      {options.length > 0 && <Form options={options} onChoose={onChoose} />}
    </Dialog>
  );
}

function Form({ options, onChoose }: Pick<Props, "options" | "onChoose">) {
  const [picked, setPicked] = useState(options[0]?.id ?? "");
  const submit = (e: SyntheticEvent) => {
    e.preventDefault();
    onChoose(picked);
  };
  return (
    <form onSubmit={submit}>
      <fieldset>
        <legend>Die Aktion läuft über dieses Kartenterminal.</legend>
        {options.map((o) => (
          <p key={o.id}>
            <label>
              <input
                type="radio"
                name="terminal"
                value={o.id}
                checked={picked === o.id}
                onChange={() => {
                  setPicked(o.id);
                }}
              />{" "}
              {o.name}
            </label>
          </p>
        ))}
      </fieldset>
      <Button type="submit" variant="primary">
        Weiter
      </Button>
    </form>
  );
}
