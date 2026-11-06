import type { Topology } from "../schema";
import { emptyTopology, openTopology, useCatalog } from "../store";
import { AutosaveHint } from "./AutosaveHint";
import { PresetCard } from "./PresetCard";

/**
 * Startansicht (FR-2): die Presets und der leere Start.
 * Öffnen läuft über `openTopology` (T-303): fragt bei ungespeichertem Stand nach
 * und ersetzt per `replace`, die verlassene Arbeit bleibt mit „Rückgängig“ erreichbar.
 */
export function StartScreen({ onStart }: { onStart: () => void }) {
  const presets = useCatalog((s) => s.catalog.presets);
  const open = (t: Topology) => {
    openTopology(t);
    onStart();
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
    </section>
  );
}
