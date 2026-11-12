import type { Point } from "../schema";

export interface Box {
  cx: number;
  cy: number;
  hw: number;
  hh: number;
}

export type Route = "curve" | "ortho";

type Side = "r" | "l" | "t" | "b";

const OPP: Record<Side, Side> = { r: "l", l: "r", t: "b", b: "t" };

const sideOf = (a: Box, b: Box): Side => {
  const dx = b.cx - a.cx;
  const dy = b.cy - a.cy;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? "r" : "l";
  return dy > 0 ? "b" : "t";
};

const attach = (n: Box, s: Side): Point =>
  s === "r"
    ? { x: n.cx + n.hw, y: n.cy }
    : s === "l"
      ? { x: n.cx - n.hw, y: n.cy }
      : s === "b"
        ? { x: n.cx, y: n.cy + n.hh }
        : { x: n.cx, y: n.cy - n.hh };

/** Abstand der Sammelschiene vom Gerät mit den meisten Kanten (Mockup `busX`/`busY`). */
const BUS = 40;

/**
 * Weg einer Kante zwischen den Seitenmitten zweier Geräte (Mockup `edgePath`):
 * `curve` als Kurve, `ortho` rechtwinklig. Bei `ortho` laufen alle Kanten eines
 * Geräts über dieselbe Schiene vor dessen Seite (`hub`, „Gebündelt“).
 * `mid` ist der Punkt für das Label.
 */
export function routePath(
  a: Box,
  b: Box,
  route: Route,
  hub: "a" | "b" = "a",
): { d: string; mid: Point } {
  const sa = sideOf(a, b);
  const p1 = attach(a, sa);
  const p2 = attach(b, OPP[sa]);
  const horiz = sa === "r" || sa === "l";
  const pt = (p: Point) => `${String(p.x)},${String(p.y)}`;
  if (route === "ortho") {
    const h = hub === "a" ? a : b;
    const hs = hub === "a" ? sa : OPP[sa];
    const bus = (p: number, side: Side) =>
      side === "l" || side === "t" ? p - BUS : p + BUS;
    if (horiz) {
      const mx = bus(h.cx + (hs === "l" ? -h.hw : h.hw), hs);
      const mid = { x: mx, y: (p1.y + p2.y) / 2 };
      return {
        d: `M ${pt(p1)} L ${pt({ x: mx, y: p1.y })} L ${pt({ x: mx, y: p2.y })} L ${pt(p2)}`,
        mid,
      };
    }
    const my = bus(h.cy + (hs === "t" ? -h.hh : h.hh), hs);
    return {
      d: `M ${pt(p1)} L ${pt({ x: p1.x, y: my })} L ${pt({ x: p2.x, y: my })} L ${pt(p2)}`,
      mid: { x: (p1.x + p2.x) / 2, y: my },
    };
  }
  const off = horiz
    ? Math.max(50, Math.abs(p2.x - p1.x) * 0.42)
    : Math.max(44, Math.abs(p2.y - p1.y) * 0.42);
  const sign = (horiz ? p2.x > p1.x : p2.y > p1.y) ? off : -off;
  const c1 = horiz ? { x: p1.x + sign, y: p1.y } : { x: p1.x, y: p1.y + sign };
  const c2 = horiz ? { x: p2.x - sign, y: p2.y } : { x: p2.x, y: p2.y - sign };
  return {
    d: `M ${pt(p1)} C ${pt(c1)} ${pt(c2)} ${pt(p2)}`,
    // Kurvenpunkt bei t = 0,5
    mid: {
      x: (p1.x + 3 * c1.x + 3 * c2.x + p2.x) / 8,
      y: (p1.y + 3 * c1.y + 3 * c2.y + p2.y) / 8,
    },
  };
}
