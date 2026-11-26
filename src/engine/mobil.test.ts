import { describe, expect, it } from "vitest";
import type { Node, Topology } from "../schema";
import { loadCatalog } from "../schema/loadCatalog";
import { availableActions, issueToken } from "./actions";
import { runChecks } from "./checks";
import { resolvePath } from "./paths";
import { validateConnection } from "./rules";
import { bindFlow } from "./simulation";

// Hebamme mit Dienst-Smartphone, HSM-B im TI-Gateway (Issue #254)
const catalog = loadCatalog();
const preset = catalog.presets.find((p) => p.id === "hebamme-mobil")
  ?.topology as Topology;
const node = (t: Topology, id: string) =>
  t.nodes.find((n) => n.id === id) as Node;
const run = (t: Topology, id: string) => {
  const a = availableActions(node(t, "mobil-1"), t, catalog).find(
    (x) => x.id === id,
  );
  if (!a) throw new Error(`Aktion ${id} fehlt`);
  return a;
};
const without = (t: Topology, id: string): Topology => ({
  ...t,
  nodes: t.nodes.filter((n) => n.id !== id),
  edges: t.edges.filter((e) => e.ends.every((x) => x.node !== id)),
});
const flowOf = (id: string) =>
  catalog.flows.find((f) => f.id === id) as (typeof catalog.flows)[number];
const actionOf = (id: string) =>
  catalog.actions.find((a) => a.id === id) as (typeof catalog.actions)[number];

describe("Dienst-Smartphone (#254)", () => {
  it("Preset lädt ohne Fehler und ohne Token", () => {
    expect(preset.tokens).toBeUndefined();
    const fehler = runChecks(preset, "advanced", catalog).filter(
      (f) => f.severity === "Fehler",
    );
    expect(fehler.map((f) => f.id)).toEqual([]);
  });

  it("Aktionsfolge: HSM-B, Access Token, PoPP-Token, VSDM 2.0 und ePA", () => {
    let t = preset;
    const folge = [
      "zeta-anmelden-hsmb",
      "popp-token-beantragen",
      "vsdm2-pruefen",
      "epa-zeta",
    ];
    // Vor dem ersten Token sind VSDM 2.0 und ePA gesperrt, die Token-Aktionen offen
    expect(run(t, "vsdm2-pruefen").disabledReason).toContain("ZETA-Token");
    expect(run(t, "epa-zeta").disabledReason).toContain("ZETA-Token");
    for (const id of folge) {
      const a = run(t, id);
      expect(a.enabled, id).toBe(true);
      const issues = actionOf(id).issues;
      if (issues) t = issueToken(issues, node(t, "mobil-1"), t, catalog);
    }
    expect(t.tokens?.zeta).toBe(t.simDate);
    expect(t.tokens?.popp).toHaveLength(1);
  });

  it("jede Aktion bleibt gesperrt, solange ihre Voraussetzung fehlt", () => {
    const ohneHsmb = {
      ...preset,
      nodes: preset.nodes.map((n) =>
        n.id === "gateway-1"
          ? { ...n, config: { ...n.config, hsmb: false } }
          : n,
      ),
    };
    expect(run(ohneHsmb, "zeta-anmelden-hsmb").disabledReason).toBe(
      "Kein TI-Gateway mit HSM-B im Netz.",
    );
    expect(
      run(without(preset, "gateway-1"), "zeta-anmelden-hsmb").enabled,
    ).toBe(false);
    expect(run(without(preset, "zeta-1"), "zeta-anmelden-hsmb").enabled).toBe(
      false,
    );
    expect(
      run(without(preset, "popp-1"), "popp-token-beantragen").enabled,
    ).toBe(false);
    const faulty = {
      ...preset,
      nodes: preset.nodes.map((n) =>
        n.id === "gateway-1" ? { ...n, fault: true } : n,
      ),
    };
    expect(run(faulty, "zeta-anmelden-hsmb").disabledReason).toContain(
      "ausgefallen",
    );
    const bereit: Topology = {
      ...preset,
      tokens: { zeta: preset.simDate, popp: ["egk-1"] },
      nodes: preset.nodes.map((n) =>
        n.id === "mobil-1"
          ? { ...n, cards: n.cards?.map((c) => ({ ...c, id: "egk-1" })) }
          : n,
      ),
    };
    expect(run(without(bereit, "epa-1"), "epa-zeta").enabled).toBe(false);
    expect(run(bereit, "epa-zeta").enabled).toBe(true);
  });

  it("das TI-Gateway ist vom Smartphone nur Signaturziel, kein Zugang in die TI", () => {
    expect(resolvePath(preset, "mobil-1", "gateway-1", catalog, "ti").ok).toBe(
      true,
    );
    // Auch mit TI-1.0-Diensten am Gateway: VSDM 1.0 bleibt unerreichbar
    const mitVsdm: Topology = {
      ...preset,
      nodes: [
        ...preset.nodes,
        {
          id: "vsdm-1",
          type: "vsdm",
          fault: false,
          position: { x: 0, y: 0 },
        },
      ],
      edges: [
        ...preset.edges,
        {
          id: "e-x",
          fault: false,
          ends: [
            { node: "gateway-1", port: "ti" },
            { node: "vsdm-1", port: "ti" },
          ],
        },
      ],
    };
    expect(resolvePath(mitVsdm, "mobil-1", "vsdm-1", catalog, "ti").ok).toBe(
      false,
    );
  });

  it("Abläufe zetaHsmb und popp binden das Smartphone als Auslöser und Terminal", () => {
    const mobil = node(preset, "mobil-1");
    const hsmb = bindFlow(flowOf("zetaHsmb"), mobil, preset, catalog);
    expect(hsmb.every((s) => !s.problem && s.nodes.length > 0)).toBe(true);
    expect(hsmb[0]?.nodes).toContain("gateway-1");
    const popp = bindFlow(flowOf("popp"), mobil, preset, catalog);
    expect(popp.every((s) => !s.problem && s.nodes.length > 0)).toBe(true);
    expect(popp[0]?.nodes).toEqual(["mobil-1", "pvs-1"]);
  });

  it("Ablauf epaZeta: ZETA Guard leitet zur ePA", () => {
    const steps = bindFlow(
      flowOf("epaZeta"),
      node(preset, "mobil-1"),
      preset,
      catalog,
    );
    expect(steps.every((s) => !s.problem)).toBe(true);
    expect(steps[1]?.nodes).toEqual(["zeta-1", "epa-1"]);
  });

  it("[V-21] Smartphone direkt an ZETA Guard ist verboten, an das Internet erlaubt", () => {
    const t: Topology = { ...preset, edges: [] };
    const ports = (b: string, pb: string) =>
      validateConnection(t, "mobil-1", "net", b, pb, catalog);
    expect(ports("zeta-1", "net")).toMatchObject({ ok: false });
    expect(ports("internet-1", "netz")).toMatchObject({ ok: true });
  });

  it("Fähigkeiten: trigger und nfcCard, kein workplace", () => {
    const caps = catalog.deviceTypes.find(
      (d) => d.id === "mobil",
    )?.capabilities;
    expect(caps).toEqual(["trigger", "nfcCard"]);
  });
});
