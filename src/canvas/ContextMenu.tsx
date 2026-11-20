import { Lock } from "lucide-react";
import { useEffect, useRef, type KeyboardEvent } from "react";

export interface MenuEntry {
  id: string;
  label: string;
  /** Gesetzt: Eintrag ist ausgegraut und nennt die Begründung (FR-7). */
  disabledReason?: string;
  /** Kategorie: Einträge mit Kategorie stehen als Spalten nebeneinander (#217). */
  group?: string;
  onSelect: () => void;
}

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
    if (menu) {
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

  const item = (entry: MenuEntry) => (
    <li key={entry.id} role="none">
      <button
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
    </li>
  );

  // Spalten in Reihenfolge des ersten Auftretens der Kategorie; ungruppierte Einträge
  // (Details oben, Ausfall unten) stehen vor bzw. nach dem Spaltenblock.
  const first = entries.findIndex((e) => e.group);
  const groups = new Map<string, MenuEntry[]>();
  for (const e of entries)
    if (e.group) groups.set(e.group, [...(groups.get(e.group) ?? []), e]);
  const head = first < 0 ? entries : entries.slice(0, first);
  const tail = first < 0 ? [] : entries.slice(first).filter((e) => !e.group);

  return (
    <ul
      ref={ref}
      role="menu"
      aria-label={title}
      className={`tiv-menu nodrag nopan${groups.size > 0 ? " tiv-menu--wide" : ""}`}
      style={{ left: x, top: y }}
      onKeyDown={onKeyDown}
    >
      {head.map(item)}
      {groups.size > 0 && (
        <li role="none" className="tiv-menu__cols">
          {[...groups].map(([name, list]) => (
            <ul key={name} role="group" aria-label={name}>
              <li role="none" className="tiv-menu__head">
                {name}
              </li>
              {list.map(item)}
            </ul>
          ))}
        </li>
      )}
      {tail.map(item)}
    </ul>
  );
}
