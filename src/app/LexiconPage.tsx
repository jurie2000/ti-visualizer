import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useCatalog } from "../store";
import "./lexicon.css";

/** Adresse der Lexikon-Seite (#188); `#/lexikon/<Gerätetyp>` wählt den Eintrag. */
export const LEXICON_HASH = "#/lexikon";

const DEFAULT_ENTRY = "kon";
const GLOSSARY = "glossar";

// Punktfarben aus dem Mockup, nur hier gebraucht (Katalogfarben gehören der Canvas)
const DOT: Record<string, string> = {
  primary: "#6E8B5A",
  computer: "#8C7A5B",
  card: "#B5653C",
  terminal: "#C99A3E",
  lan: "#5E8C7E",
  network: "#4F6B3A",
  service: "#7FA05A",
  zentral: "#8E6E8C",
  versicherte: "#B07263",
};

const pick = (id: string) => {
  location.hash = `${LEXICON_HASH}/${id}`;
};

const Dot = ({ color }: { color: string }) => (
  <span className="tiv-lex__dot" style={{ background: color }} aria-hidden />
);

/** Lexikon (#188) nach dem Mockup: Suche, Kategorien, Begriffsliste, Detailkarte, Glossar. */
export function LexiconPage({ entry }: { entry?: string }) {
  const catalog = useCatalog((s) => s.catalog);
  const ref = useRef<HTMLElement>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  // Fokus auf die neue Seite, damit Screenreader den Wechsel bemerken (D10)
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);

  const categories = [...catalog.categories].sort((a, b) => a.order - b.order);
  const entries = catalog.lexicon.flatMap((e) => {
    const type = catalog.deviceTypes.find((t) => t.id === e.id);
    return type ? [{ ...e, type }] : [];
  });
  const byId = (id: string) => entries.find((e) => e.id === id);
  const needle = q.trim().toLowerCase();
  const has = (...xs: string[]) => xs.join(" ").toLowerCase().includes(needle);
  const hits = entries.filter((e) =>
    has(e.type.name, e.type.abbr, e.short, e.purpose),
  );
  const glossary = catalog.glossary.filter((g) => has(g.term, g.text));
  const list = hits.filter((e) => cat === "all" || e.type.category === cat);
  const sel = byId(entry ?? "") ?? byId(DEFAULT_ENTRY) ?? entries[0];
  const selCat = categories.find((c) => c.id === sel?.type.category);

  const navItem = (id: string, label: string, count: number, dot: string) => (
    <button
      key={id}
      type="button"
      className="tiv-lex__nav"
      aria-current={cat === id || undefined}
      onClick={() => {
        setCat(id);
      }}
    >
      <span className="tiv-lex__navlabel">
        <Dot color={dot} />
        {label}
      </span>
      <span className="tiv-lex__count">{count}</span>
    </button>
  );

  return (
    <main ref={ref} tabIndex={-1} className="tiv-lex">
      <div className="tiv-lex__hero">
        <div className="tiv-lex__blob tiv-lex__blob--a" aria-hidden />
        <div className="tiv-lex__blob tiv-lex__blob--b" aria-hidden />
        <div className="tiv-lex__herobody">
          <div className="tiv-lex__intro">
            <div className="tiv-lex__kicker">
              <span className="tiv-lex__badge" aria-hidden>
                TI
              </span>
              <span>eHealth · Telematikinfrastruktur</span>
            </div>
            <h2>TI-Lexikon</h2>
            <p>
              Alle {entries.length} Komponenten der Telematikinfrastruktur – was
              sie tun, wo sie stehen, womit sie verbunden sind und was
              typischerweise schiefgeht.
            </p>
          </div>
          <div className="tiv-lex__search">
            <label htmlFor="lexsuche">Begriff suchen</label>
            <div>
              <Search size={18} aria-hidden />
              <input
                id="lexsuche"
                type="search"
                value={q}
                placeholder="z. B. Konnektor, SMC-B, KIM …"
                onChange={(e) => {
                  setQ(e.target.value);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="tiv-lex__layout">
        <nav aria-label="Kategorien" className="tiv-lex__cats">
          <span className="tiv-lex__label tiv-lex__label--nav">Kategorien</span>
          {navItem("all", "Alle Komponenten", hits.length, "var(--lex-muted)")}
          {categories.map((c) =>
            navItem(
              c.id,
              c.name,
              hits.filter((e) => e.type.category === c.id).length,
              DOT[c.id] ?? c.color,
            ),
          )}
          {navItem(
            GLOSSARY,
            "Abkürzungsglossar",
            glossary.length,
            "var(--lex-text)",
          )}
          <div className="tiv-lex__terms">
            <span className="tiv-lex__label">Zwei Begriffe vorab</span>
            <div>
              <strong>Zugang</strong>
              <span>
                Das Gerät, das eine Einrichtung mit der TI verbindet: Konnektor,
                Highspeed-Konnektor oder TI-Gateway.
              </span>
            </div>
            <div>
              <strong>Zentrales Netz</strong>
              <span>
                Das geschlossene Netz der TI mit Fachdiensten und zentralen
                Diensten. Hinein nur über den VPN-Zugangsdienst.
              </span>
            </div>
          </div>
        </nav>

        <div className="tiv-lex__main">
          {cat === GLOSSARY ? (
            <section className="tiv-lex__glossary">
              <div className="tiv-lex__glosshead">
                <h3>Abkürzungsglossar</h3>
                <span>{glossary.length} Einträge</span>
              </div>
              <div className="tiv-lex__scroll">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Abkürzung</th>
                      <th scope="col">Bedeutung</th>
                    </tr>
                  </thead>
                  <tbody>
                    {glossary.map((g) => (
                      <tr key={g.term}>
                        <td>{g.term}</td>
                        <td>{g.text}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : (
            <div className="tiv-lex__entries">
              <section aria-label="Begriffe" className="tiv-lex__list">
                <div className="tiv-lex__listhead">
                  <h3>
                    {cat === "all"
                      ? "Alle Komponenten"
                      : categories.find((c) => c.id === cat)?.name}
                  </h3>
                  <span>{list.length} Begriffe</span>
                </div>
                {list.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    className="tiv-lex__item"
                    aria-current={e.id === sel?.id || undefined}
                    onClick={() => {
                      pick(e.id);
                    }}
                  >
                    <span className="tiv-lex__itemhead">
                      <span className="tiv-lex__abbr">{e.type.abbr}</span>
                      <strong>{e.type.name}</strong>
                    </span>
                    <span>{e.short}</span>
                  </button>
                ))}
                {list.length === 0 && (
                  <div className="tiv-lex__empty">
                    Kein Begriff passt zu „{q}“.
                  </div>
                )}
              </section>

              {sel && (
                <article className="tiv-lex__detail">
                  <div className="tiv-lex__title">
                    <span className="tiv-lex__navlabel">
                      <Dot
                        color={DOT[selCat?.id ?? ""] ?? "var(--lex-muted)"}
                      />
                      {selCat?.name}
                    </span>
                    <h3>
                      {sel.type.name}
                      {sel.type.name.includes(sel.type.abbr)
                        ? ""
                        : ` (${sel.type.abbr})`}
                    </h3>
                    <p>{sel.short}</p>
                  </div>
                  <div className="tiv-lex__facts">
                    <div className="tiv-lex__wide">
                      <h4>Wozu</h4>
                      <p>{sel.purpose}</p>
                    </div>
                    <div>
                      <h4>Wo / Wer</h4>
                      <p>{sel.where}</p>
                    </div>
                    <div>
                      <h4>Verbunden mit</h4>
                      <p>{sel.connected}</p>
                    </div>
                  </div>
                  <div className="tiv-lex__fault">
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M12 3l9.5 17h-19z" />
                      <path d="M12 10v4" />
                      <path d="M12 17.5v.01" />
                    </svg>
                    <div>
                      <h4>Typische Störung</h4>
                      <p>{sel.fault}</p>
                    </div>
                  </div>
                  <div className="tiv-lex__confusion">
                    <h4>Nicht verwechseln mit</h4>
                    <p>{sel.confusion}</p>
                    {sel.related.length > 0 && (
                      <div className="tiv-lex__related">
                        {sel.related.map((id) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => {
                              setCat("all");
                              pick(id);
                            }}
                          >
                            → {byId(id)?.type.name ?? id}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="tiv-lex__sources">
                    <span className="tiv-lex__label">Quelle</span>
                    {sel.source.map((id) => {
                      const s = catalog.sources.find((x) => x.id === id);
                      return s ? (
                        <a
                          key={id}
                          href={s.url}
                          title={s.title}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {id}
                        </a>
                      ) : (
                        <span key={id}>{id}</span>
                      );
                    })}
                  </div>
                </article>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
