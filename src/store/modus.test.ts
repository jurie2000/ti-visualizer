import fc from "fast-check";
import { beforeEach, describe, expect, it } from "vitest";
import { loadCatalog } from "../schema";
import { useSettings, useTopology } from "./index";

const catalog = loadCatalog();
const types = catalog.deviceTypes.filter((d) => d.placeable).map((d) => d.id);

type Step =
  { add: string } | { connect: [number, number] } | { remove: number };

const step: fc.Arbitrary<Step> = fc.oneof(
  fc.record({ add: fc.constantFrom(...types) }),
  fc.record({ connect: fc.tuple(fc.nat(8), fc.nat(8)) }),
  fc.record({ remove: fc.nat(8) }),
);

/** Spielt die Schritte im gegebenen Modus ab; Verbinden ohne Anschlüsse = A-3. */
function run(mode: "simple" | "advanced", steps: Step[]) {
  useSettings.setState({ mode });
  const empty = useTopology.getState().topology;
  useTopology.getState().reset({ ...empty, nodes: [], edges: [], zones: [] });
  const s = useTopology.getState();
  const id = (i: number) => {
    const nodes = useTopology.getState().topology.nodes;
    return nodes[i % Math.max(nodes.length, 1)]?.id ?? "";
  };
  for (const st of steps) {
    if ("add" in st) s.addNode(st.add, { x: 0, y: 0 });
    else if ("connect" in st) s.connect(id(st.connect[0]), id(st.connect[1]));
    else s.removeNode(id(st.remove));
  }
  return useTopology.getState().topology;
}

beforeEach(() => {
  useSettings.setState({ mode: "simple" });
});

describe("Modus (Regelwerk 11, D36)", () => {
  it("Topologie ist in beiden Modi dieselbe", () => {
    fc.assert(
      fc.property(fc.array(step, { maxLength: 20 }), (steps) => {
        expect(run("simple", steps)).toEqual(run("advanced", steps));
      }),
      { numRuns: 200 },
    );
  });

  it("[A-3] Verbinden ohne Anschlüsse wählt im Modus Einfach das erste freie Paar", () => {
    const t = run("simple", [
      { add: "pc" },
      { add: "switch" },
      { connect: [0, 1] },
    ]);
    expect(t.edges).toHaveLength(1);
    // erstes verträgliches Paar in Katalogreihenfolge
    const pc = catalog.deviceTypes.find((d) => d.id === "pc");
    expect(t.edges[0]?.ends[0].port).toBe(pc?.ports[0]?.id);
  });
});
