import { Sources } from "../panels/DetailPanel";
import { useCatalog, useUi } from "../store";
import { Dialog } from "../ui/Dialog";
import "./lexicon.css";

const FIELDS = [
  ["purpose", "Wozu"],
  ["where", "Wo / Wer"],
  ["connected", "Verbunden mit"],
  ["fault", "Typische Störung"],
  ["confusion", "Nicht verwechseln mit"],
] as const;

/** Lexikon (#188): ein Eintrag je Gerätetyp, geöffnet über die Kopfleiste. */
export function LexiconDialog() {
  const open = useUi((s) => s.dialog === "lexicon");
  return (
    <Dialog
      open={open}
      title="Lexikon"
      onClose={() => {
        useUi.getState().openDialog(undefined);
      }}
    >
      <Eintraege />
    </Dialog>
  );
}

function Eintraege() {
  const catalog = useCatalog((s) => s.catalog);
  return (
    <>
      {catalog.lexicon.map((e) => {
        const type = catalog.deviceTypes.find((t) => t.id === e.id);
        return (
          <article key={e.id} className="tiv-lexicon">
            <h3>
              {type?.name ?? e.id}
              {type && type.abbr !== type.name ? ` (${type.abbr})` : ""}
            </h3>
            <p>{e.short}</p>
            <dl>
              {FIELDS.map(([key, name]) => (
                <div key={key}>
                  <dt>{name}</dt>
                  <dd>{e[key]}</dd>
                </div>
              ))}
            </dl>
            <Sources ids={e.source} catalog={catalog} />
          </article>
        );
      })}
    </>
  );
}
