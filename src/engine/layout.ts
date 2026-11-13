import { LIMITS, type Catalog, type Node, type Topology } from "../schema";
import { containedNodes } from "./zones";

// Verfahren und Abstände nach dem Mockup (`autoLayout`): Spalte = Breite + 118,
// Zeile = Höhe + 30, Zonenlücke 56. Fachdienste mit mindestens 80 px Abstand (Auslegung 2026-11-12).
const START = { x: 40, y: 50 };
const COL_GAP = 118;
const ROW_GAP = 30;
const ZONE_GAP = 56;
const SVC_GAP = 80;
/** Rand der neu aufgezogenen Zone: links, oben, rechts, unten. */
const PAD = { l: 22, t: 34, r: 22, b: 22 } as const;
const RANK: Record<string, number> = {
  network: 0,
  lan: 1,
  primary: 2,
  computer: 2,
  terminal: 3,
  card: 4,
};

const clamp = (v: number) => Math.min(v, LIMITS.coord);

type Size = { width: number; height: number };

/**
 * Höhe einer Kachel, geschätzt aus dem Inhalt (Basis, Namenszeilen, Kartenmarken,
 * Anschlusszeilen). Gilt für den Modus Erweitert und ist damit die Obergrenze:
 * Positionen bleiben in beiden Modi frei von Überlappung (D36).
 */
function estimateHeight(node: Node, catalog: Catalog, base: Size): number {
  const d = catalog.deviceTypes.find((x) => x.id === node.type);
  const lines = Math.ceil((node.label ?? d?.name ?? "").length / 18);
  const cards = node.cards?.length ?? 0;
  const portRows = Math.ceil((d?.ports.length ?? 0) / 2);
  return (
    base.height +
    18 * Math.max(0, lines - 1) +
    (cards > 0 ? 25 * cards - 4 : 0) +
    17 * portRows
  );
}

/**
 * Größe, mit der `arrange` rechnet: die gemessene Kachel (React Flow), mindestens
 * aber die Schätzung. Ohne Messung (Tests) gilt nur die Schätzung.
 */
export function tileSize(
  node: Node,
  catalog: Catalog,
  base: Size,
  measured?: Size,
): Size {
  return {
    width: Math.max(base.width, measured?.width ?? 0),
    height: Math.max(
      estimateHeight(node, catalog, base),
      measured?.height ?? 0,
    ),
  };
}

/**
 * Sortiert die Topologie kreuzungsarm (FR-16, T-720a): Spalten nach Tiefe ab
 * der Wurzel (VPN, sonst Gateway, sonst Konnektor, sonst höchster Grad),
 * Eltern mittig über ihren Kindern, Fachdienste rechts, Geräte ohne Weg
 * unten. Zonen ziehen mit: Sie werden um ihre bisherigen Mitglieder neu
 * aufgezogen; Zonen ohne Mitglieder bleiben. Anders als im Mockup entfällt
 * keine Zone (Auslegung 2026-11-12). Alle Geräte zählen. Zeilen und Spalten
 * richten sich nach der größten Kachel (`tileSize`), damit nichts überlappt.
 */
export function arrange(
  t: Topology,
  catalog: Catalog,
  size: Size,
  measured?: ReadonlyMap<string, Size>,
): Topology {
  if (t.nodes.length === 0) return t;
  const catOf = (id: string) =>
    catalog.deviceTypes.find(
      (d) => d.id === t.nodes.find((n) => n.id === id)?.type,
    )?.category;

  // Mitglieder je Zone (auch bei Überlappung); für die Sortierung zählt die erste Zone.
  const members = t.zones.map((z) =>
    containedNodes(z, t.nodes, size).map((n) => n.id),
  );
  const zoneOf = new Map<string, number>();
  members.forEach((ids, zi) => {
    for (const id of ids) if (!zoneOf.has(id)) zoneOf.set(id, zi);
  });
  const zk = (id: string) => zoneOf.get(id) ?? 99;

  const adj = new Map<string, string[]>(t.nodes.map((n) => [n.id, []]));
  for (const e of t.edges) {
    adj.get(e.ends[0].node)?.push(e.ends[1].node);
    adj.get(e.ends[1].node)?.push(e.ends[0].node);
  }
  const deg = (id: string) => adj.get(id)?.length ?? 0;
  const svc = t.nodes.filter((n) => catOf(n.id) === "service");
  const rest = t.nodes.filter((n) => catOf(n.id) !== "service");
  const root =
    rest.find((n) => n.type === "vpn") ??
    rest.find((n) => n.type === "gateway") ??
    rest.find((n) => n.type === "kon" || n.type === "hskon") ??
    [...rest].sort((a, b) => deg(b.id) - deg(a.id))[0];

  const depth = new Map<string, number>();
  const parent = new Map<string, string>();
  const kids = new Map<string, string[]>(rest.map((n) => [n.id, []]));
  const isRest = (id: string) => kids.has(id);
  if (root) {
    depth.set(root.id, 0);
    let front = [root.id];
    while (front.length > 0) {
      const next: string[] = [];
      for (const id of front) {
        const d = depth.get(id) ?? 0;
        for (const nx of adj.get(id) ?? []) {
          if (!isRest(nx)) continue;
          const dn = depth.get(nx);
          if (dn !== undefined && dn <= d) continue;
          if (dn === undefined) {
            depth.set(nx, d + 1);
            parent.set(nx, id);
            next.push(nx);
          } else if (dn === d + 1) {
            // Gleichstand: Eltern derselben Zone, dann LAN-Geräte bevorzugen
            const cur = parent.get(nx) ?? "";
            const sameCur = zoneOf.has(cur) && zk(cur) === zk(nx);
            const sameNew = zoneOf.has(id) && zk(id) === zk(nx);
            if (sameNew && !sameCur) parent.set(nx, id);
            else if (
              !sameCur &&
              !sameNew &&
              catOf(id) === "lan" &&
              catOf(cur) !== "lan"
            )
              parent.set(nx, id);
          }
        }
      }
      front = next;
    }
    for (const [c, p] of parent) kids.get(p)?.push(c);
  }

  const sub = new Map<string, number>();
  const count = (id: string): number => {
    const known = sub.get(id);
    if (known !== undefined) return known;
    const n = 1 + (kids.get(id) ?? []).reduce((a, c) => a + count(c), 0);
    sub.set(id, n);
    return n;
  };
  const rank = (id: string) => RANK[catOf(id) ?? ""] ?? 5;
  for (const list of kids.values())
    list.sort(
      (a, b) =>
        zk(a) - zk(b) ||
        Number(count(a) > 1) - Number(count(b) > 1) ||
        rank(a) - rank(b) ||
        a.localeCompare(b),
    );

  const dim = new Map(
    t.nodes.map((n) => [n.id, tileSize(n, catalog, size, measured?.get(n.id))]),
  );
  const wOf = (id: string) => dim.get(id)?.width ?? size.width;
  const hOf = (id: string) => dim.get(id)?.height ?? size.height;
  const maxW = Math.max(...t.nodes.map((n) => wOf(n.id)));
  const rowH = Math.max(...t.nodes.map((n) => hOf(n.id))) + ROW_GAP;
  const maxD = Math.max(0, ...depth.values());
  const colW = maxW + COL_GAP;
  const pos = new Map<string, { x: number; y: number }>();
  let y = START.y;
  let lastZone: number | undefined;
  const place = (id: string) => {
    const x = START.x + (maxD - (depth.get(id) ?? 0)) * colW;
    const list = kids.get(id) ?? [];
    if (list.length === 0) {
      if (lastZone !== undefined && zk(id) !== lastZone) y += ZONE_GAP;
      lastZone = zk(id);
      pos.set(id, { x, y });
      y += rowH;
      return;
    }
    list.forEach(place);
    const ys = list.map((c) => pos.get(c)?.y ?? 0);
    pos.set(id, { x, y: Math.round((Math.min(...ys) + Math.max(...ys)) / 2) });
  };
  if (root) place(root.id);
  for (const n of rest)
    if (!pos.has(n.id)) {
      pos.set(n.id, { x: START.x, y });
      y += rowH;
    }
  const sx = START.x + (maxD + 1) * colW + START.x;
  const rootY = root ? (pos.get(root.id)?.y ?? START.y) : START.y;
  const top = Math.max(
    START.y,
    rootY - Math.round(((Math.ceil(svc.length / 2) - 1) * rowH) / 2),
  );
  svc.forEach((n, i) => {
    pos.set(n.id, {
      x: sx + (i % 2) * (maxW + SVC_GAP),
      y: top + Math.floor(i / 2) * rowH,
    });
  });

  const zones = t.zones.map((z, zi) => {
    const ids = members[zi] ?? [];
    if (ids.length === 0) return z;
    const at = ids.map((id) => pos.get(id) ?? { x: 0, y: 0 });
    const x0 = Math.min(...at.map((p) => p.x)) - PAD.l;
    const y0 = Math.min(...at.map((p) => p.y)) - PAD.t;
    const x1 =
      Math.max(...ids.map((id, i) => (at[i]?.x ?? 0) + wOf(id))) + PAD.r;
    const y1 =
      Math.max(...ids.map((id, i) => (at[i]?.y ?? 0) + hOf(id))) + PAD.b;
    return { ...z, area: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } };
  });
  return {
    ...t,
    zones,
    nodes: t.nodes.map((n) => {
      const p = pos.get(n.id);
      return p ? { ...n, position: { x: clamp(p.x), y: clamp(p.y) } } : n;
    }),
  };
}
