import { ReactFlowProvider } from "@xyflow/react";
import { Eye, Info, Network, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Canvas } from "../canvas/Canvas";
import { AutosaveDialog } from "../dialogs/AutosaveDialog";
import { ImportFindingsDialog } from "../dialogs/ImportFindingsDialog";
import { OpenDialog } from "../dialogs/OpenDialog";
import { SaveDialog } from "../dialogs/SaveDialog";
import { UnsavedGuardDialog } from "../dialogs/UnsavedGuardDialog";
import { SecurityDialog } from "../dialogs/SecurityDialog";
import { ShortcutsDialog } from "../dialogs/ShortcutsDialog";
import { PlugCardDialog } from "../dialogs/PlugCardDialog";
import { ImpressumDialog } from "../dialogs/ImpressumDialog";
import { DetailPanel } from "../panels/DetailPanel";
import { PalettePanel, usePaletteRail } from "../panels/PalettePanel";
import { TutorialCard } from "../panels/TutorialCard";
import { initAutosave, useOpen, useSettings, useUi } from "../store";
import { Button } from "../ui/Button";
import { ToastProvider } from "../ui/Toast";
import { EditShortcuts } from "./EditShortcuts";
import { ModeSwitch } from "./ModeSwitch";
import { SidePanel } from "./SidePanel";
import { SaveControls } from "./SaveControls";
import { StartScreen } from "./StartScreen";
import { ThemeToggle } from "./ThemeToggle";
import "./app.css";

export function App() {
  const [impressumOpen, setImpressumOpen] = useState(false);
  const [started, setStarted] = useState(false);
  const tutorial = useUi((s) => s.tutorial);
  const selection = useUi((s) => s.selection);
  const plugging = useUi((s) => s.dialog?.startsWith("plugCard:") ?? false);
  const [reveal, setReveal] = useState<{ id: string; n: number }>();
  const paletteRail = usePaletteRail((id) => {
    setReveal((r) => ({ id, n: (r?.n ?? 0) + 1 }));
  });
  // Unter 1100 px sind Palette und Detailpanel Überlagerungen (T-703)
  const [overlay, setOverlay] = useState<"palette" | "detail" | null>(null);
  useEffect(() => {
    if (overlay)
      document.querySelector<HTMLElement>(`.tiv-${overlay}`)?.focus();
  }, [overlay]);
  useEffect(() => {
    if (!overlay) return;
    const onKey = (e: KeyboardEvent) => {
      // Nur aus der Überlagerung selbst; Dialoge, Verbinden und Menüs behalten ihr Escape
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (
        !(e.target as Element).closest(
          ".tiv-palette, .tiv-detail, .tiv-overlaybar",
        )
      )
        return;
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
          <h1>
            <button
              type="button"
              className="tiv-home"
              aria-label="TI Visualizer, zur Startansicht"
              title="Zur Startansicht"
              onClick={() => {
                setStarted(false);
              }}
            >
              <span className="tiv-home__logo" aria-hidden="true">
                <Network size={19} />
              </span>
              TI Visualizer
            </button>
          </h1>
          <div className="tiv-header__actions">
            {started && (
              <>
                <EditShortcuts />
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
              <SidePanel
                side="left"
                id="palette"
                label="Palette"
                overlayOpen={overlay === "palette"}
                rail={paletteRail}
              >
                <PalettePanel
                  reveal={reveal}
                  onAdded={() => {
                    setOverlay(null);
                  }}
                />
              </SidePanel>
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
              <SidePanel
                side="right"
                id="detail"
                label="Detailpanel"
                overlayOpen={overlay === "detail"}
                autoOpen={selection}
                hold={plugging}
                rail={[
                  {
                    label: selection ? "Details" : "Legende",
                    icon: Info,
                    active: !!selection,
                    onClick: () => undefined,
                  },
                  {
                    label: "Ansicht",
                    icon: Eye,
                    onClick: () => {
                      useUi.getState().select(undefined);
                    },
                  },
                  {
                    label: "Sicherheit prüfen",
                    icon: ShieldCheck,
                    keepClosed: true,
                    onClick: () => {
                      useUi.getState().openDialog("security");
                    },
                  },
                ]}
              >
                <DetailPanel />
              </SidePanel>
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
          <ShortcutsDialog />
        </footer>
        <PlugCardDialog />
        <OpenDialog />
        <SaveDialog />
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
