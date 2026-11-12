import { Panel, useReactFlow } from "@xyflow/react";
import { Circle, Square } from "lucide-react";
import { useEffect, useState, type PointerEvent } from "react";
import type { ZoneShape } from "../schema";
import { simLocked, useSim, useTopology, useUi } from "../store";
import { useToast } from "../ui/Toast";

/** Mindestgröße einer aufgezogenen Zone in Flusskoordinaten (Mockup `zdraw`: 40 × 30). */
export const MIN_ZONE = { w: 40, h: 30 };

const TOOLS: { shape: ZoneShape; label: string; Icon: typeof Square }[] = [
  { shape: "rect", label: "Rechteck", Icon: Square },
  { shape: "ellipse", label: "Ellipse", Icon: Circle },
];

interface Drag {
  /** Ecken in Bildschirmkoordinaten (Vorschau) und Flusskoordinaten (Ergebnis). */
  a: { x: number; y: number; fx: number; fy: number };
  b: { x: number; y: number; fx: number; fy: number };
}

/**
 * Zonen-Werkzeug (T-715, FR-15, Mockup `drawTools`/`zdraw`): Form wählen, dann die Zone auf der
 * Fläche aufziehen. Esc oder derselbe Knopf bricht ab, danach ist die Zone gewählt. Das Aufziehen
 * ist Mausbedienung, einen Tastaturweg gibt es nicht (D10-Ausnahme, Entscheidung Justin 2026-11-12, plan.md).
 */
export function ZoneTools() {
  const tool = useUi((s) => s.zoneTool);
  const locked = simLocked(useSim((s) => s.sim));
  const active = tool !== undefined && !locked;
  const { screenToFlowPosition } = useReactFlow();
  const addZone = useTopology((s) => s.addZone);
  const toast = useToast();
  const [drag, setDrag] = useState<Drag>();

  // Startet die Simulation, ist die Fläche gesperrt: das Werkzeug fällt zurück
  useEffect(() => {
    if (locked && tool) useUi.getState().setZoneTool(undefined);
  }, [locked, tool]);

  useEffect(() => {
    if (!tool) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      useUi.getState().setZoneTool(undefined);
      setDrag(undefined);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [tool]);

  const point = (e: PointerEvent) => {
    const f = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, fx: f.x, fy: f.y };
  };
  const finish = () => {
    if (!drag || !tool) return;
    const w = Math.abs(drag.b.fx - drag.a.fx);
    const h = Math.abs(drag.b.fy - drag.a.fy);
    setDrag(undefined);
    if (w < MIN_ZONE.w || h < MIN_ZONE.h) return;
    const r = addZone(
      {
        x: Math.round(Math.min(drag.a.fx, drag.b.fx)),
        y: Math.round(Math.min(drag.a.fy, drag.b.fy)),
        w: Math.round(w),
        h: Math.round(h),
      },
      undefined,
      tool,
    );
    if (!r.ok) {
      toast.show(r.reason);
      return;
    }
    useUi.getState().setZoneTool(undefined);
    if (r.id) useUi.getState().select({ kind: "zone", id: r.id });
  };

  return (
    <>
      <Panel position="top-left" className="tiv-drawbar">
        <div
          role="group"
          aria-label="Zone zeichnen"
          className="tiv-drawbar__bar"
        >
          <span className="tiv-drawbar__title">Zone zeichnen</span>
          {TOOLS.map(({ shape, label, Icon }) => (
            <button
              key={shape}
              type="button"
              className="tiv-drawbar__btn"
              aria-pressed={tool === shape}
              disabled={locked}
              title={`${label} als Zone aufziehen`}
              aria-label={`${label} als Zone aufziehen`}
              onClick={() => {
                useUi
                  .getState()
                  .setZoneTool(tool === shape ? undefined : shape);
              }}
            >
              <Icon size={15} aria-hidden="true" />
              {label}
            </button>
          ))}
          {active && (
            <span className="tiv-drawbar__hint">
              {`${TOOLS.find((t) => t.shape === tool)?.label ?? ""} auf der Fläche aufziehen · Esc bricht ab`}
            </span>
          )}
        </div>
      </Panel>
      {active && (
        <div
          className="tiv-zonedraw"
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            const p = point(e);
            setDrag({ a: p, b: p });
          }}
          onPointerMove={(e) => {
            if (drag) setDrag({ ...drag, b: point(e) });
          }}
          onPointerUp={finish}
          onPointerCancel={() => {
            setDrag(undefined);
          }}
        >
          {drag && (
            <div
              className={`tiv-zonedraw__box${tool === "ellipse" ? " is-ellipse" : ""}`}
              style={{
                left: Math.min(drag.a.x, drag.b.x),
                top: Math.min(drag.a.y, drag.b.y),
                width: Math.abs(drag.b.x - drag.a.x),
                height: Math.abs(drag.b.y - drag.a.y),
              }}
            />
          )}
        </div>
      )}
    </>
  );
}
