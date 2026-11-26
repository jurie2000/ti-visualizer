import type { Catalog, Node, Topology } from "../schema";
import { hsmbGateways, offers } from "./actions";
import {
  isCloudHosted,
  resolvePath,
  softwareOn,
  terminalOf,
  zugangOf,
} from "./paths";

type Cat = Pick<Catalog, "deviceTypes" | "actions">;
type Flow = Catalog["flows"][number];

export interface BoundStep {
  label: string;
  text: string;
  /** Knoten- und Kanten-IDs des Pfads, leer ohne Pfad (siehe `problem`). */
  nodes: string[];
  edges: string[];
  /** Warum der Pfad fehlt. Ohne Angabe: Schritt außerhalb der Topologie (Rolle E). */
  problem?: Problem;
  /** Schritt außerhalb der Topologie (Rolle E): das Gerät auf der Topologie-Seite. */
  anchor?: string;
}

export type Problem =
  | { kind: "fehlt" } // Gerät der Rolle nicht in der Topologie
  | { kind: "kein-weg" } // beide Enden da, Regelwerk 6.0 kennt keinen Weg
  | { kind: "ausgefallen"; at: string; reached: Path } // Störung auf dem Weg; `reached` bis dorthin
  | { kind: "terminal-waehlen" }; // mehrere Terminals passen, T und K sind offen

const caps = (c: Cat, n: Node) =>
  c.deviceTypes.find((d) => d.id === n.type)?.capabilities ?? [];

type Path = { nodes: string[]; edges: string[] };

// Spiegelt die Ausnahmen in connection-rules.json (erl-mkt-ps, kim ↔ kk, ZETA Guard ↔ VSDM 2.0).
const DIRECT: Record<string, string[]> = {
  mkt: ["pvs", "kis", "avs", "pflege", "pc"],
  kim: ["kk"],
  zeta: ["vsdm2"],
};

/** Der Teil des Wegs bis zur Störung: Gerät bis einschließlich, bei einer Kante bis zu ihr. */
function reachedPath(full: Path, topology: Topology): Path {
  const down = new Set(
    [...topology.nodes, ...topology.edges]
      .filter((x) => x.fault)
      .map((x) => x.id),
  );
  const order = full.nodes.flatMap((n, i) => [n, full.edges[i]]);
  const i = order.findIndex((id) => id !== undefined && down.has(id));
  const nodes = full.nodes.slice(0, Math.floor(i / 2) + 1);
  // Ein einzelnes Gerät ist kein Weg: das Paket kommt gar nicht erst los
  return nodes.length < 2
    ? { nodes: [], edges: [] }
    : { nodes, edges: full.edges.slice(0, Math.ceil(i / 2)) };
}

// Weg zwischen zwei Knoten, die Rückrichtung eingeschlossen (ein Pfad ist ungerichtet).
function between(
  topology: Topology,
  a: string,
  b: string,
  catalog: Cat,
  lan: boolean,
  origin: string,
): Path | Problem {
  if (a === b) return { nodes: [a], edges: [] };
  let problem: Problem = { kind: "kein-weg" };
  // Der LAN-Weg gilt nur für Abläufe ohne Zugang (#215); sonst verdeckte er dessen Ausfall.
  for (const kind of lan
    ? (["lan", "ti", "local"] as const)
    : (["ti", "local"] as const)) {
    for (const [x, y] of [
      [a, b],
      [b, a],
    ] as const) {
      const r = resolvePath(topology, x, y, catalog, kind, origin);
      if (r.ok)
        return x === a
          ? r
          : { nodes: [...r.nodes].reverse(), edges: [...r.edges].reverse() };
      if (r.reason === "ausgefallen") {
        const full =
          x === a
            ? r
            : { nodes: [...r.nodes].reverse(), edges: [...r.edges].reverse() };
        problem = {
          kind: "ausgefallen",
          at: r.at,
          reached: reachedPath(full, topology),
        };
      }
    }
  }
  // Direkte Verbindungen außerhalb der Pfadregel (Regelwerk 4.2): mobiles KT ↔ Primärsystem (USB), KIM ↔ Krankenkasse.
  const type = (id: string) => topology.nodes.find((n) => n.id === id);
  const [na, nb] = [type(a), type(b)];
  const direct = topology.edges.find(
    (e) =>
      !e.fault &&
      e.ends.some((x) => x.node === a) &&
      e.ends.some((x) => x.node === b),
  );
  if (
    direct &&
    na &&
    nb &&
    !na.fault &&
    !nb.fault &&
    problem.kind === "kein-weg" &&
    (DIRECT[na.type]?.includes(nb.type) || DIRECT[nb.type]?.includes(na.type))
  )
    return { nodes: [a, b], edges: [direct.id] };
  return problem;
}

// Token-Abläufe zeigen nichts am Arbeitsplatz an.
const TOKEN_FLOWS = ["zeta", "zetaHsmb", "popp"];

// Rollen P (Auslöser), K (Zugang), T (Terminal) und Typ-IDs als Knoten-IDs.
function roleBinder(
  trigger: Node,
  topology: Topology,
  catalog: Cat,
  terminal: string | undefined,
  flowId: string,
  lan: boolean,
): (role: string) => string | undefined {
  const own = caps(catalog, trigger);
  const choice = terminalOf(topology, trigger.id, catalog);
  const term =
    own.includes("cardSlots") ||
    own.includes("netConfig:terminal") ||
    (own.includes("nfcCard") && own.includes("trigger")) // die eGK steckt im Dienst-Smartphone (NFC, #254), nicht in den Apps der Versicherten
      ? trigger.id
      : (terminal ?? (choice.status === "one" ? choice.terminal : undefined));
  // Ohne Pfad zählt das einzige Gerät des Typs; das ist eindeutig, anders als „erstes Gerät“.
  // Ein Terminal löst nicht selbst aus: `P` ist das direkt verbundene Primärsystem (mobiles KT per USB).
  const primary =
    own.includes("cardSlots") &&
    topology.edges
      .map((e) => e.ends.map((x) => x.node))
      .flatMap(([x, y]) =>
        x === trigger.id ? [y] : y === trigger.id ? [x] : [],
      )
      .find((id) =>
        ["primary", "computer"].includes(
          catalog.deviceTypes.find(
            (d) => d.id === topology.nodes.find((n) => n.id === id)?.type,
          )?.category ?? "",
        ),
      );
  const reached = (candidates: Node[], anchors: (string | undefined)[]) =>
    candidates.find((c) =>
      anchors.some(
        (a) =>
          a && "nodes" in between(topology, a, c.id, catalog, lan, trigger.id),
      ),
    ) ?? (candidates.length === 1 ? candidates[0] : undefined);
  // Signatur und ePA-Zugriff laufen über das TI-Gateway mit HSM-B (#254), das Terminal bestimmt K dort nicht.
  const hsmbFlow = ["zetaHsmb", "epaGateway"].includes(flowId);
  const zugaenge = hsmbFlow
    ? hsmbGateways(topology, trigger, catalog)
    : topology.nodes.filter((n) => caps(catalog, n).includes("zugang"));
  const k =
    (!hsmbFlow && term && zugangOf(topology, term, catalog)) ||
    reached(zugaenge, [trigger.id])?.id;
  return (role) => {
    switch (role) {
      case "P":
        // Am Rechner ausgelöst: die Software darauf sendet (T-724b)
        return primary || senderOn(trigger, topology, catalog, flowId);
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

/** Am Rechner ausgelöst: die Software darauf, die den Ablauf anbietet, sonst die erste (T-724b). */
function senderOn(
  trigger: Node,
  topology: Topology,
  catalog: Cat,
  flowId: string,
): string {
  const software = softwareOn(topology, trigger.id, catalog);
  const offered = catalog.actions.filter((a) => a.flow === flowId);
  const sender =
    software.find((s) =>
      offered.some((a) => offers(a.offeredBy, catalog, s.node.type)),
    ) ?? software[0];
  return sender?.node.id ?? trigger.id;
}

/**
 * Schritte eines Ablaufs auf die Topologie gebunden (FR-8, Regelwerk 7).
 * Rollen folgen dem Pfad vom Auslöser (Regelwerk 7 „Rollenbindung“); was kein
 * Pfad erreicht, bleibt ohne Knoten. Passen mehrere Terminals, bindet erst die
 * Wahl der Nutzer (`terminal`) T. K folgt dem Terminal, sonst dem Pfad.
 */
export function bindFlow(
  flow: Flow,
  trigger: Node,
  topology: Topology,
  catalog: Cat,
  terminal?: string,
): BoundStep[] {
  const lan = !flow.steps.some((s) => s.from === "K" || s.to === "K");
  const bind = roleBinder(trigger, topology, catalog, terminal, flow.id, lan);
  const choosing =
    !terminal && terminalOf(topology, trigger.id, catalog).status === "choose";
  const p = bind("P");
  const nfc = caps(catalog, trigger).includes("nfcCard");
  const cloud = p !== undefined && isCloudHosted(topology, p, catalog);
  const steps = flow.steps.map((s) => {
    const base = {
      label: s.label,
      text: (nfc && s.textNfc) || (cloud && s.textCloud) || s.text,
    };
    if (s.from === "E" || s.to === "E") {
      const anchor = bind(s.from === "E" ? s.to : s.from);
      return { ...base, nodes: [], edges: [], ...(anchor && { anchor }) };
    }
    const a = bind(s.from);
    const b = bind(s.to);
    const open = [s.from, s.to].some((x) => x === "T" || x === "K");
    const r: Path | Problem =
      a && b
        ? between(topology, a, b, catalog, lan, trigger.id)
        : { kind: open && choosing ? "terminal-waehlen" : "fehlt" };
    return "nodes" in r
      ? { ...base, ...r }
      : {
          ...base,
          ...(r.kind === "ausgefallen" ? r.reached : { nodes: [], edges: [] }),
          problem: r,
        };
  });
  // Läuft die Software in der Cloud, zeigt sie die Daten am Arbeitsplatz an, über das Internet (#229).
  if (
    !p ||
    p === trigger.id ||
    TOKEN_FLOWS.includes(flow.id) ||
    !isCloudHosted(topology, p, catalog)
  )
    return steps;
  const r = resolvePath(topology, p, trigger.id, catalog, "lan", trigger.id);
  return [
    ...steps,
    {
      label: "Anzeige am Arbeitsplatz",
      text: "Das Primärsystem im Rechenzentrum zeigt das Ergebnis am Arbeitsplatz an: über das Internet zum lokalen PC.",
      ...(r.ok
        ? { nodes: r.nodes, edges: r.edges }
        : { nodes: [], edges: [], problem: { kind: "kein-weg" as const } }),
    },
  ];
}

// Zustandsautomat (Regelwerk 7, FR-9, FR-10)

export type Tempo = number;
export const TEMPO_MIN = 0.1;
export const TEMPO_MAX = 0.5;
export type SimStatus = "idle" | "running" | "paused" | "done" | "cancelled";
export interface Sim {
  status: SimStatus;
  /** Index des aktuellen Schritts. */
  step: number;
  tempo: Tempo;
}
export type SimEvent =
  "start" | "pause" | "resume" | "next" | "prev" | "cancel" | { tempo: Tempo };

export const IDLE: Sim = { status: "idle", step: 0, tempo: TEMPO_MAX };

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
      // aus done zurück: Pause auf dem letzten Schritt, damit er sichtbar bleibt
      if (status === "done") return { ...sim, status: "paused" };
      return status === "running" || status === "paused"
        ? { ...sim, step: Math.max(0, sim.step - 1) }
        : sim;
  }
}
