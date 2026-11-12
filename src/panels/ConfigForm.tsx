import { useState } from "react";
import {
  configVariantOf,
  configVariants,
  type Catalog,
  type Node,
} from "../schema";
import { simLocked, useCatalog, useSim, useTopology } from "../store";

type Kind = "text" | "number" | "date" | "bool" | "radio";
type Entry = Catalog["configDefaults"][number];

const KIND: Record<string, Kind> = {
  ip: "text",
  mask: "text",
  gateway: "text",
  dns: "text",
  vlan: "text",
  workplace: "text",
  timeOffset: "number",
  certExpires: "date",
  lastTimeSync: "date",
  dhcp: "bool",
  dhcpServer: "bool",
  sis: "bool",
  routeTI: "bool",
  paired: "bool",
  updateOk: "bool",
  ipsecAllowed: "bool",
  mode: "radio",
  pairedWith: "radio",
};

const FORMAT: Record<string, string> = {
  ip: "IPv4-Adresse, z. B. 192.168.10.2",
  mask: "IPv4-Adresse, z. B. 255.255.255.0",
  gateway: "IPv4-Adresse, z. B. 192.168.10.2",
  dns: "IPv4-Adresse, z. B. 192.168.10.2",
  vlan: "höchstens 32 Zeichen",
  workplace: "höchstens 100 Zeichen",
  timeOffset: "ganze Zahl in Sekunden",
  certExpires: "Datum, JJJJ-MM-TT",
  lastTimeSync: "Datum, JJJJ-MM-TT",
};

const show = (v: string | number | boolean) =>
  typeof v === "boolean" ? (v ? "ja" : "nein") : String(v);

/** Standard aus dem Katalog; bei abgeleiteten Feldern (`default` null) steht die Beschreibung in `rule`. */
const hintOf = (e: Entry) =>
  e.default === null
    ? `Standard: ${e.rule}`
    : `Standard: ${show(e.default)}${e.rule === "keine" ? "" : ` · ${e.rule}`}`;

const valueOf = (node: Node, field: string) =>
  (node.config as Record<string, string | number | boolean> | undefined)?.[
    field
  ];

/** Texteingabe: übernimmt erst bei Verlassen oder Enter (ein Rückgängig-Schritt, kein Verlust bei Tippfehlern). */
function InputField({
  node,
  entry,
  kind,
  id,
}: {
  node: Node;
  entry: Entry;
  kind: "text" | "number" | "date";
  id: string;
}) {
  const setConfig = useTopology((s) => s.setConfig);
  const stored = valueOf(node, entry.field);
  const storedText = stored === undefined ? "" : String(stored);
  const [draft, setDraft] = useState(storedText);
  const [error, setError] = useState<string>();
  // Folgt dem gespeicherten Wert (Rückgängig), ohne das Feld neu einzuhängen: der Fokus bleibt.
  const [seen, setSeen] = useState(storedText);
  if (seen !== storedText) {
    setSeen(storedText);
    setDraft(storedText);
    setError(undefined);
  }
  const commit = (badInput = false) => {
    const raw = draft.trim();
    // Unvollständiges Datum liefert "": nicht als Löschen werten, sonst geht der Wert verloren.
    if (badInput) {
      setError(`${entry.name}: unvollständiges Datum.`);
      return;
    }
    if (raw === storedText) {
      setError(undefined);
      return;
    }
    const r = setConfig(node.id, {
      [entry.field]:
        raw === ""
          ? undefined
          : kind === "number" && /^-?\d+$/.test(raw)
            ? Number(raw)
            : raw,
    });
    setError(r.ok ? undefined : r.reason);
  };
  const format = FORMAT[entry.field];
  return (
    <div className="tiv-config__field">
      <label htmlFor={id}>{entry.name}</label>
      <input
        id={id}
        type={kind === "date" ? "date" : "text"}
        inputMode={kind === "number" ? "numeric" : undefined}
        value={draft}
        maxLength={kind === "date" ? undefined : 100}
        aria-invalid={error !== undefined}
        aria-describedby={`${id}-hint${error ? ` ${id}-err` : ""}`}
        onChange={(e) => {
          setDraft(e.target.value);
        }}
        onBlur={(e) => {
          commit(e.currentTarget.validity.badInput);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit(e.currentTarget.validity.badInput);
        }}
      />
      <p id={`${id}-hint`} className="tiv-config__hint">
        {hintOf(entry)}
      </p>
      {error && (
        <p id={`${id}-err`} role="alert" className="tiv-config__error">
          Fehler: {error}
          {format ? ` Erwartet: ${format}.` : ""}
        </p>
      )}
    </div>
  );
}

function BoolField({
  node,
  entry,
  id,
}: {
  node: Node;
  entry: Entry;
  id: string;
}) {
  const setConfig = useTopology((s) => s.setConfig);
  return (
    <div className="tiv-config__field">
      <label>
        <input
          type="checkbox"
          checked={valueOf(node, entry.field) === true}
          aria-describedby={`${id}-hint`}
          onChange={(e) => {
            setConfig(node.id, { [entry.field]: e.target.checked });
          }}
        />{" "}
        {entry.name}
      </label>
      <p id={`${id}-hint`} className="tiv-config__hint">
        {hintOf(entry)}
      </p>
    </div>
  );
}

function RadioField({
  node,
  entry,
  id,
  options,
}: {
  node: Node;
  entry: Entry;
  id: string;
  options: { value: string; label: string }[];
}) {
  const setConfig = useTopology((s) => s.setConfig);
  const current = valueOf(node, entry.field);
  return (
    <fieldset className="tiv-config__field" aria-describedby={`${id}-hint`}>
      <legend>{entry.name}</legend>
      <div className="tiv-seg">
        {options.map((o) => (
          <label key={o.value}>
            <input
              type="radio"
              name={id}
              checked={(current ?? "") === o.value}
              onChange={() => {
                setConfig(node.id, { [entry.field]: o.value || undefined });
              }}
            />{" "}
            {o.label}
          </label>
        ))}
      </div>
      <p id={`${id}-hint`} className="tiv-config__hint">
        {hintOf(entry)}
      </p>
    </fieldset>
  );
}

/** Formular Geräteeinstellungen (Regelwerk 8), nur im Modus Erweitert (FR-17). */
export function ConfigForm({ node }: { node: Node }) {
  const catalog = useCatalog((s) => s.catalog);
  const topology = useTopology((s) => s.topology);
  const locked = simLocked(useSim((s) => s.sim));
  const type = catalog.deviceTypes.find((d) => d.id === node.type);
  const variant = type && configVariantOf(type.capabilities);
  if (!variant) return null;
  const fields = Object.keys(configVariants[variant].shape);
  const zugaenge = topology.nodes.filter((n) =>
    catalog.deviceTypes
      .find((d) => d.id === n.type)
      ?.capabilities.includes("zugang"),
  );
  return (
    <fieldset className="tiv-config" disabled={locked}>
      <legend>Geräteeinstellungen</legend>
      {locked && <p>Während der Simulation gesperrt.</p>}
      {catalog.configDefaults
        .filter((e) => fields.includes(e.field) && e.field in KIND)
        .map((e) => {
          const kind = KIND[e.field] ?? "text";
          const id = `cfg-${node.id}-${e.field}`;
          if (kind === "bool")
            return <BoolField key={id} node={node} entry={e} id={id} />;
          if (kind === "radio")
            return (
              <RadioField
                key={id}
                node={node}
                entry={e}
                id={id}
                options={
                  e.field === "mode"
                    ? [
                        { value: "reihe", label: "Reihe" },
                        { value: "parallel", label: "Parallel" },
                      ]
                    : [
                        { value: "", label: "keiner" },
                        ...zugaenge.map((z) => ({
                          value: z.id,
                          label: z.label ?? z.id,
                        })),
                      ]
                }
              />
            );
          return (
            <InputField key={id} node={node} entry={e} kind={kind} id={id} />
          );
        })}
    </fieldset>
  );
}
