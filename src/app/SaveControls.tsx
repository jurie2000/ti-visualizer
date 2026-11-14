import { Check, Circle, Save } from "lucide-react";
import { useEffect } from "react";
import { useHasUnsaved, useUi } from "../store";
import { Button } from "../ui/Button";

/**
 * Speichern (Kopfleiste und Strg/Cmd+S) öffnet den Speichern-Dialog. Die
 * Diskette zeigt den Stand: grün mit Haken gespeichert, rot mit Punkt nicht.
 */
export function SaveControls() {
  const unsaved = useHasUnsaved();

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
      <Button
        className={unsaved ? "tiv-save__btn is-open" : "tiv-save__btn is-saved"}
        onClick={openSave}
      >
        <span className="tiv-save__icon" aria-hidden="true">
          <Save size={17} />
          {unsaved ? (
            <Circle size={8} fill="currentColor" />
          ) : (
            <Check size={9} strokeWidth={3.5} />
          )}
        </span>
        Speichern{" "}
        <span className="tiv-sr-only">
          {unsaved ? "(nicht gespeichert)" : "(gespeichert)"}
        </span>
      </Button>
    </div>
  );
}
