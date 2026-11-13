import { useCatalog, useUi, type ViewSettings } from "../store";

type Switch = "edges" | "zones" | "handles" | "minimap";

const TOGGLES: [Switch, string][] = [
  ["edges", "Verbindungen anzeigen"],
  ["zones", "Zonen anzeigen"],
  ["handles", "Anschlusspunkte anzeigen"],
  ["minimap", "Minimap anzeigen"],
];

const ROUTES: [ViewSettings["route"], string][] = [
  ["curve", "Kurven"],
  ["ortho", "Gebündelt"],
];
const LABELS: [ViewSettings["labels"], string][] = [
  ["all", "Alle"],
  ["key", "Wichtige"],
  ["none", "Keine"],
];

/** Umschalter mit einer gewählten Stufe (Mockup `routeModes`, `labelModes`). */
function Segmented<K extends "route" | "labels">({
  name,
  field,
  options,
  hint,
}: {
  name: string;
  field: K;
  options: [ViewSettings[K], string][];
  hint?: string;
}) {
  const value = useUi((s) => s.view[field]);
  return (
    <div role="group" aria-label={name} className="tiv-segmented-wrap">
      <div className="tiv-segmented__name">{name}</div>
      <div className="tiv-segmented">
        {options.map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={value === id}
            onClick={() => {
              useUi.getState().setView({ [field]: id });
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {hint && <p className="tiv-segmented__hint">{hint}</p>}
    </div>
  );
}

/** Detailpanel ohne Auswahl (Mockup `noSelection`): Hinweis, Legende der Verbindungsarten, Ansicht-Schalter. */
export function ViewPanel() {
  const kinds = useCatalog((s) => s.catalog.protocols.connectionKinds);
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
          {kinds.map((k) => (
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
        <Segmented name="Kantenführung" field="route" options={ROUTES} />
        <Segmented
          name="Protokoll-Labels"
          field="labels"
          options={LABELS}
          hint="„Wichtige“ blendet einfache Ethernet- und WLAN-Beschriftungen aus."
        />
      </section>
    </div>
  );
}
