import { describe, expect, it } from "vitest";
import type { Node, Topology } from "../schema";
import { loadCatalog } from "../schema/loadCatalog";
import { availableActions, issueToken } from "./actions";
import { runChecks } from "./checks";
import { bindFlow } from "./simulation";

// KIM-Nachricht ablegen und abholen, Hebamme und Krankenhaus am selben TI-Gateway (Issue #256)
const catalog = loadCatalog();
const preset = catalog.presets.find((p) => p.id === "kim-hebamme-krankenhaus")
  ?.topology as Topology;
const node = (t: Topology, id: string) =>
  t.nodes.find((n) => n.id === id) as Node;
const run = (
  t: Topology,
  trigger: string,
  id: string,
  mode: "simple" | "advanced" = "simple",
) => {
  const a = availableActions(node(t, trigger), t, catalog, mode).find(
    (x) => x.id === id,
  );
  if (!a) throw new Error(`Aktion ${id} fehlt`);
  return a;
};
const without = (t: Topology, ...ids: string[]): Topology => ({
  ...t,
  nodes: t.nodes.filter((n) => !ids.includes(n.id)),
  edges: t.edges.filter((e) => e.ends.every((x) => !ids.includes(x.node))),
});
const action = (id: string) =>
  catalog.actions.find((a) => a.id === id) as (typeof catalog.actions)[number];
const steps = (t: Topology, trigger: string, id: string) =>
  bindFlow(
    catalog.flows.find((f) => f.id === action(id).flow) as never,
    node(t, trigger),
    t,
    catalog,
  );
const issue = (t: Topology, trigger: string, id: string) =>
  issueToken(action(id).issues as never, node(t, trigger), t, catalog);

describe("KIM-Nachricht senden und abholen (#256)", () => {
  it("Preset lädt ohne Fehler und ohne Token", () => {
    expect(preset.tokens).toBeUndefined();
    const fehler = runChecks(preset, "advanced", catalog).filter(
      (f) => f.severity === "Fehler",
    );
    expect(fehler.map((f) => f.id)).toEqual([]);
  });

  it.each(["simple", "advanced"] as const)(
    "Hebamme legt ab, Krankenhaus holt ab, im Modus %s",
    (mode) => {
      let t = preset;
      expect(run(t, "pc-1", "kim-abholen", mode)).toMatchObject({
        enabled: false,
        disabledReason:
          "Keine KIM-Nachricht für dieses System auf dem KIM-Fachdienst.",
      });
      const senden = run(t, "mobil-1", "kim-senden", mode);
      expect(senden.enabled, senden.disabledReason).toBe(true);
      const versand = steps(t, "mobil-1", "kim-senden");
      expect(versand.map((s) => s.problem)).toEqual(
        versand.map(() => undefined),
      );
      expect(versand.at(-1)?.nodes).toEqual(
        expect.arrayContaining(["kimcm-1", "gateway-1", "kim-1"]),
      );

      t = issue(t, "mobil-1", "kim-senden");
      expect(t.tokens?.kim).toEqual(["pvs-1"]);
      // die eigene Nachricht holt das Smartphone nicht ab
      expect(run(t, "mobil-1", "kim-abholen", mode).enabled).toBe(false);
      const abholen = run(t, "pc-1", "kim-abholen", mode);
      expect(abholen.enabled, abholen.disabledReason).toBe(true);
      const weg = steps(t, "pc-1", "kim-abholen");
      expect(weg.map((s) => s.problem)).toEqual(weg.map(() => undefined));
      expect(weg[0]?.nodes[0]).toBe("kis-1");
      expect(weg[1]?.nodes).toEqual(
        expect.arrayContaining(["kim-1", "gateway-1", "kimcm-2"]),
      );

      t = issue(t, "pc-1", "kim-abholen");
      expect(t.tokens?.kim).toEqual([]);
      expect(run(t, "pc-1", "kim-abholen", mode).enabled).toBe(false);
    },
  );

  it("Gegenrichtung: Krankenhaus sendet, Smartphone holt ab", () => {
    const t = issue(preset, "pc-1", "kim-senden");
    expect(t.tokens?.kim).toEqual(["kis-1"]);
    expect(run(t, "mobil-1", "kim-abholen").enabled).toBe(true);
    expect(run(t, "pc-1", "kim-abholen").enabled).toBe(false);
  });

  it("ohne KIM-Fachdienst oder ohne Clientmodule gesperrt, mit Begründung", () => {
    const t = { ...preset, tokens: { kim: ["pvs-1"] } };
    for (const [ohne, trigger] of [
      [["kim-1"], "pc-1"],
      [["kimcm-1", "kimcm-2"], "pc-1"],
      [["kimcm-1", "kimcm-2"], "mobil-1"],
    ] as const) {
      const a = run(
        without(t, ...ohne),
        trigger,
        trigger === "pc-1" ? "kim-abholen" : "kim-senden",
      );
      expect(a.enabled).toBe(false);
      expect(a.disabledReason).toBeTruthy();
    }
  });
});
