import { describe, expect, it } from "vitest";
import { nearestSegment, routePath, type Box } from "./route";

const a: Box = { cx: 0, cy: 0, hw: 10, hh: 5 };
const b: Box = { cx: 200, cy: 0, hw: 10, hh: 5 };

describe("routePath mit Gelenkpunkten (FR-23, L-3)", () => {
  it("führt die Linie als Linienzug durch alle Punkte", () => {
    const { d } = routePath(a, b, "curve", "a", [
      { x: 100, y: -80 },
      { x: 150, y: -80 },
    ]);
    // a verlässt die Seite zum ersten Punkt (rechts), b nimmt die Seite zum letzten (oben)
    expect(d).toBe("M 10,0 L 100,-80 L 150,-80 L 200,-5");
  });

  it("die Kantenführung ändert den Weg nicht", () => {
    const w = [{ x: 100, y: 50 }];
    expect(routePath(a, b, "ortho", "a", w)).toEqual(
      routePath(a, b, "curve", "a", w),
    );
  });

  it("legt das Label auf den mittleren Abschnitt", () => {
    expect(routePath(a, b, "curve", "a", [{ x: 100, y: 60 }]).mid).toEqual({
      x: 145,
      y: 30,
    });
    expect(
      routePath(a, b, "curve", "a", [
        { x: 100, y: 60 },
        { x: 140, y: 60 },
      ]).mid,
    ).toEqual({ x: 120, y: 60 });
  });

  it("ohne Gelenkpunkte bleibt der automatische Weg", () => {
    const auto = routePath(a, b, "ortho");
    expect(routePath(a, b, "ortho", "a", [])).toEqual(auto);
    expect(auto.d).toMatch(/^M 10,0 L /);
  });
});

describe("nearestSegment (L-6)", () => {
  const line = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
  ];
  it("wählt den Abschnitt mit dem kleinsten Abstand", () => {
    expect(nearestSegment(line, { x: 50, y: 5 })).toBe(0);
    expect(nearestSegment(line, { x: 95, y: 70 })).toBe(1);
  });
  it("kommt mit Punkten außerhalb und leeren Abschnitten zurecht", () => {
    expect(nearestSegment(line, { x: -50, y: -50 })).toBe(0);
    expect(
      nearestSegment(
        [
          { x: 1, y: 1 },
          { x: 1, y: 1 },
        ],
        { x: 5, y: 5 },
      ),
    ).toBe(0);
  });
});
