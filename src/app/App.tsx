import { useState } from "react";
import { Canvas } from "../canvas/Canvas";
import { ImpressumDialog } from "../dialogs/ImpressumDialog";
import { Button } from "../ui/Button";
import { ToastProvider } from "../ui/Toast";
import { ThemeToggle } from "./ThemeToggle";
import "./app.css";

export function App() {
  const [impressumOpen, setImpressumOpen] = useState(false);

  return (
    <ToastProvider>
      <div className="tiv-shell">
        <header className="tiv-header">
          <h1>TI Visualizer</h1>
          <ThemeToggle />
        </header>
        <main className="tiv-main">
          <aside className="tiv-palette" aria-label="Palette">
            Palette
          </aside>
          <section className="tiv-canvas" aria-label="Canvas">
            <Canvas />
          </section>
          <aside className="tiv-detail" aria-label="Detailpanel">
            Detailpanel
          </aside>
        </main>
        <footer className="tiv-footer">
          <Button
            onClick={() => {
              setImpressumOpen(true);
            }}
          >
            Impressum
          </Button>
        </footer>
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
