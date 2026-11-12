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
