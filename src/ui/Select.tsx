import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

export interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  id: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  "aria-describedby"?: string;
}

/**
 * Auswahlliste im Stil der App statt des System-Menüs. ARIA-Combobox-Muster
 * mit Listbox: Pfeiltasten, Home/Ende, Enter und Leertaste wählen, Esc schließt.
 */
export function Select({ id, value, options, onChange, ...aria }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const selected = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as globalThis.Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => {
      document.removeEventListener("pointerdown", away);
    };
  }, [open]);

  const show = () => {
    setActive(selected);
    setOpen(true);
  };
  const pick = (i: number) => {
    const o = options[i];
    if (o) onChange(o.value);
    setOpen(false);
  };
  const onKeyDown = (e: KeyboardEvent) => {
    const move = (i: number) => {
      e.preventDefault();
      setActive(Math.max(0, Math.min(options.length - 1, i)));
    };
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        show();
      }
      return;
    }
    if (e.key === "ArrowDown") move(active + 1);
    else if (e.key === "ArrowUp") move(active - 1);
    else if (e.key === "Home") move(0);
    else if (e.key === "End") move(options.length - 1);
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pick(active);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "Tab") setOpen(false);
  };

  return (
    <div className="tiv-select" ref={root}>
      <button
        type="button"
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-activedescendant={open ? `${id}-opt-${String(active)}` : undefined}
        aria-describedby={aria["aria-describedby"]}
        className="tiv-select__button"
        onClick={() => {
          if (open) setOpen(false);
          else show();
        }}
        onKeyDown={onKeyDown}
      >
        <span>{options[selected]?.label}</span>
        <ChevronDown aria-hidden="true" size={16} />
      </button>
      {open && (
        <ul
          id={`${id}-list`}
          role="listbox"
          aria-labelledby={id}
          className="tiv-select__list"
        >
          {options.map((o, i) => (
            // Tastatur läuft über das Combobox-Feld (aria-activedescendant)
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events
            <li
              key={o.value}
              id={`${id}-opt-${String(i)}`}
              role="option"
              aria-selected={i === selected}
              className={i === active ? "is-active" : undefined}
              onPointerEnter={() => {
                setActive(i);
              }}
              onClick={() => {
                pick(i);
              }}
            >
              <span>{o.label}</span>
              {i === selected && <Check aria-hidden="true" size={16} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
