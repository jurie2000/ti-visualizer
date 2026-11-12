import { LIMITS, type Catalog, type Topology } from "../schema";
import { containedNodes } from "./zones";

// Maße und Verfahren nach dem Mockup (`autoLayout`), Abstände auf NODE_SIZE umgerechnet.
const START = { x: 40, y: 50 };
const COL_GAP = 118;
const ROW_PAD = 48;
const ZONE_GAP = 56;
const SVC_GAP = 38;
/** Rand der neu aufgezogenen Zone: links, oben, rechts, unten. */
const PAD = { l: 22, t: 34, r: 22, b: 22 } as const;
const RANK: Record<string, number> = {
  network: 0,
  lan: 1,
  primary: 2,
  terminal: 3,
  card: 4,
};

const clamp = (v: number) => Math.min(v, LIMITS.coord);

/**
 * Sortiert die Topologie kreuzungsarm (FR-16, T-720a): Spalten nach Tiefe ab
 * der Wurzel (VPN, sonst Gateway, sonst Konnektor, sonst höchster Grad),
 * Eltern mittig über ihren Kindern, Fachdienste rechts, Geräte ohne Weg
 * unten. Zonen ziehen mit: Sie werden um ihre bisherigen Mitglieder neu
 * aufgezogen; Zonen ohne Mitglieder bleiben. Anders als im Mockup entfällt
 * keine Zone (Auslegung 2026-11-12).
 */
export function arrange(
  t: Topology,
  catalog: Catalog,
  size: { width: number; height: number },
): Topology {
  if (t.nodes.length === 0) return t;
  const catOf = (id: string) =>
    catalog.deviceTypes.find(
      (d) => d.id === t.nodes.find((n) => n.id === id)?.type,
    )?.category;

  const zoneOf = new Map<string, number>();
  t.zones.forEach((z, zi) => {
    for (const n of containedNodes(z, t.nodes, size))
      if (!zoneOf.has(n.id)) zoneOf.set(n.id, zi);
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

  const maxD = Math.max(0, ...depth.values());
  const colW = size.width + COL_GAP;
  const rowH = size.height + ROW_PAD;
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
      x: sx + (i % 2) * (size.width + SVC_GAP),
      y: top + Math.floor(i / 2) * rowH,
    });
  });

  const zones = t.zones.map((z, zi) => {
    const m = t.nodes.filter((n) => zoneOf.get(n.id) === zi);
    if (m.length === 0) return z;
    const at = m.map((n) => pos.get(n.id) ?? n.position);
    const x0 = Math.min(...at.map((p) => p.x)) - PAD.l;
    const y0 = Math.min(...at.map((p) => p.y)) - PAD.t;
    const x1 = Math.max(...at.map((p) => p.x + size.width)) + PAD.r;
    const y1 = Math.max(...at.map((p) => p.y + size.height)) + PAD.b;
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
