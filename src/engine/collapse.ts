import type { Catalog, Edge, Node, Topology } from "../schema";

/** Sammelkante (Regelwerk 3 und 11): ein Weg zwischen zwei sichtbaren Geräten über ausgeblendete. */
export interface Sammelkante {
  id: string;
  /** Die beiden sichtbaren Enden, nach ID sortiert. */
  ends: [string, string];
  /** IDs der ausgeblendeten Geräte auf dem Weg, nach ID sortiert. */
  hidden: string[];
}

export interface Collapsed {
  /** Sichtbare Geräte. */
  nodes: Node[];
  /** Verbindungen zwischen sichtbaren Geräten. */
  edges: Edge[];
  groups: Sammelkante[];
}

/**
 * Darstellung im Modus Einfach (Regelwerk 11): blendet Geräte mit
 * `visibleSimple: false` aus und fasst jeden Weg über sie zu einer Sammelkante
 * zusammen. Ändert die Topologie nicht, sie bleibt in beiden Modi dieselbe (D36).
 * Hängt ein ausgeblendetes Gerät (oder eine Gruppe verbundener ausgeblendeter
 * Geräte) nur an einem sichtbaren Gerät, entsteht keine Sammelkante.
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

  // Zusammenhängende Gruppen ausgeblendeter Geräte (Kanten zwischen ausgeblendeten)
  const group = new Map<string, string>();
  const find = (id: string): string => {
    const parent = group.get(id) ?? id;
    return parent === id ? id : find(parent);
  };
  for (const e of topology.edges) {
    const [a, b] = e.ends;
    if (isHidden.has(a.node) && isHidden.has(b.node))
      group.set(find(a.node), find(b.node));
  }

  // je Gruppe: sichtbare Nachbarn
  const neighbours = new Map<string, Set<string>>();
  for (const e of topology.edges) {
    const [a, b] = e.ends;
    if (isHidden.has(a.node) === isHidden.has(b.node)) continue;
    const [h, v] = isHidden.has(a.node) ? [a.node, b.node] : [b.node, a.node];
    const key = find(h);
    neighbours.set(key, (neighbours.get(key) ?? new Set()).add(v));
  }

  const byPair = new Map<string, Sammelkante>();
  for (const [key, set] of neighbours) {
    const members = [...isHidden].filter((id) => find(id) === key);
    const ends = [...set].sort();
    for (const [i, x] of ends.entries())
      for (const y of ends.slice(i + 1)) {
        const id = `sammel:${x}:${y}`;
        const hidden = new Set([...(byPair.get(id)?.hidden ?? []), ...members]);
        byPair.set(id, { id, ends: [x, y], hidden: [...hidden].sort() });
      }
  }

  return {
    nodes: topology.nodes.filter((n) => !isHidden.has(n.id)),
    edges: topology.edges.filter(
      (e) => !e.ends.some((end) => isHidden.has(end.node)),
    ),
    groups: [...byPair.values()].sort((p, q) => p.id.localeCompare(q.id)),
  };
}
