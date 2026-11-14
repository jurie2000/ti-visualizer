import { FolderOpen } from "lucide-react";
import type { Topology } from "../schema";
import {
  emptyTopology,
  openTopology,
  startTutorial,
  useCatalog,
  useSettings,
  useUi,
} from "../store";
import { Button } from "../ui/Button";
import { AutosaveHint } from "./AutosaveHint";
import { PresetCard } from "./PresetCard";

/**
 * Startansicht (FR-2): Öffnen, Tutorials, die Presets und der leere Start.
 * Öffnen läuft über `openTopology` (T-303): fragt bei ungespeichertem Stand nach
 * und ersetzt per `replace`; ungespeicherte Arbeit geht danach verloren.
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
      <p className="tiv-start__kicker">Telematikinfrastruktur verstehen</p>
      <h2 id="tiv-start-h">Womit möchtest du beginnen?</h2>
      <p className="tiv-start__lead">
        Lade eine fertige Einrichtung und sieh dir an, wie die Geräte
        zusammenhängen — oder baue die Topologie selbst aus der Palette auf.
      </p>
      <div className="tiv-start__modes">
        <button
          type="button"
          className="tiv-mode"
          onClick={() => {
            useUi.getState().openDialog("open");
          }}
        >
          <FolderOpen className="tiv-mode__icon" aria-hidden="true" />
          <span>
            <span className="tiv-mode__kicker">Datei · Öffnen</span>
            <span className="tiv-mode__title">Topologie aus Datei öffnen</span>
            <span className="tiv-mode__text">
              Lade eine gespeicherte Datei und arbeite dort weiter, wo du
              aufgehört hast.
            </span>
          </span>
        </button>
        <button type="button" className="tiv-mode" onClick={startTutorial}>
          <PlayIcon />
          <span>
            <span className="tiv-mode__kicker">Tutorial · Einsteiger</span>
            <span className="tiv-mode__title">
              Grundlagen: Frau Hoffmanns E-Rezept
            </span>
            <span className="tiv-mode__text">
              Begleite Marta Hoffmann vom Arztbesuch bis in die Apotheke. Du
              baust die Praxis von Dr. Behrens auf, schickst ihr E-Rezept durch
              die TI und bindest die Apotheke am Markt an.
            </span>
          </span>
        </button>
        <button type="button" className="tiv-mode" disabled>
          <PlayIcon />
          <span>
            <span className="tiv-mode__kicker">Tutorial · Fortgeschritten</span>
            <span className="tiv-mode__title">
              Netzwerk-Check in der Praxis
            </span>
            <span className="tiv-mode__text">
              Nach dem Umzug der Praxis geht nichts mehr. Mit IT-Dienstleister
              Kai findest du falsche Subnetze, doppelte Adressen und ein
              verirrtes Gateway.
            </span>
            <span className="tiv-mode__soon">Kommt bald</span>
          </span>
        </button>
      </div>
      {progress > 0 && progress < steps && (
        <Button onClick={onResume}>
          Tutorial fortsetzen (Schritt {progress + 1} von {steps})
        </Button>
      )}
      <ul className="tiv-start__list">
        <PresetCard
          topology={{
            ...emptyTopology(),
            name: "Leer starten",
            description:
              "Nur die Canvas — alle Geräte ziehst du selbst aus der Palette.",
          }}

          onOpen={() => {
            open(emptyTopology());
          }}
        />
        {presets.map((p) => (
          <PresetCard
            key={p.id}
            topology={p.topology}
            onOpen={() => {
              open(p.topology);
            }}
          />
        ))}
      </ul>
    </section>
  );
}

function PlayIcon() {
  return (
    <svg className="tiv-mode__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="m9 6 10 6-10 6z" fill="currentColor" />
    </svg>
  );
}
