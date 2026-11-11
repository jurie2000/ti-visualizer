import { describe, expect, it } from "vitest";
import type { Node } from "../schema";
import { containedNodes } from "./zones";

const size = { width: 100, height: 40 };
const node = (id: string, x: number, y: number): Node => ({
  id,
  type: "pc",
  position: { x, y },
  fault: false,
});
const zone = { area: { x: 0, y: 0, w: 200, h: 100 } };

describe("FR-15 Geräte einer Zone", () => {
  it("zählt ein Gerät, dessen Mitte in der Zone liegt", () => {
    const r = containedNodes(
      zone,
      [node("in", 10, 10), node("out", 400, 10)],
      size,
    );
    expect(r.map((n) => n.id)).toEqual(["in"]);
  });

  it("zählt ein Gerät nicht, das nur mit dem Rand hineinragt", () => {
    // Mitte bei x = 230 liegt außerhalb, obwohl die Kachel bis x = 180 reicht
    expect(containedNodes(zone, [node("rand", 180, 10)], size)).toEqual([]);
  });

  it("liefert nichts bei leerer Zone", () => {
    expect(containedNodes(zone, [], size)).toEqual([]);
  });
});
