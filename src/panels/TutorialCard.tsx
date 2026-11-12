import { useReactFlow } from "@xyflow/react";
import { useEffect, useRef } from "react";
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
 * Geführtes Tutorial (FR-20): Persona, Schritt x von y, Aufgabe mit Erledigt-
 * Hinweis, Vor und Zurück. Die Schritte sind nie gesperrt. Der Fortschritt
 * steht in den Einstellungen. Läuft innerhalb des `ReactFlowProvider`.
 */
export function TutorialCard() {
  const catalog = useCatalog((s) => s.catalog);
  const { steps, personas } = catalog.tutorial;
  const progress = useSettings((s) => s.tutorialProgress);
  const topology = useTopology((s) => s.topology);
  const played = useUi((s) => s.played);
  const { setCenter } = useReactFlow();

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

  return (
    <section className="tiv-tutorial" aria-label="Tutorial">
      {persona && (
        <img
          className="tiv-tutorial__avatar"
          src={portraits[`../assets/${persona.image}`]}
          alt={persona.alt}
          width={72}
          height={72}
        />
      )}
      <div className="tiv-tutorial__body" aria-live="polite">
        <p className="tiv-tutorial__kicker">
          Teil {step.part === "praxis" ? "1: Arztpraxis" : "2: Apotheke"} ·
          Schritt {index + 1} von {steps.length}
        </p>
        <h2>{step.title}</h2>
        <p className="tiv-tutorial__story">
          <strong>{persona?.name}</strong> ({persona?.text}): „{step.story}“
        </p>
        <p>{step.text}</p>
        {step.task && (
          <p className="tiv-tutorial__task" data-done={done}>
            <strong>{done ? "Erledigt: " : "Aufgabe: "}</strong>
            {step.task}
          </p>
        )}
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
        {!last && (
          <Button
            onClick={() => {
              close(false);
            }}
          >
            Tutorial schließen
          </Button>
        )}
      </div>
    </section>
  );
}
