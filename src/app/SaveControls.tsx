import { useEffect } from "react";
import { useFile, useHasUnsaved, useUi } from "../store";
import { Button } from "../ui/Button";

/** Speichern (Kopfleiste und Strg/Cmd+S) öffnet den Speichern-Dialog. */
export function SaveControls() {
  const unsaved = useHasUnsaved();
  const fileName = useFile((s) => s.fileName);

  const openSave = () => {
    useUi.getState().openDialog("save");
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        openSave();
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
      {fileName && (
        <span className="tiv-save__file">Eigene Datei: {fileName}</span>
      )}
      <Button onClick={openSave}>Speichern</Button>
    </div>
  );
}
