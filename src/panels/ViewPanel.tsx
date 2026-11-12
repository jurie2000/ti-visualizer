import { useCatalog, useSettings, useUi, type ViewToggles } from "../store";

const TOGGLES: [keyof ViewToggles, string][] = [
  ["edges", "Verbindungen anzeigen"],
  ["zones", "Bereiche anzeigen"],
  ["handles", "Anschlusspunkte anzeigen"],
  ["minimap", "Minimap anzeigen"],
];

/** Detailpanel ohne Auswahl (Mockup `noSelection`): Hinweis, Legende der Verbindungsarten, Ansicht-Schalter. */
export function ViewPanel() {
  const kinds = useCatalog((s) => s.catalog.protocols.connectionKinds);
  const simple = useSettings((s) => s.mode) === "simple";
  const view = useUi((s) => s.view);
  return (
    <div className="tiv-view">
      <p className="tiv-dbody">
        Wähle ein Gerät oder eine Verbindung. Ein Rechtsklick auf ein Gerät —
        oder <kbd>Shift</kbd>+<kbd>F10</kbd> — öffnet die möglichen Aktionen.
      </p>
      <section aria-label="Verbindungsarten">
        <h4>Verbindungsarten</h4>
        <ul className="tiv-legend">
          {kinds
            .filter((k) => simple || k.id !== "sammel")
            .map((k) => (
              <li key={k.id}>
                <svg width="52" height="12" aria-hidden="true">
                  <path
                    d="M2 6h48"
                    fill="none"
                    strokeLinecap="round"
                    style={{
                      stroke: `var(--tiv-edge-${k.id})`,
                      strokeWidth: `var(--tiv-edge-${k.id}-width)`,
                      strokeDasharray: `var(--tiv-edge-${k.id}-dash, none)`,
                    }}
                  />
                </svg>
                <span>
                  <strong>{k.name}</strong> {k.meaning}, {k.lineStyle}
                </span>
              </li>
            ))}
        </ul>
      </section>
      <section aria-label="Ansicht">
        <h4>Ansicht</h4>
        {TOGGLES.map(([key, label]) => (
          <button
            key={key}
            type="button"
            className="tiv-switch"
            aria-pressed={view[key]}
            onClick={() => {
              useUi.getState().setView({ [key]: !view[key] });
            }}
          >
            <span>{label}</span>
            <span className="tiv-switch__track" aria-hidden="true">
              <span className="tiv-switch__knob" />
            </span>
          </button>
        ))}
      </section>
    </div>
  );
}
