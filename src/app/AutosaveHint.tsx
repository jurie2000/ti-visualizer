import { dismissAutosave, useAutosave } from "../store";
import { Button } from "../ui/Button";

/**
 * Hinweis auf die Grenzen des Autosave beim ersten Start (plan.md, D34).
 * Bewusst nicht modal: Er blockiert nichts und bleibt, bis er bestätigt wird.
 */
export function AutosaveHint() {
  const show = useAutosave((s) => s.start?.kind === "hinweis");
  if (!show) return null;
  return (
    <aside className="tiv-hint" aria-label="Hinweis zum Autosave">
      <p>
        Die App sichert Ihren Stand automatisch, nur in diesem Browser auf
        diesem Gerät. Der Autosave fehlt nach dem Löschen der Browserdaten und
        im privaten Modus. Er ersetzt nicht das Speichern als Datei.
      </p>
      <Button
        onClick={() => {
          void dismissAutosave();
        }}
      >
        Verstanden
      </Button>
    </aside>
  );
}
