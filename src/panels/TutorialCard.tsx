import { useReactFlow } from "@xyflow/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { NODE_SIZE } from "../canvas/deviceStyle";
import { APOTHEKEN_ZONE, stepDone } from "../engine/tutorialChecks";
import { containedNodes } from "../engine/zones";
import { useCatalog, useSettings, useSim, useTopology, useUi } from "../store";
import { Button } from "../ui/Button";
import "./tutorial.css";

// Vite liefert die Porträts als Datei aus (CSP: img-src 'self').
const portraits = import.meta.glob<string>("../assets/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
});

const ZONE = { w: 480, h: 320, gap: 120 };

/**
 * Geführtes Tutorial (FR-20): schwebende Karte unten links wie im Mockup mit
 * Fortschrittsbalken, Persona, Aufgabe mit Erledigt-Hinweis, Vor und Zurück. Die Schritte sind nie gesperrt. Der Fortschritt
 * steht in den Einstellungen. Läuft innerhalb des `ReactFlowProvider`.
 */
export function TutorialCard() {
  const catalog = useCatalog((s) => s.catalog);
  const { steps, personas } = catalog.tutorial;
  const progress = useSettings((s) => s.tutorialProgress);
  const topology = useTopology((s) => s.topology);
  const played = useUi((s) => s.played);
  const { setCenter } = useReactFlow();
  const [minimiert, setMinimiert] = useState(false);
  // Ohne Maus oder Fokus schrumpft die Karte auf die aktuelle Aufgabe (Mockup `tutCompact`).
  const [offen, setOffen] = useState(true);
  const zu = useRef<number>(undefined);
  const wurdeUmgeschaltet = useRef(false);
  // Der fokussierte Knopf wird beim Umschalten ausgehängt: Fokus auf den Gegenknopf (D10).
  useEffect(() => {
    if (!wurdeUmgeschaltet.current) return;
    document
      .querySelector<HTMLElement>(
        minimiert ? ".tiv-tutorial-mini" : ".tiv-tutorial__icon",
      )
      ?.focus();
  }, [minimiert]);
  const zeige = (an: boolean) => {
    window.clearTimeout(zu.current);
    if (an) setOffen(true);
    else
      zu.current = window.setTimeout(() => {
        setOffen(false);
      }, 350);
  };
  useEffect(
    () => () => {
      window.clearTimeout(zu.current);
    },
    [],
  );

  const index = Math.min(progress, steps.length - 1);
  const step = steps[index];
  const persona = personas.find((p) => p.id === step?.persona);
  const zone = topology.zones.find((z) => z.label === APOTHEKEN_ZONE);
  const needZone = step?.part === "apotheke" && !zone;
  // Nur einmal je Karte anlegen: Rückgängig darf keine weitere Zone nachziehen.
  const zoneAngelegt = useRef(false);

  // Merkt Aktionen, die der Player ohne Problem bis zum Ende abspielte.
  useEffect(
    () =>
      useSim.subscribe((s, prev) => {
        if (s.sim.status !== "done" || prev.sim.status === "done") return;
        if (s.steps.some((b) => b.problem)) return;
        const id = catalog.actions.find((a) => a.name === s.name)?.id;
        if (id) useUi.getState().markPlayed(id);
      }),
    [catalog],
  );

  // Teil 2 braucht den Bereich der Apotheke: unter die Praxis legen und die
  // Ansicht dorthin setzen, denn die Palette setzt neue Geräte in die Mitte.
  useEffect(() => {
    if (!needZone || zoneAngelegt.current) return;
    zoneAngelegt.current = true;
    const t = useTopology.getState();
    if (t.topology.zones.some((z) => z.label === APOTHEKEN_ZONE)) return;
    const { nodes } = t.topology;
    const x = Math.min(0, ...nodes.map((n) => n.position.x));
    const y =
      Math.max(-ZONE.gap, ...nodes.map((n) => n.position.y)) +
      NODE_SIZE.height +
      ZONE.gap;
    const r = t.addZone({ x, y, w: ZONE.w, h: ZONE.h }, APOTHEKEN_ZONE);
    if (!r.ok) return;
    void setCenter(x + ZONE.w / 2, y + ZONE.h / 2, { zoom: 1 });
  }, [needZone, setCenter]);

  if (!step) return null;
  const apo = new Set(
    zone
      ? containedNodes(zone, topology.nodes, NODE_SIZE).map((n) => n.id)
      : [],
  );
  const done = stepDone(step.id, { topology, apo, played: new Set(played) });
  const last = index === steps.length - 1;
  const kompakt = !offen && !!step.task && !done;
  const go = (to: number) => {
    useSettings.getState().set({ tutorialProgress: to });
  };
  const close = (finished: boolean) => {
    if (finished) go(0);
    useUi.getState().setTutorial(false);
    document
      .querySelector<HTMLElement>(".tiv-side--left .tiv-rail button")
      ?.focus();
  };

  const kicker = `Tutorial · Teil ${step.part === "praxis" ? "1: Arztpraxis" : "2: Apotheke"} · ${String(index + 1)}/${String(steps.length)}`;
  if (minimiert) {
    return (
      <button
        type="button"
        className="tiv-tutorial-mini"
        onClick={() => {
          wurdeUmgeschaltet.current = true;
          setMinimiert(false);
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m7 4 13 8-13 8z" />
        </svg>
        Tutorial · Schritt {index + 1} von {steps.length}
      </button>
    );
  }

  return (
    <section
      className="tiv-tutorial"
      aria-label="Tutorial"
      data-compact={kompakt}
      onMouseEnter={() => {
        zeige(true);
      }}
      onMouseLeave={() => {
        zeige(false);
      }}
      onFocus={() => {
        zeige(true);
      }}
      onBlur={() => {
        zeige(false);
      }}
    >
      <div className="tiv-tutorial__head">
        <p className="tiv-tutorial__kicker" aria-live="polite">
          {kicker}
        </p>
        <button
          type="button"
          className="tiv-tutorial__icon"
          aria-label="Tutorial einklappen"
          onClick={() => {
            wurdeUmgeschaltet.current = true;
            setMinimiert(true);
          }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h14" />
          </svg>
        </button>
        <button
          type="button"
          className="tiv-tutorial__icon"
          aria-label="Tutorial schließen"
          onClick={() => {
            close(false);
          }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
      <div className="tiv-tutorial__bar" aria-hidden="true">
        <div
          style={{
            width: `${String(Math.round(((index + (done ? 1 : 0)) / steps.length) * 100))}%`,
          }}
        />
      </div>
      <div className="tiv-tutorial__body" aria-live="polite">
        <h2>{step.title}</h2>
        <Zuklappbar offen={!kompakt}>
          <div className="tiv-tutorial__story">
            {persona && (
              <img
                src={portraits[`../assets/${persona.image}`]}
                alt={persona.alt}
                width={44}
                height={44}
              />
            )}
            <p>
              <strong>
                {persona?.name}, {persona?.text}
              </strong>
              {step.story}
            </p>
          </div>
          <p>{step.text}</p>
        </Zuklappbar>
        {step.task && (
          <p className="tiv-tutorial__task" data-done={done}>
            <span className="tiv-tutorial__check" aria-hidden="true">
              {done && (
                <svg viewBox="0 0 24 24">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              )}
            </span>
            <span>
              <strong>{done ? "Erledigt: " : "Aufgabe: "}</strong>
              {step.task}
            </span>
          </p>
        )}
        <Zuklappbar offen={kompakt}>
          <p className="tiv-tutorial__hint">
            Maus hierher bewegen für die Erklärung
          </p>
        </Zuklappbar>
      </div>
      <div className="tiv-tutorial__nav">
        <Button
          disabled={index === 0}
          onClick={() => {
            go(index - 1);
          }}
        >
          Zurück
        </Button>
        <span className="tiv-tutorial__spacer" />
        {last ? (
          <Button
            variant="primary"
            onClick={() => {
              close(true);
            }}
          >
            Tutorial beenden
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={() => {
              go(index + 1);
            }}
          >
            Weiter
          </Button>
        )}
      </div>
    </section>
  );
}

/** Klappt Inhalt per CSS weich zu; `inert` nimmt ihn dabei aus Tab-Reihenfolge und Vorlesen. */
function Zuklappbar({
  offen,
  children,
}: {
  offen: boolean;
  children: ReactNode;
}) {
  return (
    <div className="tiv-collapse" data-open={offen} inert={!offen}>
      <div>{children}</div>
    </div>
  );
}
