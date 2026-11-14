import { saveToFile, useSettings, useUi } from "../store";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { useToast } from "../ui/Toast";

/** Speichern (Knopf und Strg/Cmd+S): fragt, ob die Einstellungen mit in die Datei sollen. */
export function SaveDialog() {
  const open = useUi((s) => s.dialog === "save");
  const toast = useToast();
  const withSettings = useSettings((s) => s.saveSettingsWithFile);
  const set = useSettings((s) => s.set);
  const close = () => {
    useUi.getState().openDialog(undefined);
  };
  const save = () => {
    saveToFile()
      .then(() => {
        close();
        toast.show("Datei gespeichert.");
      })
      .catch(() => {
        toast.show("Speichern fehlgeschlagen.", "error");
      });
  };
  return (
    <Dialog open={open} title="Speichern" onClose={close}>
      <label className="tiv-save__check">
        <input
          type="checkbox"
          checked={withSettings}
          onChange={(e) => {
            set({ saveSettingsWithFile: e.target.checked });
          }}
        />
        Einstellungen mitspeichern
      </label>
      <p>
        <Button variant="primary" onClick={save}>
          Speichern
        </Button>{" "}
        <Button onClick={close}>Abbrechen</Button>
      </p>
    </Dialog>
  );
}
