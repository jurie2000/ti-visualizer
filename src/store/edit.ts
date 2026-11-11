import { validateConnection } from "../engine/rules";
import {
  LIMITS,
  type Catalog,
  type Edge,
  type Node,
  type Topology,
} from "../schema";
import { freeId } from "./topologyStore";

/** Zwischenablage des Editors: gewählte Geräte und die Kanten zwischen ihnen. */
export interface Clip {
  nodes: Node[];
  edges: Edge[];
}

/** So weit rückt jede Kopie gegenüber dem Original (und der vorigen Kopie) ab. */
const OFFSET = 40;
const GAP = { x: 240, y: 120 };

export const copyNodes = (t: Topology, ids: string[]): Clip => ({
  nodes: t.nodes.filter((n) => ids.includes(n.id)),
  edges: t.edges.filter((e) => e.ends.every((end) => ids.includes(end.node))),
});

// Auslegung (2026-11-11): Eine Karte steckt in genau einem Gerät (K-9), die IP-Adresse
// ist eindeutig (P-9) und die Kopplung gehört zu einem bestimmten Zugang. Die Kopie
// übernimmt daher weder Karten noch `ip`, `paired` und `pairedWith`.
const NOT_COPIED = ["ip", "paired", "pairedWith"];

export type PasteResult =
  | { ok: true; topology: Topology; ids: string[]; skippedEdges: number }
  | { ok: false; reason: string };

/**
 * Fügt die Kopie `step` Mal versetzt ein. Kanten kommen nur mit, wenn
 * `validateConnection` sie im neuen Stand zulässt (FR-16).
 */
export function pasteClip(
  t: Topology,
  clip: Clip,
  catalog: Catalog,
  step: number,
): PasteResult {
  if (clip.nodes.length === 0) return { ok: false, reason: "Nichts kopiert." };
  if (t.nodes.length + clip.nodes.length > LIMITS.nodes)
    return {
      ok: false,
      reason: `Mehr als ${String(LIMITS.nodes)} Geräte sind nicht möglich.`,
    };
  const clamp = (v: number) =>
    Math.max(-LIMITS.coord, Math.min(LIMITS.coord, v));
  const ids = new Map<string, string>();
  let next = t;
  for (const n of clip.nodes) {
    const id = freeId(n.type, next);
    ids.set(n.id, id);
    const config = n.config
      ? (Object.fromEntries(
          Object.entries(n.config).filter(([k]) => !NOT_COPIED.includes(k)),
        ) as Node["config"])
      : undefined;
    next = {
      ...next,
      nodes: [
        ...next.nodes,
        {
          id,
          type: n.type,
          position: {
            x: clamp(n.position.x + OFFSET * step),
            y: clamp(n.position.y + OFFSET * step),
          },
          fault: false,
          ...(n.label !== undefined && { label: n.label }),
          ...(config && { config }),
        },
      ],
    };
  }
  let skippedEdges = 0;
  for (const e of clip.edges) {
    const a = ids.get(e.ends[0].node);
    const b = ids.get(e.ends[1].node);
    if (
      !a ||
      !b ||
      next.edges.length >= LIMITS.edges ||
      !validateConnection(next, a, e.ends[0].port, b, e.ends[1].port, catalog)
        .ok
    ) {
      skippedEdges++;
      continue;
    }
    next = {
      ...next,
      edges: [
        ...next.edges,
        {
          id: freeId("e", next),
          fault: false,
          ...(e.label !== undefined && { label: e.label }),
          ends: [
            { node: a, port: e.ends[0].port },
            { node: b, port: e.ends[1].port },
          ],
        },
      ],
    };
  }
  return { ok: true, topology: next, ids: [...ids.values()], skippedEdges };
}

/**
 * Ordnet alle Geräte in Spalten nach Abstand (Kanten) vom am stärksten
 * vernetzten Gerät; getrennte Teile stehen untereinander. Zonen bleiben stehen.
 */
export function arrange(t: Topology): Topology {
  const links = new Map<string, string[]>(t.nodes.map((n) => [n.id, []]));
  for (const e of t.edges) {
    links.get(e.ends[0].node)?.push(e.ends[1].node);
    links.get(e.ends[1].node)?.push(e.ends[0].node);
  }
  const degree = (id: string) => links.get(id)?.length ?? 0;
  const roots = t.nodes
    .map((n) => n.id)
    .sort((a, b) => degree(b) - degree(a) || a.localeCompare(b));
  const position = new Map<string, { x: number; y: number }>();
  let top = 0;
  for (const root of roots) {
    if (position.has(root)) continue;
    let level = [root];
    const seen = new Set(level);
    let col = 0;
    let rows = 0;
    while (level.length > 0) {
      const x = col * GAP.x;
      level.forEach((id, row) => {
        position.set(id, { x, y: top + row * GAP.y });
      });
      rows = Math.max(rows, level.length);
      level = [
        ...new Set(
          level
            .flatMap((id) => [...(links.get(id) ?? [])].sort())
            .filter((id) => !seen.has(id)),
        ),
      ];
      level.forEach((id) => seen.add(id));
      col++;
    }
    top += (rows + 1) * GAP.y;
  }
  return {
    ...t,
    nodes: t.nodes.map((n) => ({
      ...n,
      position: position.get(n.id) ?? n.position,
    })),
  };
}
