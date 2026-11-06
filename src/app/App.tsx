import { ReactFlowProvider } from "@xyflow/react";
import { useEffect, useRef, useState } from "react";
import { Canvas } from "../canvas/Canvas";
import { PlugCardDialog } from "../dialogs/PlugCardDialog";
import { ImpressumDialog } from "../dialogs/ImpressumDialog";
import { PalettePanel } from "../panels/PalettePanel";
import { Button } from "../ui/Button";
import { ToastProvider } from "../ui/Toast";
import { ModeSwitch } from "./ModeSwitch";
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
