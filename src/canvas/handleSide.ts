import { Position } from "@xyflow/react";

interface Box {
  cx: number;
  cy: number;
  hw: number;
  hh: number;
}

/**
 * Seite, an der der Anschlusspunkt von `self` sitzt: die Seite, an der die
 * Mittellinie zum Schwerpunkt der Partner den Rand schneidet (wie die
 * schwebende Kante). Der Schwerpunkt hängt nicht von der Kantenreihenfolge ab.
 * Ohne Partner und bei Gleichstand: rechts bzw. waagerecht.
 */
export function handleSide(self: Box, partners: Box[]): Position {
  if (partners.length === 0) return Position.Right;
  const dx = partners.reduce((s, p) => s + p.cx, 0) / partners.length - self.cx;
  const dy = partners.reduce((s, p) => s + p.cy, 0) / partners.length - self.cy;
  if (Math.abs(dx) / self.hw >= Math.abs(dy) / self.hh) {
    return dx < 0 ? Position.Left : Position.Right;
  }
  return dy < 0 ? Position.Top : Position.Bottom;
}
