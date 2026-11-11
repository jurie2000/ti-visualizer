import { Check, Pause, Play, SkipBack, SkipForward, X } from "lucide-react";
import { useEffect, useRef, type KeyboardEvent } from "react";
import {
  bindFlow,
  stepDelayMs,
  type BoundStep,
  type Tempo,
} from "../engine/simulation";
import {
  simLocked,
  useCatalog,
  useSettings,
  useSim,
  useTopology,
  useUi,
} from "../store";
import { Button } from "../ui/Button";

const TEMPOS: Tempo[] = [0.5, 1, 2];

function problemText(step: BoundStep, nameOf: (id: string) => string) {
  switch (step.problem?.kind) {
    case "terminal-waehlen":
      return "Terminal wählen";
    case "ausgefallen":
      return `${nameOf(step.problem.at)} ist ausgefallen.`;
    case "kein-weg":
      return "Zwischen den Geräten dieses Schritts gibt es keinen Weg.";
    case "fehlt":
      return "Ein Gerät dieses Schritts fehlt in der Topologie.";
    case undefined:
      return step.anchor === undefined && step.nodes.length === 0
        ? "Dieser Schritt läuft außerhalb der Topologie."
        : "";
  }
}

/**
 * Player für die Simulation (FR-9, FR-10): übernimmt die gewählte Aktion aus
 * `useUi.pendingAction`, bindet den Ablauf und spielt ihn ab. Hervorhebung
 * und Sperre setzt die Canvas anhand von `useSim`.
 */
export function SimPlayer() {
  const { sim, steps, name, nodeId, begin, send, close } = useSim();
  const pending = useUi((s) => s.pendingAction);
  const topology = useTopology((s) => s.topology);
  const catalog = useCatalog((s) => s.catalog);
  const ref = useRef<HTMLDivElement>(null);
  const locked = simLocked(sim);

  // Neue Aktion ersetzt eine laufende Simulation.
  useEffect(() => {
    if (!pending) return;
    useUi.getState().startAction(undefined);
    const node = topology.nodes.find((n) => n.id === pending.nodeId);
    const action = catalog.actions.find((a) => a.id === pending.actionId);
    const flow = catalog.flows.find((f) => f.id === action?.flow);
    if (!node || !action || !flow) return;
    begin(
      action.name,
      node.id,
      bindFlow(flow, node, topology, catalog, pending.terminal),
    );
  }, [pending, topology, catalog, begin]);

  useEffect(() => {
    if (steps.length > 0) ref.current?.focus();
  }, [steps]);

  useEffect(() => {
    if (sim.status !== "running") return;
    const t = setTimeout(() => {
      send("next");
    }, stepDelayMs(sim.tempo));
    return () => {
      clearTimeout(t);
    };
  }, [sim, send]);

  // Öffnen, Störung, Moduswechsel und jede andere Änderung der Topologie brechen ab (Regelwerk 7).
  // Auch nach `done`: „Zurück“ setzt sonst eine Simulation mit veralteten Schritten fort.
  const live = sim.status !== "idle" && sim.status !== "cancelled";
  useEffect(() => {
    if (!live) return;
    const cancel = () => {
      send("cancel");
    };
    const offTopology = useTopology.subscribe((s, p) => {
      if (s.topology !== p.topology) cancel();
    });
    const offMode = useSettings.subscribe((s, p) => {
      if (s.mode !== p.mode) cancel();
    });
    return () => {
      offTopology();
      offMode();
    };
  }, [live, send]);

  // Canvas verschwindet (Startansicht): nichts bleibt hängen.
  useEffect(
    () => () => {
      useSim.getState().close();
    },
    [],
  );

  const nameOf = (id: string) => {
    const n = topology.nodes.find((x) => x.id === id);
    return (
      n?.label ?? catalog.deviceTypes.find((d) => d.id === n?.type)?.name ?? id
    );
  };
  const closePlayer = () => {
    close();
    document
      .querySelector<HTMLElement>(
        `.react-flow__node[data-id="${CSS.escape(nodeId)}"], [data-sim-return="${CSS.escape(nodeId)}"]`,
      )
      ?.focus();
  };
  const toggle = () => {
    send(sim.status === "running" ? "pause" : "resume");
  };
  const onKeyDown = (e: KeyboardEvent) => {
    // Leertaste auf einem Knopf löst den Knopf aus, nicht den Player
    const own = e.target === e.currentTarget;
    if (e.key === "Escape") {
      if (locked) send("cancel");
      else closePlayer();
    } else if (e.key === "ArrowRight") send("next");
    else if (e.key === "ArrowLeft") send("prev");
    else if (e.key === " " && own && locked) toggle();
    else return;
    e.preventDefault();
    e.stopPropagation();
  };

  const step = steps[sim.step];
  const failed = step?.problem?.kind === "ausgefallen";
  // Zustand steht als Text und Icon im Badge, die Farbe kommt dazu (D10)
  const badge =
    sim.status === "done"
      ? { tone: "ok", Icon: Check, text: "Abgeschlossen" }
      : sim.status === "cancelled"
        ? { tone: "error", Icon: X, text: "Abgebrochen" }
        : failed
          ? { tone: "error", Icon: X, text: "Gestört" }
          : sim.status === "paused"
            ? { tone: "warn", Icon: Pause, text: "Pausiert" }
            : { tone: "warn", Icon: Play, text: "Läuft" };
  const progress =
    sim.status === "done"
      ? `Alle ${String(steps.length)} Schritte abgeschlossen`
      : sim.status === "cancelled"
        ? `Abgebrochen bei Schritt ${String(sim.step + 1)}`
        : `Schritt ${String(Math.min(sim.step + 1, steps.length))} von ${String(steps.length)}`;
  const problem = step ? problemText(step, nameOf) : "";

  return (
    // Tastenkürzel des Players (Space, Pfeile, Esc): Container nimmt den Fokus (D10)
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      ref={ref}
      hidden={sim.status === "idle"}
      role="group"
      aria-label={`Simulation: ${name}`}
      tabIndex={-1}
      className="tiv-sim nodrag nopan"
      onKeyDown={onKeyDown}
    >
      <div className="tiv-sim__title">
        <span className={`tiv-sim__badge is-${badge.tone}`}>
          <badge.Icon size={14} aria-hidden="true" />
          {badge.text}
        </span>
        <span className="tiv-sim__name">{name}</span>
        <span className="tiv-sim__progress">{progress}</span>
      </div>
      <progress
        className={`tiv-sim__bar is-${badge.tone}`}
        aria-label="Fortschritt"
        max={steps.length}
        value={sim.status === "done" ? steps.length : sim.step + 1}
      />
      <div className="tiv-sim__body">
        <div className="tiv-sim__controls">
          <Button
            className="tiv-sim__round"
            aria-label="Zurück"
            onClick={() => {
              send("prev");
            }}
            disabled={sim.status === "cancelled"}
          >
            <SkipBack size={17} aria-hidden="true" />
          </Button>
          <Button
            variant="primary"
            className="tiv-sim__round is-play"
            aria-label={sim.status === "running" ? "Pause" : "Weiter abspielen"}
            onClick={toggle}
            disabled={!locked}
          >
            {sim.status === "running" ? (
              <Pause size={20} aria-hidden="true" />
            ) : (
              <Play size={20} aria-hidden="true" />
            )}
          </Button>
          <Button
            className="tiv-sim__round"
            aria-label="Schritt"
            onClick={() => {
              send("next");
            }}
            disabled={!locked}
          >
            <SkipForward size={17} aria-hidden="true" />
          </Button>
          <label className="tiv-sim__tempo">
            Tempo
            <input
              type="range"
              min={0}
              max={TEMPOS.length - 1}
              step={1}
              value={TEMPOS.indexOf(sim.tempo)}
              aria-valuetext={`${String(sim.tempo)}×`}
              onChange={(e) => {
                send({ tempo: TEMPOS[Number(e.target.value)] ?? 1 });
              }}
            />
            <span aria-hidden="true">{sim.tempo}×</span>
          </label>
          {locked ? (
            <Button
              onClick={() => {
                send("cancel");
              }}
            >
              Abbrechen (Esc)
            </Button>
          ) : (
            <Button onClick={closePlayer}>Schließen</Button>
          )}
        </div>
        <div aria-live="polite" aria-atomic="true" className="tiv-sim__text">
          {sim.status === "cancelled" ? (
            "Simulation abgebrochen."
          ) : step ? (
            <>
              <strong>{step.label}</strong>: {step.text}
              {problem && ` ${problem}`}
              {sim.status === "done" && " Ablauf beendet."}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
