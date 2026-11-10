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

  // Öffnen, Rückgängig, Störung und Moduswechsel brechen ab (Regelwerk 7).
  useEffect(() => {
    if (!locked) return;
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
  }, [locked, send]);

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
        `.react-flow__node[data-id="${CSS.escape(nodeId)}"]`,
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
  const text =
    sim.status === "cancelled"
      ? "Simulation abgebrochen."
      : step
        ? [`${step.label}: ${step.text}`, problemText(step, nameOf)]
            .filter(Boolean)
            .join(" ") + (sim.status === "done" ? " Ablauf beendet." : "")
        : "";

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
      <p className="tiv-sim__title">
        {name} · Schritt {Math.min(sim.step + 1, steps.length)} von{" "}
        {steps.length}
      </p>
      <progress
        aria-label="Fortschritt"
        value={sim.step + 1}
        max={Math.max(steps.length, 1)}
      />
      <div aria-live="polite" aria-atomic="true" className="tiv-sim__text">
        {text}
      </div>
      <div className="tiv-sim__controls">
        <Button onClick={toggle} disabled={!locked}>
          {sim.status === "running" ? "Pause" : "Weiter abspielen"}
        </Button>
        <Button
          onClick={() => {
            send("prev");
          }}
          disabled={sim.status === "cancelled"}
        >
          Zurück
        </Button>
        <Button
          onClick={() => {
            send("next");
          }}
          disabled={!locked}
        >
          Schritt
        </Button>
        <label>
          Tempo{" "}
          <select
            value={sim.tempo}
            onChange={(e) => {
              send({ tempo: Number(e.target.value) as Tempo });
            }}
          >
            {TEMPOS.map((t) => (
              <option key={t} value={t}>
                {t}×
              </option>
            ))}
          </select>
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
    </div>
  );
}
