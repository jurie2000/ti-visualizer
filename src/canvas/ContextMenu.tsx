import { Lock } from "lucide-react";
import { useEffect, useRef, type KeyboardEvent } from "react";

export interface MenuEntry {
  id: string;
  label: string;
  /** Gesetzt: Eintrag ist ausgegraut und nennt die Begründung (FR-7). */
  disabledReason?: string;
  onSelect: () => void;
}

interface Props {
  x: number;
  y: number;
  title: string;
  entries: MenuEntry[];
  onClose: () => void;
}

const WIDTH = 288;

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

  return (
    <ul
      ref={ref}
      role="menu"
      aria-label={title}
      className="tiv-menu nodrag nopan"
      style={{
        left: Math.max(0, Math.min(x, window.innerWidth - WIDTH)),
        top: Math.max(
          0,
          Math.min(y, window.innerHeight - 40 * entries.length - 16),
        ),
      }}
      onKeyDown={onKeyDown}
    >
      {entries.map((entry) => (
        <li key={entry.id} role="none">
          <button
            type="button"
            role="menuitem"
            className="tiv-menu__item"
            aria-disabled={entry.disabledReason ? true : undefined}
            aria-describedby={
              entry.disabledReason ? `tiv-menu-why-${entry.id}` : undefined
            }
            onClick={() => {
              choose(entry);
            }}
          >
            {entry.disabledReason && <Lock size={14} aria-hidden="true" />}
            {entry.label}
            {entry.disabledReason && (
              <span id={`tiv-menu-why-${entry.id}`} className="tiv-menu__why">
                {entry.disabledReason}
              </span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
