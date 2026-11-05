import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { loadCatalog, type Selector, type Topology } from "../schema";
import { validateConnection } from "./rules";

// Property-based Tests (T-110, FR-3, FR-13) gegen den echten Katalog.

const catalog = loadCatalog();
const NUM_RUNS = 1000;

const types = catalog.deviceTypes.map((t) => t.id);
const reasonIds = new Set(catalog.reasonRules.map((r) => r.id));

const picks = (s: Selector, type: string): boolean =>
  "types" in s
    ? s.types.includes(type)
    : (catalog.deviceTypes
        .find((t) => t.id === type)
        ?.capabilities.includes(s.capability) ?? false);

const allowed = (x: string, y: string): boolean =>
  catalog.connectionRules.some(
    (r) => (picks(r.a, x) && picks(r.b, y)) || (picks(r.a, y) && picks(r.b, x)),
  );

const reasoned = (x: string, y: string): boolean =>
  catalog.reasonRules.some((r) => {
    const hit = (a: Selector, b: Selector) => picks(a, x) && picks(b, y);
    const both = (a: Selector, b: Selector) => hit(a, b) || hit(b, a);
    return both(r.a, r.b) && !r.except?.some((e) => both(e.a, e.b));
  });

const typeArb = fc.constantFrom(...types);
/** Anschluss eines Typs oder `undefined` (Modus Einfach, A-3). */
const portArb = (type: string) =>
  fc.constantFrom(
    undefined,
    ...(catalog.deviceTypes.find((t) => t.id === type)?.ports ?? []).map(
      (p) => p.id,
    ),
  );

const node = (id: string, type: string) => ({
  id,
  type,
  fault: false,
  position: { x: 0, y: 0 },
});
const topo = (nodes: [string, string][]): Topology => ({
  name: "t",
  description: "",
  simDate: "2026-11-01",
  nodes: nodes.map(([id, type]) => node(id, type)),
  edges: [],
  zones: [],
});

/** Zwei Geräte samt Anschlüssen und bis zu zwei Zusatzgeräten (wirkt auf X-1). */
const scenario = fc
  .tuple(typeArb, typeArb, fc.array(typeArb, { maxLength: 2 }))
  .chain(([x, y, extra]) =>
    fc.record({
      x: fc.constant(x),
      y: fc.constant(y),
      extra: fc.constant(extra),
      px: portArb(x),
      py: portArb(y),
    }),
  );

describe("Regel-Engine: Eigenschaften (T-110)", () => {
  it("Verbinden ist symmetrisch: (a,b) und (b,a) liefern dasselbe ok und ruleId", () => {
    fc.assert(
      fc.property(scenario, ({ x, y, extra, px, py }) => {
        const t = topo([
          ["a", x],
          ["b", y],
          ...extra.map((e, i): [string, string] => [`e${String(i)}`, e]),
        ]);
        const ab = validateConnection(t, "a", px, "b", py, catalog);
        const ba = validateConnection(t, "b", py, "a", px, catalog);
        expect(ba.ok).toBe(ab.ok);
        expect(ba.ruleId).toBe(ab.ruleId);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("Erlaubnis- und Begründungsliste überschneiden sich nie (je Typpaar)", () => {
    fc.assert(
      fc.property(typeArb, typeArb, (x, y) => {
        expect(allowed(x, y) && reasoned(x, y)).toBe(false);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("eine Begründungsregel als ruleId nur ohne Erlaubnisregel, ein ok nie mit Begründungsregel", () => {
    fc.assert(
      fc.property(scenario, ({ x, y, px, py }) => {
        const r = validateConnection(
          topo([
            ["a", x],
            ["b", y],
          ]),
          "a",
          px,
          "b",
          py,
          catalog,
        );
        if (r.ruleId !== undefined && reasonIds.has(r.ruleId))
          expect(allowed(x, y)).toBe(false);
        if (r.ok) {
          expect(allowed(x, y)).toBe(true);
          expect(r.ruleId === undefined || !reasonIds.has(r.ruleId)).toBe(true);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
