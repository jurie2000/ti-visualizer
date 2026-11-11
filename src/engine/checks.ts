import type { Catalog, Node, Topology } from "../schema";
import { cardState } from "./cards";
import { resolvePath, zugangOf } from "./paths";
import { matches } from "./rules";

// Prüfregeln des Regelwerks 9, Teil Zustand (P-1 bis P-7, P-18, P-22,
// P-31 bis P-33). Die Logik steht hier, Name, Schwere und Erklärtext im
// Katalog (`checks.json`). Reine Funktion: das Ergebnis hängt nur von der
// Menge der Knoten und Kanten ab, nicht von ihrer Reihenfolge.

export type Severity = Catalog["checks"][number]["severity"];

export interface Finding {
  /** Eindeutig je Regel und Gegenstand, als Listenschlüssel. */
  key: string;
  /** Regel-ID, z. B. `P-1`. */
  id: string;
  severity: Severity;
  name: string;
  explanation: string;
  /** Betroffene Geräte, sortiert. Leer bei Regeln über die ganze Topologie (P-4). */
  nodes: string[];
  edges: string[];
}

interface Hit {
  subject: string;
  nodes: string[];
  edges?: string[];
}

interface Ctx {
  t: Topology;
  c: Catalog;
  has: (n: Node, capability: string) => boolean;
  zugaenge: Node[];
  terminals: Node[];
}

type Rule = (x: Ctx) => Hit[];

// Ausgang ins Internet (P-33). Die Firewall trennt Segmente (P-6), der Router
// hat keine `netConfig:infra` und endet die Suche ohnehin.
const EXITS = ["router", "vpn", "internet"];

const ends = (e: Topology["edges"][number]) => e.ends.map((x) => x.node);
const sorted = (xs: Iterable<string>) => [...xs].sort();

/** Kantenmenge als Nachbarschaft; Kanten zu unbekannten Knoten zählen nicht. */
function neighbours(t: Topology) {
  const known = new Set(t.nodes.map((n) => n.id));
  const adj = new Map<string, string[]>();
  for (const e of t.edges) {
    const [a, b] = ends(e) as [string, string];
    if (!known.has(a) || !known.has(b)) continue;
    adj.set(a, [...(adj.get(a) ?? []), b]);
    adj.set(b, [...(adj.get(b) ?? []), a]);
  }
  return adj;
}

const RULES: Record<string, Rule> = {
  "P-1": ({ t }) =>
    t.nodes
      .filter((n) => n.fault)
      .map((n) => ({ subject: n.id, nodes: [n.id] })),

  "P-2": ({ t }) =>
    t.edges
      .filter((e) => e.fault)
      .map((e) => ({
        subject: e.id,
        nodes: sorted(ends(e)),
        edges: [e.id],
      })),

  "P-3": ({ t }) =>
    t.nodes.flatMap((n) =>
      (n.cards ?? [])
        .filter((k) => cardState(t, n.id, k.kind).state === "expired")
        .map((k) => ({ subject: `${n.id}/${k.kind}`, nodes: [n.id] })),
    ),

  // Eine leere Zeichenfläche hat nichts zu prüfen.
  "P-4": ({ t, zugaenge }) =>
    t.nodes.length > 0 && zugaenge.length === 0
      ? [{ subject: "-", nodes: [] }]
      : [],

  // Ausfälle meldet P-1/P-2: hier zählt nur die Verdrahtung. Ohne Zugang im
  // Netz meldet P-4.
  "P-5": ({ t, c, zugaenge, terminals }) =>
    zugaenge.length === 0
      ? []
      : terminals
          .filter((k) => {
            const z = zugangOf(t, k.id, c);
            if (z === undefined) return true;
            const r = resolvePath(t, k.id, z, c, "ti");
            return !r.ok && r.reason === "kein-weg";
          })
          .map((k) => ({ subject: k.id, nodes: [k.id] })),

  // Segment: über Switches und Access Points, nicht über Router und Firewall.
  "P-6": ({ t, c, has, terminals, zugaenge }) => {
    const adj = neighbours(t);
    const byId = new Map(t.nodes.map((n) => [n.id, n]));
    const fallback = String(
      c.configDefaults.find((d) => d.field === "vlan")?.default ?? "TI",
    );
    const vlan = (n: Node) => n.config?.vlan ?? fallback;
    const guarded = new Set([...terminals, ...zugaenge].map((n) => n.id));
    return t.nodes
      .filter((n) => n.type === "ap")
      .flatMap((ap) => {
        const seen = new Set([ap.id]);
        const hits = new Set<string>();
        for (const id of seen)
          for (const nb of adj.get(id) ?? []) {
            const n = byId.get(nb) as Node;
            if (guarded.has(nb)) {
              if (vlan(n) === vlan(ap)) hits.add(nb);
            } else if (
              !seen.has(nb) &&
              n.type !== "fw" &&
              has(n, "netConfig:infra")
            )
              seen.add(nb);
          }
        return hits.size > 0
          ? [{ subject: ap.id, nodes: sorted([ap.id, ...hits]) }]
          : [];
      });
  },

  "P-7": ({ t }) => {
    const linked = new Set(t.edges.flatMap(ends));
    return t.nodes
      .filter((n) => !linked.has(n.id))
      .map((n) => ({ subject: n.id, nodes: [n.id] }));
  },

  // Das TI-Gateway hat keine gSMC-K (Regelwerk 8), ein Streuwert zählt nicht.
  "P-18": ({ t, zugaenge }) =>
    zugaenge
      .filter(
        (n) =>
          n.type !== "gateway" &&
          n.config?.certExpires !== undefined &&
          n.config.certExpires < t.simDate,
      )
      .map((n) => ({ subject: n.id, nodes: [n.id] })),

  "P-22": ({ t }) =>
    t.nodes.flatMap((n) =>
      (n.cards ?? [])
        .filter((k) => cardState(t, n.id, k.kind).state === "locked")
        .map((k) => ({ subject: `${n.id}/${k.kind}`, nodes: [n.id] })),
    ),

  // Pairing ist `pairedWith` plus jede direkte Verbindung zu einem Zugang (6.0).
  "P-31": ({ t, zugaenge, terminals }) => {
    const isZugang = new Set(zugaenge.map((z) => z.id));
    return terminals.flatMap((k) => {
      const set = new Set<string>();
      const paired = k.config?.pairedWith;
      if (paired !== undefined && isZugang.has(paired)) set.add(paired);
      for (const e of t.edges) {
        const other = ends(e).find((id) => id !== k.id);
        if (ends(e).includes(k.id) && other && isZugang.has(other))
          set.add(other);
      }
      return set.size > 1
        ? [{ subject: k.id, nodes: sorted([k.id, ...set]) }]
        : [];
    });
  },

  // Ausschlussregel X-1 aus dem Katalog: beide Seiten kommen vor.
  "P-32": ({ t, c }) => {
    const rule = c.exclusionRules.find((r) => r.id === "X-1");
    if (!rule) return [];
    const [a, b] = rule.exclusive;
    const left = t.nodes.filter((n) => matches(a, n.type, c));
    const right = t.nodes.filter((n) => matches(b, n.type, c));
    return left.length > 0 && right.length > 0
      ? [
          {
            subject: "X-1",
            nodes: sorted([...left, ...right].map((n) => n.id)),
          },
        ]
      : [];
  },

  // Weg ins Internet: Router oder VPN-Zugangsdienst, auch über Switches und
  // Firewalls (Geräte mit `netConfig:infra`), nicht über Primärsysteme.
  "P-33": ({ t, has, zugaenge }) => {
    const adj = neighbours(t);
    const byId = new Map(t.nodes.map((n) => [n.id, n]));
    return zugaenge
      .filter((z) => {
        const seen = new Set([z.id]);
        for (const id of seen)
          for (const nb of adj.get(id) ?? []) {
            const n = byId.get(nb) as Node;
            if (EXITS.includes(n.type)) return false;
            if (has(n, "netConfig:infra")) seen.add(nb);
          }
        return true;
      })
      .map((z) => ({ subject: z.id, nodes: [z.id] }));
  },
};

const RANK: Record<Severity, number> = { Fehler: 0, Warnung: 1, Hinweis: 2 };

/**
 * Prüft die Topologie gegen die Prüfregeln des Katalogs (FR-19). Regeln mit
 * `onlyAdvanced` melden nur im Modus Erweitert. Sortiert nach Schwere, dann
 * Katalogreihenfolge, dann Gegenstand. Regeln ohne Umsetzung hier (Teile
 * Adressierung und Betrieb) werden übersprungen.
 */
export function runChecks(
  topology: Topology,
  mode: "simple" | "advanced",
  catalog: Catalog,
): Finding[] {
  const has = (n: Node, capability: string) =>
    catalog.deviceTypes
      .find((d) => d.id === n.type)
      ?.capabilities.includes(capability) ?? false;
  const ctx: Ctx = {
    t: topology,
    c: catalog,
    has,
    zugaenge: topology.nodes.filter((n) => has(n, "zugang")),
    // kt: stationäres Terminal am Netz; das mobile arbeitet offline.
    terminals: topology.nodes.filter(
      (n) => has(n, "cardSlots") && has(n, "netConfig:terminal"),
    ),
  };
  return catalog.checks
    .map((check, order) => ({ check, order }))
    .filter(
      ({ check }) =>
        (mode === "advanced" || !check.onlyAdvanced) && check.id in RULES,
    )
    .flatMap(({ check, order }) =>
      (RULES[check.id] as Rule)(ctx).map((hit) => ({
        order,
        subject: hit.subject,
        finding: {
          key: `${check.id}:${hit.subject}`,
          id: check.id,
          severity: check.severity,
          name: check.name,
          explanation: check.explanation,
          nodes: hit.nodes,
          edges: hit.edges ?? [],
        },
      })),
    )
    .sort(
      (a, b) =>
        RANK[a.finding.severity] - RANK[b.finding.severity] ||
        a.order - b.order ||
        (a.subject < b.subject ? -1 : a.subject > b.subject ? 1 : 0),
    )
    .map((x) => x.finding);
}
