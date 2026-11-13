import type { Catalog, Edge, Node, Topology } from "../schema";
import { matches } from "./rules";

/** Sammelkante (Regelwerk 3 und 11): ein Weg zwischen zwei sichtbaren Geräten über ausgeblendete. */
export interface Sammelkante {
  id: string;
  /** Die beiden sichtbaren Enden, nach ID sortiert. */
  ends: [string, string];
  /** IDs der ausgeblendeten Geräte auf dem Weg, nach ID sortiert. */
  hidden: string[];
}

/** Sackgasse: ausgeblendete Geräte, die keine Sammelkante nennt, am sichtbaren Nachbarn. */
export interface Hinweis {
  /** Das sichtbare Gerät, an dem der Hinweis hängt. */
  at: string;
  /** IDs der ausgeblendeten Geräte, nach ID sortiert. */
  hidden: string[];
}

export interface Collapsed {
  /** Sichtbare Geräte. */
  nodes: Node[];
  /** Verbindungen zwischen sichtbaren Geräten. */
  edges: Edge[];
  groups: Sammelkante[];
  /** Ausgeblendete Geräte ohne Sammelkante, je am (nach ID) ersten sichtbaren Nachbarn ihrer Gruppe. */
  stubs: Hinweis[];
  /** Ausgeblendete Geräte ohne jeden sichtbaren Nachbarn, nach ID sortiert. */
  isolated: string[];
}

/**
 * Darstellung im Modus Einfach (Regelwerk 11): blendet Geräte mit
 * `visibleSimple: false` aus und fasst jeden Weg über sie zu einer Sammelkante
 * zusammen. Ändert die Topologie nicht, sie bleibt in beiden Modi dieselbe (D36).
 * Eine Sammelkante nennt die ausgeblendeten Geräte auf den kürzesten Wegen
 * zwischen ihren Enden. Ausgeblendete Geräte, die so in keiner Sammelkante
 * stehen (Sackgassen, Abzweige), nennt `stubs` am sichtbaren Nachbarn; Geräte
 * ganz ohne sichtbaren Nachbarn stehen in `isolated`. So bleibt jedes
 * ausgeblendete Gerät auffindbar („ausgeblendet, aber vorhanden“).
 */
export function collapseHidden(
  topology: Topology,
  catalog: Catalog,
): Collapsed {
  const hiddenType = new Set(
    catalog.deviceTypes.filter((d) => !d.visibleSimple).map((d) => d.id),
  );
  const isHidden = new Set(
    topology.nodes.filter((n) => hiddenType.has(n.type)).map((n) => n.id),
  );

  // Zwei Endgeräte am LAN (Primärsysteme, Kartenterminals) bekommen nur dann eine
  // Sammelkante, wenn eine Verbindungsregel sie verbindet, z. B. PC - KIS
  // (Regelwerk 11, Auslegung 2026-11-12)
  const typeOf = new Map(topology.nodes.map((n) => [n.id, n.type]));
  const endCategory = new Map(
    catalog.deviceTypes.map((d) => [d.id, d.category]),
  );
  const isEndDevice = (id: string) => {
    const c = endCategory.get(typeOf.get(id) ?? "");
    return c === "primary" || c === "computer" || c === "terminal";
  };
  const ruleConnects = (x: string, y: string) =>
    catalog.connectionRules.some((r) => {
      const [tx, ty] = [typeOf.get(x) ?? "", typeOf.get(y) ?? ""];
      return (
        (matches(r.a, tx, catalog) && matches(r.b, ty, catalog)) ||
        (matches(r.a, ty, catalog) && matches(r.b, tx, catalog))
      );
    });

  // Nachbarschaft unter den ausgeblendeten Geräten und Anschlussstellen der sichtbaren
  const adj = new Map<string, string[]>();
  const attach = new Map<string, Set<string>>();
  const link = (m: Map<string, string[]>, a: string, b: string) =>
    m.set(a, [...(m.get(a) ?? []), b]);
  for (const e of topology.edges) {
    const [a, b] = e.ends;
    const ha = isHidden.has(a.node);
    const hb = isHidden.has(b.node);
    if (ha && hb) {
      link(adj, a.node, b.node);
      link(adj, b.node, a.node);
    } else if (ha !== hb) {
      const [h, v] = ha ? [a.node, b.node] : [b.node, a.node];
      attach.set(v, (attach.get(v) ?? new Set()).add(h));
    }
  }

  /** Abstände (in Kanten) von den Startgeräten durch die ausgeblendeten Geräte. */
  const distances = (from: Set<string>) => {
    const dist = new Map<string, number>([...from].map((h) => [h, 0]));
    for (const [h, d] of dist)
      for (const n of adj.get(h) ?? []) if (!dist.has(n)) dist.set(n, d + 1);
    return dist;
  };

  // Sammelkante je Paar sichtbarer Geräte, zwischen denen ein Weg über ausgeblendete führt
  // (nicht zwischen zwei Endgeräten ohne Verbindungsregel);
  // aufgeführt sind nur die Geräte auf den kürzesten Wegen, nicht Abzweige daneben
  const groups: Sammelkante[] = [];
  const visibleEnds = [...attach.keys()].sort((p, q) => p.localeCompare(q));
  for (const [i, x] of visibleEnds.entries()) {
    const dx = distances(attach.get(x) ?? new Set());
    for (const y of visibleEnds.slice(i + 1)) {
      if (isEndDevice(x) && isEndDevice(y) && !ruleConnects(x, y)) continue;
      const dy = distances(attach.get(y) ?? new Set());
      const total = new Map<string, number>();
      for (const [h, d] of dx) {
        const other = dy.get(h);
        if (other !== undefined) total.set(h, d + other);
      }
      if (total.size === 0) continue;
      const best = Math.min(...total.values());
      groups.push({
        id: `sammel:${x}:${y}`,
        ends: [x, y],
        hidden: [...total]
          .filter(([, t]) => t === best)
          .map(([h]) => h)
          .sort((p, q) => p.localeCompare(q)),
      });
    }
  }

  // Zusammenhängende Gruppen ausgeblendeter Geräte, die keine Sammelkante nennt
  const covered = new Set(groups.flatMap((g) => g.hidden));
  const neighbours = new Map<string, Set<string>>();
  for (const [v, hs] of attach)
    for (const h of hs)
      neighbours.set(h, (neighbours.get(h) ?? new Set()).add(v));
  const seen = new Set<string>();
  const stubs: Hinweis[] = [];
  const isolated: string[] = [];
  for (const start of [...isHidden].sort((p, q) => p.localeCompare(q))) {
    if (seen.has(start)) continue;
    const component = [...distances(new Set([start])).keys()];
    for (const h of component) seen.add(h);
    const open = component
      .filter((h) => !covered.has(h))
      .sort((p, q) => p.localeCompare(q));
    if (open.length === 0) continue;
    const ends = component
      .flatMap((h) => [...(neighbours.get(h) ?? [])])
      .sort((p, q) => p.localeCompare(q));
    const at = ends[0];
    if (at === undefined) isolated.push(...open);
    else stubs.push({ at, hidden: open });
  }
  isolated.sort((p, q) => p.localeCompare(q));

  return {
    nodes: topology.nodes.filter((n) => !isHidden.has(n.id)),
    edges: topology.edges.filter(
      (e) => !e.ends.some((end) => isHidden.has(end.node)),
    ),
    groups,
    stubs,
    isolated,
  };
}
