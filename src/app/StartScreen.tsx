import type { Topology } from "../schema";
import { emptyTopology, useCatalog, useFile, useTopology } from "../store";
import { PresetCard } from "./PresetCard";

/**
 * Startansicht (FR-2): die Presets und der leere Start.
 * Öffnen läuft über `replace` statt `reset`: Wer über die Kopfleiste hierher
 * zurückkommt und ein Preset wählt, kann die verlassene Arbeit mit „Rückgängig“
 * zurückholen.
 */
export function StartScreen({ onStart }: { onStart: () => void }) {
  const presets = useCatalog((s) => s.catalog.presets);
  const replace = useTopology((s) => s.replace);
  const open = (t: Topology) => {
    replace(t);
    // Neues Dokument: Dateibezug lösen, damit Strg+S nicht die vorige Datei überschreibt
    useFile.getState().markSaved(useTopology.getState().topology, null);
    onStart();
  };
  return (
    <section className="tiv-start" aria-labelledby="tiv-start-h">
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
    </section>
  );
}
