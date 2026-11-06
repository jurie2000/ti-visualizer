import { ChevronDown, ChevronRight } from "lucide-react";
import { useId, type CSSProperties, type ReactNode } from "react";

interface Props {
  title: string;
  count: number;
  /** Farbe der Kategorie; zusätzlich steht der Name da, Farbe allein trägt nichts. */
  color?: string | undefined;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

/** Einklappbare Gruppe der Palette. */
export function PaletteGroup({
  title,
  count,
  color,
  open,
  onToggle,
  children,
}: Props) {
  const id = useId();
  const Chevron = open ? ChevronDown : ChevronRight;
  return (
    <section
      className="tiv-palette__group"
      style={color ? ({ "--cat": color } as CSSProperties) : undefined}
    >
      <h3>
        <button
          type="button"
          className="tiv-palette__head"
          aria-expanded={open}
          aria-controls={id}
          onClick={onToggle}
        >
          <Chevron size={14} aria-hidden="true" />
          <span className="tiv-palette__title">{title}</span>
          <span className="tiv-palette__count">{count}</span>
        </button>
      </h3>
      <ul id={id} hidden={!open} className="tiv-palette__list">
        {children}
      </ul>
    </section>
  );
}
