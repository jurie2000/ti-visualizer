import type { Node, Zone } from "../schema";

/**
 * Geräte einer Zone (FR-15): Die Zugehörigkeit ergibt sich aus der Lage, die
 * Datei speichert sie nicht. Maßgeblich ist die Mitte der Gerätekachel.
 */
export function containedNodes(
  zone: Pick<Zone, "area">,
  nodes: readonly Node[],
  size: { width: number; height: number },
): Node[] {
  const { x, y, w, h } = zone.area;
  return nodes.filter((n) => {
    const cx = n.position.x + size.width / 2;
    const cy = n.position.y + size.height / 2;
    return cx >= x && cx <= x + w && cy >= y && cy <= y + h;
  });
}
