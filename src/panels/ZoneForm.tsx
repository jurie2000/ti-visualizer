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
  numeric,
  onCommit,
}: {
  id: string;
  label: string;
  stored: string;
  hint: string;
  numeric?: boolean;
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
  return (
    <div className="tiv-config__field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="text"
        inputMode={numeric ? "numeric" : undefined}
        value={draft}
        aria-invalid={error !== undefined}
        aria-describedby={`${id}-hint${error ? ` ${id}-err` : ""}`}
        onChange={(e) => {
          setDraft(e.target.value);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
        }}
      />
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

/** Zone bearbeiten (FR-15): benennen, einfärben (feste Töne), Größe, entfernen. Verschieben geht auf der Canvas (Maus oder Pfeiltasten). */
export function ZoneForm({ zone }: { zone: Zone }) {
  const setZone = useTopology((s) => s.setZone);
  const removeZone = useTopology((s) => s.removeZone);
  const locked = simLocked(useSim((s) => s.sim));
  const side = (key: "w" | "h") => (raw: string) =>
    /^\d+$/.test(raw.trim())
      ? setZone(zone.id, { [key]: Number(raw) })
      : ({ ok: false, reason: "Bitte eine ganze Zahl eingeben." } as const);
  return (
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
              <span className="tiv-dot" aria-hidden="true" /> {TONE_NAME[tone]}
            </label>
          ))}
        </div>
      </fieldset>
      <Field
        id={`zone-${zone.id}-w`}
        label="Breite"
        stored={String(zone.area.w)}
        hint="ganze Zahl; Geräte in der Zone gehören dazu"
        numeric
        onCommit={side("w")}
      />
      <Field
        id={`zone-${zone.id}-h`}
        label="Höhe"
        stored={String(zone.area.h)}
        hint="ganze Zahl"
        numeric
        onCommit={side("h")}
      />
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
  );
}
