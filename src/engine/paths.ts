import type { Catalog, Node, Topology } from "../schema";

// Pfadregel nach Regelwerk 6.0:
// Auslöser → LAN → Zugang → Router/Internet → VPN → Zentrales Netz → Dienst.
// Die Suche läuft als Breitensuche über (Knoten, Phase). Die Phase erzwingt die
// Rollenfolge, deshalb kann kein Weg den Zugang oder das VPN auslassen.

/** Gerätetypen, deren Wege nur über das Internet laufen dürfen (Regelwerk 6.0). */
export const INTERNET_ONLY = ["erpapp", "epaapp", "timc", "cardlink", "popp"];

/** `ti`: Weg bis zum Dienst. `local`: nur bis zur eGK im Kartenterminal (NFDM/eMP). */
export type PathKind = "ti" | "local";

export type PathResult =
  | { ok: true; nodes: string[]; edges: string[]; zugang?: string }
  | { ok: false; reason: "kein-weg" }
  | { ok: false; reason: "ausgefallen"; at: string };

type Catalogue = Pick<Catalog, "deviceTypes">;

const LAN = 0; // vor dem Zugang
const POST = 1; // hinter dem Zugang: Router und Internet
const VPN = 2; // am VPN-Zugangsdienst
const ZENTRAL = 3; // im Zentralen Netz
const INET = 4; // reiner Internet-Weg ohne Zugang

type Role = "local" | "net" | "zugang" | "internet" | "vpn" | "zentral" | "end";

function roleOf(node: Node, catalog: Catalogue): Role {
  const t = catalog.deviceTypes.find((d) => d.id === node.type);
  if (!t) return "end";
  if (t.capabilities.includes("zugang")) return "zugang";
  if (t.id === "internet" || t.id === "vpn" || t.id === "zentral") return t.id;
  if (t.category === "lan") return "net";
  return t.category === "primary" ? "local" : "end";
}

/** Zugang, zu dem ein Kartenterminal gehört: `pairedWith`, sonst der direkt verbundene. */
export function zugangOf(
  topology: Topology,
  terminalId: string,
  catalog: Catalogue,
): string | undefined {
  const byId = new Map(topology.nodes.map((n) => [n.id, n]));
  const isZugang = (id: string | undefined) => {
    const n = id ? byId.get(id) : undefined;
    return n !== undefined && roleOf(n, catalog) === "zugang";
  };
  const paired = byId.get(terminalId)?.config?.pairedWith;
  if (paired !== undefined) return isZugang(paired) ? paired : undefined;
  for (const e of topology.edges) {
    const [a, b] = e.ends;
    if (a.node === terminalId && isZugang(b.node)) return b.node;
    if (b.node === terminalId && isZugang(a.node)) return a.node;
  }
  return undefined;
}

function search(
  topology: Topology,
  trigger: string,
  target: string,
  catalog: Catalogue,
  kind: PathKind,
  ignoreFaults: boolean,
): { nodes: string[]; edges: string[] } | undefined {
  const byId = new Map(topology.nodes.map((n) => [n.id, n]));
  const start = byId.get(trigger);
  const goal = byId.get(target);
  if (!start || !goal || trigger === target) return undefined;
  if (start.fault && !ignoreFaults) return undefined;
  const internetOnly =
    kind === "ti" &&
    (INTERNET_ONLY.includes(start.type) || INTERNET_ONLY.includes(goal.type));
  const goalZugang =
    kind === "local" ? zugangOf(topology, target, catalog) : undefined;
  if (kind === "local" && goalZugang === undefined) return undefined;

  /** Phase nach dem Schritt auf `n`, oder -1, wenn die Rollenfolge es verbietet. */
  const next = (phase: number, n: Node, direct: boolean): number => {
    const isGoal = n.id === target;
    switch (roleOf(n, catalog)) {
      case "local":
        return phase === LAN ? LAN : -1;
      case "net":
        return phase === LAN || phase === POST || phase === INET ? phase : -1;
      case "zugang":
        if (kind === "local" && n.id !== goalZugang) return -1;
        if (phase === LAN) return POST;
        return phase === INET && isGoal ? INET : -1;
      case "internet":
        if (kind === "local") return -1;
        if (phase === POST || phase === INET) return phase;
        return phase === LAN && internetOnly ? INET : -1;
      case "vpn":
        return phase === POST ? VPN : -1;
      case "zentral":
        return phase === VPN ? ZENTRAL : -1;
      case "end":
        if (!isGoal) return -1;
        if (kind === "local") return phase === POST ? phase : -1;
        if (phase === VPN || phase === ZENTRAL) return phase;
        // Internet-Wege laufen über das Internet. Eine direkte Kante vom Auslöser
        // ist die Vereinfachung aus Regelwerk 4.2 (z. B. E-Rezept-App ↔ E-Rezept-FD).
        if (!internetOnly) return -1;
        return phase === LAN && !direct ? -1 : phase;
    }
  };

  const key = (id: string, phase: number) => `${id}\0${String(phase)}`;
  const prev = new Map<string, { from: string; edge: string } | null>([
    [key(trigger, LAN), null],
  ]);
  const queue: [string, number][] = [[trigger, LAN]];
  for (let i = 0; i < queue.length; i++) {
    const [id, phase] = queue[i] as [string, number];
    if (id === target) {
      const nodes: string[] = [];
      const edges: string[] = [];
      let k: string | undefined = key(id, phase);
      while (k) {
        nodes.unshift(k.split("\0")[0] as string);
        const p: { from: string; edge: string } | null | undefined =
          prev.get(k);
        if (!p) break;
        edges.unshift(p.edge);
        k = p.from;
      }
      return { nodes, edges };
    }
    for (const e of topology.edges) {
      if (e.fault && !ignoreFaults) continue;
      const [a, b] = e.ends;
      const other = a.node === id ? b.node : b.node === id ? a.node : undefined;
      const n = other === undefined ? undefined : byId.get(other);
      if (!n || (n.fault && !ignoreFaults)) continue;
      const p = next(phase, n, id === trigger);
      if (p < 0 || prev.has(key(n.id, p))) continue;
      prev.set(key(n.id, p), { from: key(id, phase), edge: e.id });
      queue.push([n.id, p]);
    }
  }
  return undefined;
}

/**
 * Kürzester TI-Pfad vom Auslöser zum Ziel nach Regelwerk 6.0. Ausgeblendete
 * Geräte zählen mit. Ausgefallene Geräte und Kanten unterbrechen den Pfad,
 * `reason: "ausgefallen"` nennt das erste ausgefallene Element des sonst
 * gültigen Weges.
 */
export function resolvePath(
  topology: Topology,
  trigger: string,
  target: string,
  catalog: Catalogue,
  kind: PathKind = "ti",
): PathResult {
  const ok = search(topology, trigger, target, catalog, kind, false);
  if (ok) {
    const zugang = ok.nodes.find((id) => {
      const n = topology.nodes.find((x) => x.id === id);
      return n !== undefined && roleOf(n, catalog) === "zugang";
    });
    return { ok: true, ...ok, ...(zugang ? { zugang } : {}) };
  }
  const ignoring = search(topology, trigger, target, catalog, kind, true);
  if (!ignoring) return { ok: false, reason: "kein-weg" };
  const faulty = new Set(
    [...topology.nodes, ...topology.edges]
      .filter((x) => x.fault)
      .map((x) => x.id),
  );
  // in Wegreihenfolge: Knoten, Kante, Knoten, ...
  const inOrder = ignoring.nodes.flatMap((n, i) => [n, ignoring.edges[i]]);
  const at = inOrder.find((id) => id !== undefined && faulty.has(id));
  return { ok: false, reason: "ausgefallen", at: at as string };
}

export type TerminalChoice =
  | { status: "none" }
  | { status: "one"; terminal: string }
  | { status: "choose"; candidates: string[] };

/**
 * Terminal des Auslösers (Regelwerk 6.0): das mit gleichem `workplace`. Ohne
 * Zuordnung entscheiden die Nutzer unter allen erreichbaren Terminals.
 */
export function terminalFor(
  topology: Topology,
  trigger: string,
  catalog: Catalogue,
): TerminalChoice {
  const slots = new Set(
    catalog.deviceTypes
      .filter((t) => t.capabilities.includes("cardSlots"))
      .map((t) => t.id),
  );
  const reachable = topology.nodes.filter(
    (n) =>
      slots.has(n.type) &&
      resolvePath(topology, trigger, n.id, catalog, "local").ok,
  );
  const wp = topology.nodes.find((n) => n.id === trigger)?.config?.workplace;
  const assigned = wp
    ? reachable.filter((n) => n.config?.workplace === wp)
    : [];
  const pick = assigned.length > 0 ? assigned : reachable;
  const [first] = pick;
  if (!first) return { status: "none" };
  return pick.length === 1
    ? { status: "one", terminal: first.id }
    : { status: "choose", candidates: pick.map((n) => n.id) };
}
