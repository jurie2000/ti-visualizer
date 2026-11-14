import { UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import {
  confirmOpen,
  openDropped,
  openFile,
  pickFileWithHandle,
  useOpen,
  useUi,
} from "../store";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";

/**
 * Öffnen (FR-2, FR-5): Datei ablegen oder wählen. Enthält die Rückfrage
 * „Einstellungen aus der Datei übernehmen?“ (Standard nein).
 */
export function OpenDialog() {
  const open = useUi((s) => s.dialog === "open");
  const pending = useOpen((s) => s.pending);
  const [over, setOver] = useState(false);
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
          <button
            type="button"
            className={`tiv-dropzone${over ? " tiv-dropzone--over" : ""}`}
            onClick={() => {
              void choose();
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => {
              setOver(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setOver(false);
              const f = e.dataTransfer.files[0];
              if (f)
                void openDropped(e.dataTransfer.items[0], f).then(setError);
            }}
          >
            <UploadCloud aria-hidden="true" />
            <span className="tiv-dropzone__title">
              Datei hierher ziehen oder klicken, um eine zu wählen
            </span>
            <span className="tiv-dropzone__hint">
              Eine gespeicherte Topologie (.tiv.json)
            </span>
          </button>
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
        </>
      )}
    </Dialog>
  );
}
