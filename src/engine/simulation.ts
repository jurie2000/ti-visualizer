import type { Catalog, Node, Topology } from "../schema";
import { resolvePath, terminalFor, zugangOf } from "./paths";

type Cat = Pick<Catalog, "deviceTypes">;
type Flow = Catalog["flows"][number];

export interface BoundStep {
  label: string;
  text: string;
  /** Knoten- und Kanten-IDs des Pfads, leer wenn ein Ende in der Topologie fehlt. */
  nodes: string[];
  edges: string[];
}

const caps = (c: Cat, n: Node) =>
  c.deviceTypes.find((d) => d.id === n.type)?.capabilities ?? [];

type Path = { nodes: string[]; edges: string[] };

/** Weg zwischen zwei Knoten, die Rückrichtung eingeschlossen (ein Pfad ist ungerichtet). */
function between(
  topology: Topology,
  a: string,
  b: string,
  catalog: Cat,
): Path | undefined {
  if (a === b) return { nodes: [a], edges: [] };
  for (const kind of ["ti", "local"] as const) {
    const fwd = resolvePath(topology, a, b, catalog, kind);
    if (fwd.ok) return fwd;
    const back = resolvePath(topology, b, a, catalog, kind);
    if (back.ok)
      return {
        nodes: [...back.nodes].reverse(),
        edges: [...back.edges].reverse(),
      };
  }
  return undefined;
}

/** Rollen P (Auslöser), K (Zugang), T (Terminal) und Typ-IDs als Knoten-IDs. */
function roleBinder(
  trigger: Node,
  topology: Topology,
  catalog: Cat,
  terminal: string | undefined,
): (role: string) => string | undefined {
  const own = caps(catalog, trigger);
  const choice = terminalFor(topology, trigger.id, catalog);
  const term =
    own.includes("cardSlots") || own.includes("netConfig:terminal")
      ? trigger.id
      : (terminal ?? (choice.status === "one" ? choice.terminal : undefined));
  const reached = (candidates: Node[], anchors: (string | undefined)[]) =>
    candidates.find((c) =>
      anchors.some((a) => a && between(topology, a, c.id, catalog)),
    ) ?? (candidates.length === 1 ? candidates[0] : undefined);
  const zugaenge = topology.nodes.filter((n) =>
    caps(catalog, n).includes("zugang"),
  );
  const k =
    (term && zugangOf(topology, term, catalog)) ||
    reached(zugaenge, [trigger.id])?.id;
  return (role) => {
    switch (role) {
      case "P":
        return trigger.id;
      case "T":
        return term;
      case "K":
        return k;
      default:
        return trigger.type === role
          ? trigger.id
          : reached(
              topology.nodes.filter((n) => n.type === role),
              [trigger.id, k],
            )?.id;
    }
  };
}

/**
 * Schritte eines Ablaufs auf die Topologie gebunden (FR-8, Regelwerk 7).
 * Rollen folgen dem Pfad vom Auslöser (Regelwerk 7 „Rollenbindung“); was kein
 * Pfad erreicht, bleibt ohne Knoten. Passen mehrere Terminals, bindet erst die
 * Wahl der Nutzer (`terminal`) T und K.
 */
export function bindFlow(
  flow: Flow,
  trigger: Node,
  topology: Topology,
  catalog: Cat,
  terminal?: string,
): BoundStep[] {
  const bind = roleBinder(trigger, topology, catalog, terminal);
  return flow.steps.map((s) => {
    const a = bind(s.from);
    const b = bind(s.to);
    const path = (a && b && between(topology, a, b, catalog)) || {
      nodes: [],
      edges: [],
    };
    return { label: s.label, text: s.text, ...path };
  });
}

// Zustandsautomat (Regelwerk 7, FR-9, FR-10)

export type Tempo = 0.5 | 1 | 2;
export type SimStatus = "idle" | "running" | "paused" | "done" | "cancelled";
export interface Sim {
  status: SimStatus;
  /** Index des aktuellen Schritts. */
  step: number;
  tempo: Tempo;
}
export type SimEvent =
  "start" | "pause" | "resume" | "next" | "prev" | "cancel" | { tempo: Tempo };

export const IDLE: Sim = { status: "idle", step: 0, tempo: 1 };

/** Verweildauer je Schritt beim Abspielen. */
export const stepDelayMs = (tempo: Tempo) => 2000 / tempo;

/** `idle → running(n) ⇄ paused → done | cancelled`; Abbrechen gilt aus jedem Zustand. */
export function simStep(sim: Sim, ev: SimEvent, total: number): Sim {
  if (typeof ev === "object") return { ...sim, tempo: ev.tempo };
  const { status } = sim;
  if (ev === "cancel") return { ...sim, status: "cancelled" };
  if (status === "cancelled") return sim;
  switch (ev) {
    case "start":
      return status === "idle" && total > 0
        ? { ...sim, status: "running", step: 0 }
        : sim;
    case "pause":
      return status === "running" ? { ...sim, status: "paused" } : sim;
    case "resume":
      return status === "paused" ? { ...sim, status: "running" } : sim;
    case "next":
      if (status !== "running" && status !== "paused") return sim;
      return sim.step + 1 >= total
        ? { ...sim, status: "done", step: total - 1 }
        : { ...sim, step: sim.step + 1 };
    case "prev":
      if (status === "done") return { ...sim, status: "paused" };
      return status === "running" || status === "paused"
        ? { ...sim, step: Math.max(0, sim.step - 1) }
        : sim;
  }
}
