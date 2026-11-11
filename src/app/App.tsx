import { ReactFlowProvider } from "@xyflow/react";
import { useEffect, useRef, useState } from "react";
import { Canvas } from "../canvas/Canvas";
import { AutosaveDialog } from "../dialogs/AutosaveDialog";
import { ImportFindingsDialog } from "../dialogs/ImportFindingsDialog";
import { OpenDialog } from "../dialogs/OpenDialog";
import { UnsavedGuardDialog } from "../dialogs/UnsavedGuardDialog";
import { SecurityDialog } from "../dialogs/SecurityDialog";
import { PlugCardDialog } from "../dialogs/PlugCardDialog";
import { ImpressumDialog } from "../dialogs/ImpressumDialog";
import { DetailPanel } from "../panels/DetailPanel";
import { PalettePanel } from "../panels/PalettePanel";
import { TutorialCard } from "../panels/TutorialCard";
import { initAutosave, useOpen, useSettings, useUi } from "../store";
import { Button } from "../ui/Button";
import { ToastProvider } from "../ui/Toast";
import { EditControls } from "./EditControls";
import { ModeSwitch } from "./ModeSwitch";
import { SaveControls } from "./SaveControls";
import { StartScreen } from "./StartScreen";
import { ThemeToggle } from "./ThemeToggle";
import "./app.css";

export function App() {
  const [impressumOpen, setImpressumOpen] = useState(false);
  const [started, setStarted] = useState(false);
  const tutorial = useUi((s) => s.tutorial);
  // Unter 1100 px sind Palette und Detailpanel Überlagerungen (T-703)
  const [overlay, setOverlay] = useState<"palette" | "detail" | null>(null);
  useEffect(() => {
    if (overlay)
      document.querySelector<HTMLElement>(`.tiv-${overlay}`)?.focus();
  }, [overlay]);
  useEffect(() => {
    if (!overlay) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      document
        .querySelector<HTMLElement>('.tiv-overlaybar [aria-expanded="true"]')
        ?.focus();
      setOverlay(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [overlay]);
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
              <>
                <EditControls />
                <Button
                  onClick={() => {
                    setStarted(false);
                  }}
                >
                  Startansicht
                </Button>
                <Button
                  onClick={() => {
                    useUi.getState().openDialog("security");
                  }}
                >
                  Sicherheitsprüfung
                </Button>
              </>
            )}
            <SaveControls />
            <ModeSwitch />
            <ThemeToggle />
          </div>
        </header>
        <p className="tiv-smallhint" role="note">
          Der Baukasten ist für größere Bildschirme gedacht. Presets und Dateien
          lassen sich trotzdem ansehen und abspielen.
        </p>
        <ReactFlowProvider>
          {!started ? (
            <main
              ref={mainRef}
              tabIndex={-1}
              className="tiv-main tiv-main--start"
            >
              <StartScreen
                onResume={() => {
                  // Switch und Konnektor stehen nur im Modus Erweitert in der Palette
                  useSettings.getState().set({ mode: "advanced" });
                  useUi.getState().setTutorial(true);
                  setStarted(true);
                }}
              />
            </main>
          ) : (
            <main ref={mainRef} tabIndex={-1} className="tiv-main">
              <aside
                className="tiv-palette"
                aria-label="Palette"
                tabIndex={-1}
                data-open={overlay === "palette"}
              >
                <PalettePanel
                  onAdded={() => {
                    setOverlay(null);
                  }}
                />
              </aside>
              <section className="tiv-canvas" aria-label="Canvas">
                <div className="tiv-overlaybar">
                  {(["palette", "detail"] as const).map((k) => (
                    <Button
                      key={k}
                      aria-expanded={overlay === k}
                      onClick={() => {
                        setOverlay(overlay === k ? null : k);
                      }}
                    >
                      {k === "palette" ? "Palette" : "Details"}
                    </Button>
                  ))}
                </div>
                {tutorial && <TutorialCard />}
                <Canvas />
              </section>
              <aside
                className="tiv-detail"
                aria-label="Detailpanel"
                tabIndex={-1}
                data-open={overlay === "detail"}
              >
                <DetailPanel />
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
        <SecurityDialog />
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
