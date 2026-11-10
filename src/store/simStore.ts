import { create } from "zustand";
import {
  IDLE,
  simStep,
  type BoundStep,
  type Sim,
  type SimEvent,
} from "../engine/simulation";

/** Laufende oder pausierte Simulation: die Topologie ist gesperrt (Regelwerk 7). */
export const simLocked = (sim: Sim) =>
  sim.status === "running" || sim.status === "paused";

/** Flüchtiger Zustand der Simulation (nicht gespeichert, nicht im Verlauf). */
export const useSim = create<{
  sim: Sim;
  steps: BoundStep[];
  name: string;
  /** Gerät, das die Aktion ausgelöst hat; dorthin kehrt der Fokus zurück. */
  nodeId: string;
  begin: (name: string, nodeId: string, steps: BoundStep[]) => void;
  send: (ev: SimEvent) => void;
  close: () => void;
}>((set, get) => ({
  sim: IDLE,
  steps: [],
  name: "",
  nodeId: "",
  begin: (name, nodeId, steps) => {
    set({
      name,
      nodeId,
      steps,
      sim: simStep({ ...IDLE, tempo: get().sim.tempo }, "start", steps.length),
    });
  },
  send: (ev) => {
    set((s) => ({ sim: simStep(s.sim, ev, s.steps.length) }));
  },
  close: () => {
    set({ sim: { ...IDLE, tempo: get().sim.tempo }, steps: [] });
  },
}));
