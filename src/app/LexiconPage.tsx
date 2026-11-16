import { useEffect, useRef } from "react";
import { Sources } from "../panels/DetailPanel";
import { useCatalog } from "../store";
import "./lexicon.css";

const FIELDS = [
  ["purpose", "Wozu"],
  ["where", "Wo / Wer"],
  ["connected", "Verbunden mit"],
  ["fault", "Typische Störung"],
  ["confusion", "Nicht verwechseln mit"],
] as const;

/** Adresse der Lexikon-Seite (#188); der Baukasten bleibt dahinter erhalten. */
export const LEXICON_HASH = "#/lexikon";

/** Lexikon (#188): ein Eintrag je Gerätetyp. */
export function LexiconPage() {
  const catalog = useCatalog((s) => s.catalog);
  const ref = useRef<HTMLElement>(null);
  // Fokus auf die neue Seite, damit Screenreader den Wechsel bemerken (D10)
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <main ref={ref} tabIndex={-1} className="tiv-page">
      <h2>Lexikon</h2>
      <p>
        <a href="#/">Zurück zum Baukasten</a>
      </p>
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
    </main>
  );
}
