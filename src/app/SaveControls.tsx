import { useEffect } from "react";
import { saveToFile, useFile, useHasUnsaved, useSettings } from "../store";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";

/** Speichern (Kopfleiste und Strg/Cmd+S), Häkchen für Einstellungen, Hinweis „nicht gespeichert“. */
export function SaveControls() {
  const toast = useToast();
  const unsaved = useHasUnsaved();
  const fileName = useFile((s) => s.fileName);
  const withSettings = useSettings((s) => s.saveSettingsWithFile);
  const set = useSettings((s) => s.set);

  const save = () => {
    saveToFile().catch(() => {
      toast.show("Speichern fehlgeschlagen.", "error");
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  });

  useEffect(() => {
    if (!unsaved) return;
    const onUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- ältere Chrome/Edge/WebKit verlangen es
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [unsaved]);

  return (
    <div className="tiv-save">
      <span className="tiv-save__state" role="status">
        {unsaved
          ? "Nicht als Datei gespeichert"
          : fileName
            ? `Gespeichert: ${fileName}`
            : ""}
      </span>
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
      <Button onClick={save}>Speichern</Button>
    </div>
  );
}
