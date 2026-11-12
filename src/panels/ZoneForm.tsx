import { useState } from "react";
import { TONE_NAME } from "../canvas/toFlow";
import { LIMITS, Tone, type Zone } from "../schema";
import {
  simLocked,
  useSim,
  useTopology,
  useUi,
  type ActionResult,
} from "../store";
import { Button } from "../ui/Button";

/** Eingabe, die erst bei Verlassen oder Enter übernommen wird (ein Rückgängig-Schritt je Änderung). */
function Field({
  id,
  label,
  stored,
  hint,
  multiline,
  onCommit,
}: {
  id: string;
  label: string;
  stored: string;
  hint: string;
  /** Mehrzeiliges Feld: Enter macht einen Umbruch, übernommen wird beim Verlassen. */
  multiline?: boolean;
  onCommit: (raw: string) => ActionResult;
}) {
  const [draft, setDraft] = useState(stored);
  const [seen, setSeen] = useState(stored);
  const [error, setError] = useState<string>();
  // Folgt dem gespeicherten Wert (Rückgängig), ohne das Feld neu einzuhängen: der Fokus bleibt.
  if (seen !== stored) {
    setSeen(stored);
    setDraft(stored);
    setError(undefined);
  }
  const commit = () => {
    const r = draft === stored ? undefined : onCommit(draft);
    setError(r && !r.ok ? r.reason : undefined);
  };
  const describedBy = `${id}-hint${error ? ` ${id}-err` : ""}`;
  return (
    <div className="tiv-config__field">
      <label htmlFor={id}>{label}</label>
      {multiline ? (
        <textarea
          id={id}
          rows={4}
          value={draft}
          aria-invalid={error !== undefined}
          aria-describedby={describedBy}
          onChange={(e) => {
            setDraft(e.target.value);
          }}
          onBlur={commit}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={draft}
          aria-invalid={error !== undefined}
          aria-describedby={describedBy}
          onChange={(e) => {
            setDraft(e.target.value);
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
          }}
        />
      )}
      <p id={`${id}-hint`} className="tiv-config__hint">
        {hint}
      </p>
      {error && (
        <p id={`${id}-err`} role="alert" className="tiv-config__error">
          Fehler: {error}
        </p>
      )}
    </div>
  );
}

const SHAPES = [
  ["rect", "Rechteck"],
  ["ellipse", "Ellipse"],
] as const;

const MOVES = [
  [false, "Nur Zone"],
  [true, "Zone mit Elementen"],
] as const;

/** Zone bearbeiten (FR-15): benennen, Form, einfärben (feste Töne), entfernen. Größe und Lage gehören der Fläche: Aufziehen und Verschieben mit der Maus, Verschieben auch mit Pfeiltasten (T-715, T-716). */
export function ZoneForm({ zone }: { zone: Zone }) {
  const setZone = useTopology((s) => s.setZone);
  const removeZone = useTopology((s) => s.removeZone);
  const locked = simLocked(useSim((s) => s.sim));
  return (
    <details className="tiv-fold">
      <summary>Zone bearbeiten</summary>
      <fieldset className="tiv-config" disabled={locked}>
        <legend>Zone bearbeiten</legend>
        {locked && <p>Während der Simulation gesperrt.</p>}
        <Field
          id={`zone-${zone.id}-name`}
          label="Name"
          stored={zone.label ?? ""}
          hint={`höchstens ${String(LIMITS.name)} Zeichen`}
          onCommit={(raw) => setZone(zone.id, { label: raw })}
        />
        <Field
          id={`zone-${zone.id}-description`}
          label="Beschreibung"
          stored={zone.description ?? ""}
          hint={`Leer: Standardbeschreibung. Höchstens ${String(LIMITS.description)} Zeichen`}
          multiline
          onCommit={(raw) => setZone(zone.id, { description: raw })}
        />
        <fieldset className="tiv-config__field">
          <legend>Form</legend>
          <div className="tiv-seg">
            {SHAPES.map(([shape, name]) => (
              <label key={shape}>
                <input
                  type="radio"
                  name={`zone-${zone.id}-shape`}
                  checked={(zone.shape ?? "rect") === shape}
                  onChange={() => {
                    setZone(zone.id, { shape });
                  }}
                />{" "}
                {name}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="tiv-config__field">
          <legend>Beim Verschieben</legend>
          <div className="tiv-seg">
            {MOVES.map(([value, name]) => (
              <label key={name}>
                <input
                  type="radio"
                  name={`zone-${zone.id}-move`}
                  checked={(zone.withContents ?? false) === value}
                  onChange={() => {
                    setZone(zone.id, { withContents: value });
                  }}
                />{" "}
                {name}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="tiv-config__field">
          <legend>Farbe</legend>
          <div className="tiv-seg">
            {Tone.options.map((tone) => (
              <label key={tone} data-tone={tone}>
                <input
                  type="radio"
                  name={`zone-${zone.id}-tone`}
                  checked={zone.tone === tone}
                  onChange={() => {
                    setZone(zone.id, { tone });
                  }}
                />
                <span className="tiv-dot" aria-hidden="true" />{" "}
                {TONE_NAME[tone]}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="tiv-dactions">
          <Button
            onClick={() => {
              removeZone(zone.id);
              useUi.getState().select(undefined);
            }}
          >
            Zone entfernen
          </Button>
        </div>
      </fieldset>
    </details>
  );
}
