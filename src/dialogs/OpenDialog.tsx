import { useRef, useState } from "react";
import {
  confirmOpen,
  openFile,
  openTopology,
  pickFileWithHandle,
  useCatalog,
  useOpen,
  useUi,
} from "../store";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";

/**
 * Öffnen (FR-2, FR-5): Datei wählen oder Preset. Enthält die Rückfrage
 * „Einstellungen aus der Datei übernehmen?“ (Standard nein).
 */
export function OpenDialog() {
  const open = useUi((s) => s.dialog === "open");
  const pending = useOpen((s) => s.pending);
  const presets = useCatalog((s) => s.catalog.presets);
  const [error, setError] = useState<string>();
  const input = useRef<HTMLInputElement>(null);

  const close = () => {
    useOpen.setState({ pending: undefined });
    useUi.getState().openDialog(undefined);
    setError(undefined);
  };
  const choose = async () => {
    try {
      const r = await pickFileWithHandle();
      if (r === "nicht-verfuegbar") input.current?.click();
      else if (r !== "abbruch") setError(await openFile(r.file, r.handle));
    } catch {
      setError("Die Datei konnte nicht geöffnet werden.");
    }
  };

  return (
    <Dialog
      open={open}
      title={pending ? "Einstellungen übernehmen?" : "Öffnen"}
      onClose={close}
    >
      {pending ? (
        <>
          <p>
            Einstellungen aus der Datei übernehmen? Die Datei {pending.fileName}{" "}
            enthält Einstellungen wie Darstellung und Modus. Ohne Übernahme
            bleiben Ihre jetzigen Einstellungen.
          </p>
          <Button
            variant="primary"
            ref={(el) => el?.focus()}
            onClick={() => {
              confirmOpen(false);
            }}
          >
            Nein, nur die Topologie
          </Button>{" "}
          <Button
            onClick={() => {
              confirmOpen(true);
            }}
          >
            Ja, übernehmen
          </Button>
        </>
      ) : (
        <>
          <h3>Datei</h3>
          <p>
            Eine gespeicherte Topologie (.tiv.json). Sie können die Datei auch
            auf die Arbeitsfläche ziehen.
          </p>
          <Button
            variant="primary"
            onClick={() => {
              void choose();
            }}
          >
            Datei wählen …
          </Button>
          <input
            ref={input}
            type="file"
            accept=".json,application/json"
            hidden
            aria-label="Datei auswählen"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f)
                void openFile(f).then((reason) => {
                  setError(reason);
                });
            }}
          />
          {error && <p role="alert">{error}</p>}
          <h3>Preset</h3>
          <ul>
            {presets.map((p) => (
              <li key={p.id}>
                <Button
                  onClick={() => {
                    close();
                    openTopology(p.topology);
                  }}
                >
                  {p.topology.name}
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Dialog>
  );
}
