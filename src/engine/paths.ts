import type { Catalog, Node, Topology } from "../schema";

// Pfadregel nach Regelwerk 6.0:
// Auslöser → LAN → Zugang → Router/Internet → VPN → Zentrales Netz → Dienst.
// TI 2.0: Auslöser → LAN → (Zugang optional) → Router/Internet → ZETA Guard → VSDM 2.0.
// Die Suche läuft als Breitensuche über (Knoten, Phase). Die Phase erzwingt die
// Rollenfolge, deshalb kann kein Weg den Zugang oder das VPN auslassen.

/**
 * Wege nur über das Internet (Regelwerk 6.0): Auslöser und erlaubte Ziele.
 * Zusätzlich ist der PoPP-Service für jeden Auslöser über das Internet
 * erreichbar, CardLink erreicht seinen Zugang so.
 */
export const INTERNET_PAIRS: Record<string, string[]> = {
  erpapp: ["erp", "idp", "idpsek"],
  epaapp: ["epa", "idpsek"],
  timc: ["tim"],
};

/**
 * `ti`: Weg bis zum Dienst. `local`: nur bis zur eGK im Kartenterminal (NFDM/eMP).
 * `lan`: nur über das LAN zu einem Netz-Kartenterminal, ohne Zugang (TI 2.0, #215).
 */
export type PathKind = "ti" | "local" | "lan";

export type PathResult =
  | { ok: true; nodes: string[]; edges: string[]; zugang?: string }
  | { ok: false; reason: "kein-weg" }
  | {
      ok: false;
      reason: "ausgefallen";
      at: string;
      /** Der sonst gültige Weg, gestört oder nicht (für die Simulation). */
      nodes: string[];
      edges: string[];
    };

type Catalogue = Pick<Catalog, "deviceTypes">;

const LAN = 0; // vor dem Zugang
const POST = 1; // hinter dem Zugang: Router und Internet
const VPN = 2; // am VPN-Zugangsdienst
const ZENTRAL = 3; // im Zentralen Netz
const INET = 4; // reiner Internet-Weg ohne Zugang
const ZETA = 5; // am ZETA Guard (TI 2.0)

type Role =
  | "local"
  | "cloud"
  | "net"
  | "zugang"
  | "internet"
  | "vpn"
  | "zentral"
  | "zeta"
  | "end";

const HOME_ROLES: Role[] = ["local", "cloud", "net", "zugang"];

function roleOf(node: Node, catalog: Catalogue): Role {
  const t = catalog.deviceTypes.find((d) => d.id === node.type);
  if (!t) return "end";
  if (t.capabilities.includes("zugang")) return "zugang";
  if (
    t.id === "internet" ||
    t.id === "vpn" ||
    t.id === "zentral" ||
    t.id === "zeta"
  )
    return t.id;
  if (t.id === "cloud") return "cloud";
  if (t.category === "lan") return "net";
  return t.category === "primary" || t.category === "computer"
    ? "local"
    : "end";
}

/** Zugang, zu dem ein Kartenterminal gehört: `pairedWith`, sonst der direkt verbundene, sonst der einzige im Netz (Vereinfachung, nicht im Regelwerk 6.0). */
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
  // Normalfall: nur ein Zugang im Netz, dann gehört das Terminal zu ihm.
  const only = topology.nodes.filter((n) => roleOf(n, catalog) === "zugang");
  return only.length === 1 ? only[0]?.id : undefined;
}

function search(
  topology: Topology,
  trigger: string,
  target: string,
  catalog: Catalogue,
  kind: PathKind,
  ignoreFaults: boolean,
  origin: string,
): { nodes: string[]; edges: string[] } | undefined {
  const byId = new Map(topology.nodes.map((n) => [n.id, n]));
  const start = byId.get(trigger);
  const goal = byId.get(target);
  if (!start || !goal || trigger === target) return undefined;
  if (start.fault && !ignoreFaults) return undefined;
  // Primärsystem und Rechner gehen über den Router ins Internet: TI 2.0 ohne Zugang (#215),
  // Cloud-Software mit Gateway im Rechenzentrum, auch für den Weg zum Terminal (#221).
  const lokal = kind !== "lan" && roleOf(start, catalog) === "local";
  // Eigene Praxis: Geräte, die der Auslöser ohne Internet erreicht. Hinter dem Gateway
  // führt das Internet nur dorthin zurück, nie in fremde Router (Regelwerk 6.0, #221).
  // Bei Cloud-Software gehört auch die Praxis des auslösenden Arbeitsplatzes dazu (`origin`, #226).
  const home = new Set<string>([trigger, origin]);
  if (lokal || kind === "lan") {
    for (const id of home)
      for (const e of topology.edges) {
        const [a, b] = e.ends;
        const o = a.node === id ? b.node : b.node === id ? a.node : undefined;
        const n = o === undefined ? undefined : byId.get(o);
        if (n && HOME_ROLES.includes(roleOf(n, catalog))) home.add(n.id);
      }
  }
  const capsOf = (n: Node) =>
    catalog.deviceTypes.find((d) => d.id === n.type)?.capabilities ?? [];
  // Ein Kartenterminal oder CardLink (Ziel bei `local`, Auslöser bei `ti`)
  // nutzt nur seinen Zugang.
  const hasSlots = (n: Node) =>
    capsOf(n).some((c) => c === "cardSlots" || c === "netConfig:terminal");
  const internetOnly =
    kind === "ti" &&
    (goal.type === "popp" ||
      (INTERNET_PAIRS[start.type]?.includes(goal.type) ?? false) ||
      (hasSlots(start) && roleOf(goal, catalog) === "zugang"));
  const viaCloud = internetOnly && hasSlots(start);
  const isNetTerminal = (n: Node) =>
    capsOf(n).includes("cardSlots") && capsOf(n).includes("netConfig:terminal");
  const terminal =
    kind === "local" ? goal : hasSlots(start) ? start : undefined;
  const fixedZugang = terminal
    ? zugangOf(topology, terminal.id, catalog)
    : undefined;
  if (terminal && fixedZugang === undefined) return undefined;
  // Ein Zugang als Auslöser steht schon hinter dem LAN.
  const startPhase =
    kind === "ti" && roleOf(start, catalog) === "zugang" ? POST : LAN;

  /** Phase nach dem Schritt auf `n`, oder -1, wenn die Rollenfolge es verbietet. */
  const next = (phase: number, n: Node, direct: boolean): number => {
    const isGoal = n.id === target;
    switch (roleOf(n, catalog)) {
      case "local":
        return phase === LAN ? LAN : -1;
      case "cloud":
        // Cloud-Server im Rechenzentrum: ab hier LAN-Seite des TI-Gateways (#221).
        // Das Kartenterminal und der Rückweg zu ihm nutzen den Cloud-Server statt Gateway-WAN.
        if (phase === POST) return kind === "local" ? POST : -1;
        // LAN-Weg aus der Cloud: ohne Gateway über das Internet zum Router der eigenen Praxis (ZETA, PoPP).
        if (kind === "lan") return phase === LAN ? INET : -1;
        return phase === LAN || (phase === INET && (lokal || viaCloud))
          ? LAN
          : -1;
      case "net":
        if (
          ((phase === POST && lokal) || (phase === INET && kind === "lan")) &&
          !home.has(n.id)
        )
          return -1;
        return phase === LAN || phase === POST || phase === INET ? phase : -1;
      case "zugang":
        if (fixedZugang !== undefined && n.id !== fixedZugang) return -1;
        if (phase === LAN) return POST;
        return phase === INET && isGoal && internetOnly ? INET : -1;
      case "internet":
        // Der LAN-Weg endet am Router: über das Internet käme man in fremde Netze (#221).
        if (kind === "lan") return phase === INET ? INET : -1;
        if (phase === POST || phase === INET) return phase;
        return phase === LAN && (internetOnly || lokal) ? INET : -1;
      case "vpn":
        return phase === POST ? VPN : -1;
      case "zentral":
        return phase === VPN ? ZENTRAL : -1;
      case "zeta":
        return phase === POST || (phase === INET && lokal) ? ZETA : -1;
      case "end":
        if (!isGoal) return -1;
        if (kind === "lan")
          return (phase === LAN || phase === INET) && isNetTerminal(n)
            ? phase
            : -1;
        if (kind === "local") return phase === POST ? phase : -1;
        if (phase === VPN || phase === ZENTRAL || phase === ZETA) return phase;
        // Internet-Wege laufen über das Internet. Eine direkte Kante vom Auslöser
        // ist die Vereinfachung aus Regelwerk 4.2 (z. B. E-Rezept-App ↔ E-Rezept-FD).
        if (!internetOnly) return -1;
        return phase === LAN && !direct ? -1 : phase;
    }
  };

  // Ein Gateway am Cloud-Server hat seinen Internetzugang über ihn, nicht über den eigenen WAN-Anschluss (#226).
  const cloudIds = new Set(
    topology.nodes
      .filter((n) => roleOf(n, catalog) === "cloud")
      .map((n) => n.id),
  );
  const viaCloudOnly = new Set(
    topology.edges.flatMap((e) => {
      const [x, y] = e.ends;
      const hit = (g: string, c: string) =>
        cloudIds.has(c) && roleOf(byId.get(g) as Node, catalog) === "zugang"
          ? [g]
          : [];
      return [...hit(x.node, y.node), ...hit(y.node, x.node)];
    }),
  );
  const isWan = (g: string, o: string) =>
    viaCloudOnly.has(g) && roleOf(byId.get(o) as Node, catalog) === "internet";

  const key = (id: string, phase: number) => `${id}\0${String(phase)}`;
  const prev = new Map<string, { from: string; edge: string } | null>([
    [key(trigger, startPhase), null],
  ]);
  const queue: [string, number][] = [[trigger, startPhase]];
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
      if (isWan(id, n.id) || isWan(n.id, id)) continue;
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
  origin: string = trigger,
): PathResult {
  const ok = search(topology, trigger, target, catalog, kind, false, origin);
  if (ok) {
    const zugang = ok.nodes.find((id) => {
      const n = topology.nodes.find((x) => x.id === id);
      return n !== undefined && roleOf(n, catalog) === "zugang";
    });
    return { ok: true, ...ok, ...(zugang ? { zugang } : {}) };
  }
  const ignoring = search(
    topology,
    trigger,
    target,
    catalog,
    kind,
    true,
    origin,
  );
  if (!ignoring) return { ok: false, reason: "kein-weg" };
  const faulty = new Set(
    [...topology.nodes, ...topology.edges]
      .filter((x) => x.fault)
      .map((x) => x.id),
  );
  // in Wegreihenfolge: Knoten, Kante, Knoten, ...
  const inOrder = ignoring.nodes.flatMap((n, i) => [n, ignoring.edges[i]]);
  const at = inOrder.find((id) => id !== undefined && faulty.has(id));
  return {
    ok: false,
    reason: "ausgefallen",
    at: at as string,
    ...ignoring,
  };
}

export type TerminalChoice =
  | { status: "none" }
  | { status: "one"; terminal: string }
  | { status: "choose"; candidates: string[] };

/**
 * Terminal des Auslösers (Regelwerk 6.0): das mit gleichem `workplace`. Ohne
 * Zuordnung entscheiden die Nutzer unter allen erreichbaren Terminals.
 * Karten bleiben unberücksichtigt: den Filter auf passende Karten (K-3, K-4)
 * setzt `availableActions` (T-402) darauf. `zugang` im Pfad ist bei mehreren
 * Zugängen der zuerst gefundene, T-402 muss für Karten den Zugang des Terminals
 * (`zugangOf`) verlangen.
 */
export function terminalFor(
  topology: Topology,
  trigger: string,
  catalog: Catalogue,
  kind: "local" | "lan" = "local",
): TerminalChoice {
  const slots = new Set(
    catalog.deviceTypes
      .filter((t) => t.capabilities.includes("cardSlots"))
      .map((t) => t.id),
  );
  const terminals = topology.nodes.filter((n) => slots.has(n.type));
  // Software hat keinen eigenen Arbeitsplatz: es zählen die ihrer Rechner („läuft auf“).
  const hostIds = new Set(
    topology.edges
      .filter((e) => isHostEdge(e, topology, catalog))
      .flatMap((e) => {
        const [a, b] = e.ends;
        return a.node === trigger
          ? [b.node]
          : b.node === trigger
            ? [a.node]
            : [];
      }),
  );
  const wps = topology.nodes
    .filter((n) => n.id === trigger || hostIds.has(n.id))
    .flatMap((n) => (n.config?.workplace ? [n.config.workplace] : []));
  // Ist dem Arbeitsplatz ein Terminal zugeordnet, zählt nur dieses (auch wenn es nicht erreichbar ist).
  const assigned = terminals.filter(
    (n) => n.config?.workplace && wps.includes(n.config.workplace),
  );
  const pick = (assigned.length > 0 ? assigned : terminals).filter(
    (n) => resolvePath(topology, trigger, n.id, catalog, kind).ok,
  );
  const [first] = pick;
  if (!first) return { status: "none" };
  return pick.length === 1
    ? { status: "one", terminal: first.id }
    : { status: "choose", candidates: pick.map((n) => n.id) };
}

/** Kante „läuft auf“: beide Enden sind `host`-Anschlüsse. */
export function isHostEdge(
  e: Topology["edges"][number],
  topology: Topology,
  catalog: Catalogue,
): boolean {
  return e.ends.every((end) => {
    const node = topology.nodes.find((n) => n.id === end.node);
    return (
      catalog.deviceTypes
        .find((d) => d.id === node?.type)
        ?.ports.find((p) => p.id === end.port)?.kind === "host"
    );
  });
}

/**
 * Software, die ein Rechner nutzt (T-724b): die auf ihm selbst läuft („läuft
 * auf“) und, wenn er ein Arbeitsplatz ist (Fähigkeit `workplace`), die auf
 * Servern läuft, die er über Netzgeräte erreicht. Ausgefallene Geräte und
 * Kanten trennen die Verbindung (P-1, P-2). Eigene zuerst, `own` trennt sie
 * von der Software auf Servern.
 */
export function softwareOn(
  topology: Topology,
  machine: string,
  catalog: Catalogue,
): { node: Node; own: boolean }[] {
  const byId = new Map(topology.nodes.map((n) => [n.id, n]));
  const type = (n: Node) => catalog.deviceTypes.find((d) => d.id === n.type);
  const neighbours = (id: string) =>
    topology.edges.flatMap((e) => {
      if (e.fault) return [];
      const [a, b] = e.ends;
      const other = a.node === id ? b.node : b.node === id ? a.node : undefined;
      const n = other === undefined ? undefined : byId.get(other);
      return n && !n.fault
        ? [{ n, host: isHostEdge(e, topology, catalog) }]
        : [];
    });
  const found: { node: Node; own: boolean }[] = [];
  const take = (id: string, own: boolean) => {
    for (const { n, host } of neighbours(id))
      if (host && !found.some((f) => f.node === n))
        found.push({ node: n, own });
  };
  const start = byId.get(machine);
  if (!start || type(start)?.category !== "computer") return found;
  take(machine, true);
  if (!type(start)?.capabilities.includes("workplace")) return found;
  const seen = new Set([machine]);
  const queue = [machine];
  for (const id of queue)
    for (const { n, host } of neighbours(id)) {
      if (host || seen.has(n.id)) continue;
      seen.add(n.id);
      const t = type(n);
      if (t?.category === "lan") queue.push(n.id);
      // Über das Internet nur Cloud-Server, nicht weiter in fremde Netze (#221).
      else if (t?.id === "internet") {
        for (const c of neighbours(n.id))
          if (c.n.type === "cloud") take(c.n.id, false);
      }
      // Server: Rechner ohne Arbeitsplatz
      else if (
        t?.category === "computer" &&
        !t.capabilities.includes("workplace")
      )
        take(n.id, false);
    }
  return found;
}

/** Terminal des Auslösers über den Zugang, sonst über das LAN (TI 2.0 ohne Zugang, #215). */
export function terminalOf(
  topology: Topology,
  trigger: string,
  catalog: Catalogue,
): TerminalChoice {
  const viaZugang = terminalFor(topology, trigger, catalog);
  return viaZugang.status === "none"
    ? terminalFor(topology, trigger, catalog, "lan")
    : viaZugang;
}
