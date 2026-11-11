import { Position } from "@xyflow/react";
import { describe, expect, it } from "vitest";
import { handleSide } from "./handleSide";

const box = (cx: number, cy: number) => ({ cx, cy, hw: 74, hh: 32 });
const self = box(0, 0);

describe("Anschlusspunkt sitzt an der Seite zum Partner (Issue #106)", () => {
  it("ohne Partner rechts", () => {
    expect(handleSide(self, [])).toBe(Position.Right);
  });
  it("Partner links, rechts, oben, unten", () => {
    expect(handleSide(self, [box(-300, 10)])).toBe(Position.Left);
    expect(handleSide(self, [box(300, -10)])).toBe(Position.Right);
    expect(handleSide(self, [box(20, -200)])).toBe(Position.Top);
    expect(handleSide(self, [box(20, 200)])).toBe(Position.Bottom);
  });
  it("Seitenverhältnis: 100 px darunter ist unten, 100 px daneben rechts", () => {
    expect(handleSide(self, [box(0, 100)])).toBe(Position.Bottom);
    expect(handleSide(self, [box(100, 0)])).toBe(Position.Right);
  });
  it("mehrere Partner: Schwerpunkt, unabhängig von der Reihenfolge", () => {
    const a = box(-300, 0);
    const b = box(100, 0);
    expect(handleSide(self, [a, b])).toBe(Position.Left);
    expect(handleSide(self, [b, a])).toBe(Position.Left);
  });
  it("Gleichstand an der Diagonale: waagerecht", () => {
    expect(handleSide(self, [box(74, 32)])).toBe(Position.Right);
  });
});
