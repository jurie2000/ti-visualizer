import { openTopology, useCatalog } from "../store";
import { PresetCard } from "./PresetCard";

/** Adresse der Preset-Bibliothek (#225): zeigt alle Presets des Katalogs. */
export const PRESETS_HASH = "#/presets";

export function PresetLibrary() {
  const presets = useCatalog((s) => s.catalog.presets);
  return (
    <section className="tiv-start" aria-labelledby="tiv-presets-h">
      <p className="tiv-start__kicker">Presets</p>
      <h2 id="tiv-presets-h">Preset-Bibliothek</h2>
      <p className="tiv-start__lead">
        Alle fertigen Einrichtungen auf einen Blick. Wähle eine aus und sieh dir
        an, wie die Geräte zusammenhängen.
      </p>
      <p>
        <a href="#/">Zur Startansicht</a>
      </p>
      <ul className="tiv-start__list">
        {presets.map((p) => (
          <PresetCard
            key={p.id}
            topology={p.topology}
            onOpen={() => {
              openTopology(p.topology);
            }}
          />
        ))}
      </ul>
    </section>
  );
}
