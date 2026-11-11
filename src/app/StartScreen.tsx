import type { Topology } from "../schema";
import {
  emptyTopology,
  openTopology,
  startTutorial,
  useCatalog,
  useSettings,
} from "../store";
import { Button } from "../ui/Button";
import { AutosaveHint } from "./AutosaveHint";
import { PresetCard } from "./PresetCard";

/**
 * Startansicht (FR-2): die Presets und der leere Start.
 * Öffnen läuft über `openTopology` (T-303): fragt bei ungespeichertem Stand nach
 * und ersetzt per `replace`, die verlassene Arbeit bleibt mit „Rückgängig“ erreichbar.
 */
export function StartScreen({ onResume }: { onResume: () => void }) {
  const presets = useCatalog((s) => s.catalog.presets);
  const steps = useCatalog((s) => s.catalog.tutorial.steps.length);
  const progress = useSettings((s) => s.tutorialProgress);
  const open = (t: Topology) => {
    openTopology(t);
  };
  return (
    <section className="tiv-start" aria-labelledby="tiv-start-h">
      <AutosaveHint />
      <h2 id="tiv-start-h">Womit möchten Sie beginnen?</h2>
      <ul className="tiv-start__list">
        {presets.map((p) => (
          <PresetCard
            key={p.id}
            topology={p.topology}
            onOpen={() => {
              open(p.topology);
            }}
          />
        ))}
        <PresetCard
          topology={{
            ...emptyTopology(),
            name: "Leerer Start",
            description: "Eine leere Fläche, auf der Sie selbst aufbauen.",
          }}
          onOpen={() => {
            open(emptyTopology());
          }}
        />
      </ul>
      <h2>Tutorial</h2>
      <p>Baue Schritt für Schritt eine Arztpraxis und eine Apotheke auf.</p>
      <div className="tiv-start__tutorial">
        <Button variant="primary" onClick={startTutorial}>
          Tutorial starten
        </Button>
        {progress > 0 && progress < steps && (
          <Button onClick={onResume}>
            Tutorial fortsetzen (Schritt {progress + 1} von {steps})
          </Button>
        )}
      </div>
    </section>
  );
}
