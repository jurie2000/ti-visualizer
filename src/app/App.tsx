import { ReactFlowProvider } from "@xyflow/react";
import { useEffect, useRef, useState } from "react";
import { Canvas } from "../canvas/Canvas";
import { AutosaveDialog } from "../dialogs/AutosaveDialog";
import { ImportFindingsDialog } from "../dialogs/ImportFindingsDialog";
import { OpenDialog } from "../dialogs/OpenDialog";
import { UnsavedGuardDialog } from "../dialogs/UnsavedGuardDialog";
import { PlugCardDialog } from "../dialogs/PlugCardDialog";
import { ImpressumDialog } from "../dialogs/ImpressumDialog";
import { PalettePanel } from "../panels/PalettePanel";
import { initAutosave, useOpen } from "../store";
import { Button } from "../ui/Button";
import { ToastProvider } from "../ui/Toast";
import { ModeSwitch } from "./ModeSwitch";
import { SaveControls } from "./SaveControls";
import { StartScreen } from "./StartScreen";
import { ThemeToggle } from "./ThemeToggle";
import "./app.css";

export function App() {
  const [impressumOpen, setImpressumOpen] = useState(false);
  const [started, setStarted] = useState(false);
  // Beim Ansichtswechsel verschwindet der bediente Button: Fokus auf den neuen Hauptbereich (D10)
  const mainRef = useRef<HTMLElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) first.current = false;
    else mainRef.current?.focus();
  }, [started]);

  // Datei oder Preset wurde eingesetzt (auch per Drop oder aus dem Schutzdialog): zur Arbeitsfläche
  useEffect(
    () =>
      useOpen.subscribe((s, prev) => {
        if (s.opened !== prev.opened) setStarted(true);
      }),
    [],
  );

  // Autosave: letzten Stand prüfen, danach entprellt mitsichern (T-304)
  useEffect(() => {
    let off: (() => void) | undefined;
    let gone = false;
    void initAutosave().then((stop) => {
      if (gone) stop();
      else off = stop;
    });
    return () => {
      gone = true;
      off?.();
    };
  }, []);

  return (
    <ToastProvider>
      <div className="tiv-shell">
        <header className="tiv-header">
          <h1>TI Visualizer</h1>
          <div className="tiv-header__actions">
            {started && (
              <Button
                onClick={() => {
                  setStarted(false);
                }}
              >
                Startansicht
              </Button>
            )}
            <SaveControls />
            <ModeSwitch />
            <ThemeToggle />
          </div>
        </header>
        <ReactFlowProvider>
          {!started ? (
            <main
              ref={mainRef}
              tabIndex={-1}
              className="tiv-main tiv-main--start"
            >
              <StartScreen
                onStart={() => {
                  setStarted(true);
                }}
              />
            </main>
          ) : (
            <main ref={mainRef} tabIndex={-1} className="tiv-main">
              <aside className="tiv-palette" aria-label="Palette">
                <PalettePanel />
              </aside>
              <section className="tiv-canvas" aria-label="Canvas">
                <Canvas />
              </section>
              <aside className="tiv-detail" aria-label="Detailpanel">
                Detailpanel
              </aside>
            </main>
          )}
        </ReactFlowProvider>
        <footer className="tiv-footer">
          <Button
            onClick={() => {
              setImpressumOpen(true);
            }}
          >
            Impressum
          </Button>
        </footer>
        <PlugCardDialog />
        <OpenDialog />
        <UnsavedGuardDialog />
        <ImportFindingsDialog />
        <AutosaveDialog
          onRestored={() => {
            setStarted(true);
          }}
        />
        <ImpressumDialog
          open={impressumOpen}
          onClose={() => {
            setImpressumOpen(false);
          }}
        />
      </div>
    </ToastProvider>
  );
}
