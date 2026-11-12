import { useConnection, useStore } from "@xyflow/react";
import { Pin, PinOff, type LucideIcon } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useSettings } from "../store";

export interface RailItem {
  label: string;
  icon: LucideIcon;
  /** Farbe des Symbols; der Name steht zusätzlich im Knopf, Farbe allein trägt nichts. */
  color?: string | undefined;
  active?: boolean;
  /** Der Klick öffnet das Panel nicht und holt den Fokus nicht hinein (Sicherheitsprüfung öffnet einen Dialog). */
  keepClosed?: boolean;
  onClick: () => void;
}

interface Props {
  side: "left" | "right";
  /** Schlüssel in `pinnedPanels`. */
  id: "palette" | "detail";
  label: string;
  /** Schaltet die Überlagerung unter 1100 px (T-703). */
  overlayOpen: boolean;
  rail: RailItem[];
  /** Ändert sich der Wert (z. B. neue Auswahl), öffnet das Panel kurz von selbst. */
  autoOpen?: unknown;
  children: ReactNode;
}

const OPEN_MS = 150;
const CLOSE_MS = 280;
const AUTO_CLOSE_MS = 3000;

/** Maustaste gedrückt (Ziehen, Verbinden, Aufziehen): dann öffnet nichts. */
function usePressed() {
  const pressed = useRef(false);
  useEffect(() => {
    const down = () => {
      pressed.current = true;
    };
    const up = () => {
      pressed.current = false;
    };
    window.addEventListener("pointerdown", down, true);
    for (const t of ["pointerup", "pointercancel", "dragend", "drop"])
      window.addEventListener(t, up, true);
    return () => {
      window.removeEventListener("pointerdown", down, true);
      for (const t of ["pointerup", "pointercancel", "dragend", "drop"])
        window.removeEventListener(t, up, true);
    };
  }, []);
  return pressed;
}

/**
 * Seitenleiste (T-711, FR-22): 56-px-Schiene mit Symbolen, das Panel öffnet als
 * Überlagerung bei Mauszeiger (150 ms) oder Fokus und schließt beim Verlassen
 * (280 ms) oder mit Escape. Angeheftet bleibt es offen (`pinnedPanels`).
 */
export function SidePanel({
  side,
  id,
  label,
  overlayOpen,
  rail,
  autoOpen,
  children,
}: Props) {
  const pinned = useSettings((s) => s.pinnedPanels.includes(id));
  const [shown, setShown] = useState(false);
  const timer = useRef<number>(undefined);
  const autoTimer = useRef<number>(undefined);
  const hovering = useRef(false);
  const skipFocus = useRef(false);
  const lastRail = useRef<HTMLElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const pressed = usePressed();
  const dragging = useConnection((c) => c.inProgress);
  const clicking = useStore((s) => s.connectionClickStartHandle !== null);
  const connecting = dragging || clicking;

  const schedule = (open: boolean, ms: number) => {
    window.clearTimeout(timer.current);
    window.clearTimeout(autoTimer.current);
    if (open && (pressed.current || connecting)) return;
    timer.current = window.setTimeout(() => {
      setShown(open);
    }, ms);
  };
  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      window.clearTimeout(autoTimer.current);
    },
    [],
  );

  // Neue Auswahl: Panel öffnet und klappt wieder ein, wenn niemand darauf zeigt
  useEffect(() => {
    if (autoOpen === undefined) return;
    const t = window.setTimeout(() => {
      if (pressed.current) return;
      setShown(true);
      autoTimer.current = window.setTimeout(() => {
        if (
          !hovering.current &&
          !asideRef.current?.contains(document.activeElement)
        )
          setShown(false);
      }, AUTO_CLOSE_MS);
    }, OPEN_MS);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(autoTimer.current);
    };
  }, [autoOpen, pressed]);

  // Klick auf die Fläche fährt das Panel sofort ein, auch wenn Fokus oder Zeiger noch darin lagen
  useEffect(() => {
    const down = (e: PointerEvent) => {
      if (!(e.target as Element).closest(".react-flow__pane")) return;
      window.clearTimeout(timer.current);
      window.clearTimeout(autoTimer.current);
      setShown(false);
    };
    document.addEventListener("pointerdown", down);
    return () => {
      document.removeEventListener("pointerdown", down);
    };
  }, []);

  const togglePin = () => {
    const set = useSettings.getState().set;
    const cur = useSettings.getState().pinnedPanels;
    set({
      pinnedPanels: cur.includes(id)
        ? cur.filter((p) => p !== id)
        : [...cur, id],
    });
    setShown(false);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Escape" || e.defaultPrevented || pinned || !shown) return;
    window.clearTimeout(timer.current);
    window.clearTimeout(autoTimer.current);
    setShown(false);
    skipFocus.current = true;
    (lastRail.current ?? railRef.current?.querySelector("button"))?.focus();
    skipFocus.current = false;
  };

  const open = pinned || shown;
  return (
    <div
      role="presentation"
      className={`tiv-side tiv-side--${side}`}
      data-open={open}
      data-pinned={pinned}
      onMouseEnter={() => {
        hovering.current = true;
        schedule(true, OPEN_MS);
      }}
      onMouseLeave={() => {
        hovering.current = false;
        schedule(false, CLOSE_MS);
      }}
      onFocus={() => {
        if (!skipFocus.current) {
          window.clearTimeout(timer.current);
          window.clearTimeout(autoTimer.current);
          setShown(true);
        }
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget) && !hovering.current)
          schedule(false, CLOSE_MS);
      }}
      onKeyDown={onKeyDown}
    >
      <div
        ref={railRef}
        className="tiv-rail"
        role="group"
        aria-label={`${label}, Schiene`}
      >
        {rail.map((r) => (
          <button
            key={r.label}
            type="button"
            className="tiv-rail__btn"
            aria-label={r.label}
            title={r.label}
            data-active={r.active ?? false}
            style={
              r.color ? ({ "--cat": r.color } as CSSProperties) : undefined
            }
            onFocus={(e) => {
              lastRail.current = e.currentTarget;
            }}
            onClick={() => {
              r.onClick();
              if (r.keepClosed) return;
              setShown(true);
              asideRef.current?.focus();
            }}
          >
            <r.icon size={20} aria-hidden="true" />
          </button>
        ))}
      </div>
      <aside
        ref={asideRef}
        className={`tiv-${id}`}
        aria-label={label}
        tabIndex={-1}
        data-open={overlayOpen}
      >
        <button
          type="button"
          className="tiv-side__pin"
          aria-pressed={pinned}
          aria-label={`${label} anheften`}
          title={pinned ? "Lösen (klappt automatisch ein)" : "Anheften"}
          onClick={togglePin}
        >
          {pinned ? (
            <PinOff size={14} aria-hidden="true" />
          ) : (
            <Pin size={14} aria-hidden="true" />
          )}
          Anheften
        </button>
        {children}
      </aside>
    </div>
  );
}
