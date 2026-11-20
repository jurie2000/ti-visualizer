import { Lock, X } from "lucide-react";
import { useEffect, useRef, type KeyboardEvent } from "react";

export interface MenuEntry {
  id: string;
  label: string;
  /** Gesetzt: Eintrag ist ausgegraut und nennt die Begründung (FR-7). */
  disabledReason?: string;
  /** Untergruppe im Aktionsfenster; Einträge ohne Gruppe stehen in Kopf- oder Fußzeile (#217). */
  group?: string;
  /** Spalte des Aktionsfensters; ohne Angabe „online“. */
  section?: "online" | "lokal";
  onSelect: () => void;
}

// Reihenfolge und Titel der Spalten im Aktionsfenster (#217)
const SECTIONS = [
  ["online", "Online · über TI"],
  ["lokal", "Lokal · eGK & TI 2.0"],
] as const;

interface Props {
  x: number;
  y: number;
  title: string;
  entries: MenuEntry[];
  onClose: () => void;
}

/**
 * Kontextmenü nach dem ARIA-Menümuster (D10): Pfeiltasten, Home/Ende, Enter
 * und Leertaste, Esc schließt und gibt den Fokus zurück. Ausgegraute Einträge
 * bleiben fokussierbar, damit die Begründung vorgelesen wird, und tragen
 * Schloss-Icon und Text (nicht nur Farbe).
 */
export function ContextMenu({ x, y, title, entries, onClose }: Props) {
  const ref = useRef<HTMLUListElement>(null);
  const opener = useRef<Element | null>(document.activeElement);

  const items = () =>
    Array.from(
      ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    );

  useEffect(() => {
    const menu = ref.current;
    // Echte Größe erst nach dem Zeichnen bekannt: im Fenster halten
    if (menu && !menu.classList.contains("tiv-menu--wide")) {
      menu.style.top = `${String(Math.max(0, Math.min(y, window.innerHeight - menu.offsetHeight)))}px`;
      menu.style.left = `${String(Math.max(0, Math.min(x, window.innerWidth - menu.offsetWidth)))}px`;
    }
    items()[0]?.focus();
    const back = opener.current;
    const away = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as globalThis.Node)) onClose();
    };
    document.addEventListener("pointerdown", away);
    return () => {
      document.removeEventListener("pointerdown", away);
      if (back instanceof HTMLElement) back.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur beim Öffnen
  }, []);

  const onKeyDown = (e: KeyboardEvent) => {
    const list = items();
    const at = list.indexOf(document.activeElement as HTMLElement);
    const go = (i: number) => {
      e.preventDefault();
      list[(i + list.length) % list.length]?.focus();
    };
    if (e.key === "ArrowDown") go(at + 1);
    else if (e.key === "ArrowUp") go(at - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(-1);
    else if (e.key === "Escape" || e.key === "Tab") {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
  };

  const choose = (entry: MenuEntry) => {
    if (entry.disabledReason) return;
    onClose();
    entry.onSelect();
  };

  const button = (entry: MenuEntry) => (
    <button
      key={entry.id}
      type="button"
      role="menuitem"
      className="tiv-menu__item"
      aria-disabled={entry.disabledReason ? true : undefined}
      onClick={() => {
        choose(entry);
      }}
    >
      {entry.disabledReason && <Lock size={14} aria-hidden="true" />}
      {entry.label}
      {entry.disabledReason && (
        <span className="tiv-menu__why">{entry.disabledReason}</span>
      )}
    </button>
  );
  const item = (entry: MenuEntry) => (
    <li key={entry.id} role="none">
      {button(entry)}
    </li>
  );

  // Ungruppierte Einträge: der erste (Details) steht in der Kopfzeile, der Rest in der Fußzeile.
  const first = entries.findIndex((e) => e.group);
  const wide = first >= 0;
  const head = wide ? entries.slice(0, first) : entries;
  const foot = wide ? entries.slice(first).filter((e) => !e.group) : [];
  const actions = entries.filter((e) => e.group);
  const free = actions.filter((e) => !e.disabledReason).length;
  const bySection = (section: "online" | "lokal") => {
    const groups = new Map<string, MenuEntry[]>();
    for (const e of actions)
      if ((e.section ?? "online") === section)
        groups.set(e.group ?? "", [...(groups.get(e.group ?? "") ?? []), e]);
    return [...groups];
  };
  const columns = SECTIONS.map(
    ([id, label]) => [id, label, bySection(id)] as const,
  ).filter(([, , groups]) => groups.length > 0);

  return (
    <>
      {wide && <div className="tiv-menu__backdrop" aria-hidden="true" />}
      <ul
        ref={ref}
        role="menu"
        aria-label={title}
        className={`tiv-menu nodrag nopan${wide ? " tiv-menu--wide" : ""}`}
        // Mit Aktionen öffnet das Menü als Fenster mittig, sonst am Zeiger
        style={wide ? undefined : { left: x, top: y }}
        onKeyDown={onKeyDown}
      >
        {wide && (
          <li role="none" className="tiv-menu__title">
            <strong>{title}</strong>
            <span>
              {free} von {actions.length} Aktionen verfügbar
            </span>
            <button
              type="button"
              className="tiv-menu__close"
              aria-label="Schließen"
              onClick={onClose}
            >
              <X size={18} aria-hidden="true" />
            </button>
          </li>
        )}
        {!wide && head.map((e) => item(e))}
        {wide && (
          <li role="none" className="tiv-menu__cols">
            {columns.map(([id, label, groups]) => (
              <div key={id} className="tiv-menu__col">
                <div className="tiv-menu__section" aria-hidden="true">
                  {label}
                </div>
                {groups.map(([name, list]) => (
                  <ul
                    key={name}
                    role="group"
                    aria-label={name}
                    className="tiv-menu__group"
                  >
                    <li role="none" className="tiv-menu__head">
                      {name}
                    </li>
                    {list.map(item)}
                  </ul>
                ))}
              </div>
            ))}
          </li>
        )}
        {wide && (
          <li role="none" className="tiv-menu__foot">
            <span>Simulation</span>
            {foot.map((e) => button(e))}
          </li>
        )}
      </ul>
    </>
  );
}
