import { describe, expect, it } from "vitest";
import type { Node, Topology } from "../schema";
import { loadCatalog } from "../schema/loadCatalog";
import { availableActions, issueToken } from "./actions";
import { runChecks } from "./checks";
import { defaultConfig } from "./config";
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

  const withEgk = (t: Topology, id: string): Topology => ({
    ...t,
    nodes: t.nodes.map((n) =>
      n.id === "mobil-1"
        ? { ...n, cards: n.cards?.map((c) => ({ ...c, id })) }
        : n,
    ),
  });
  const tokens = (t: Topology, tk: Topology["tokens"]): Topology => ({
    ...withEgk(t, "egk-1"),
    tokens: tk,
  });
  // Die Internetkante des Geräts entfernen, nicht seine anderen Kanten
  const cut = (t: Topology, id: string): Topology => ({
    ...t,
    edges: t.edges.filter(
      (e) =>
        !(
          e.ends.some((x) => x.node === id) &&
          e.ends.some((x) => x.node === "internet-1")
        ),
    ),
  });

  it("epa-zeta braucht beide Token, ZETA Guard und ePA", () => {
    const nurZeta = tokens(preset, { zeta: preset.simDate });
    expect(run(nurZeta, "epa-zeta").disabledReason).toBe(
      "Kein PoPP-Token für diese eGK ausgestellt.",
    );
    const nurPopp = tokens(preset, { popp: ["egk-1"] });
    expect(run(nurPopp, "epa-zeta").disabledReason).toBe(
      "Kein gültiger ZETA-Token für diesen Simulationstag.",
    );
    const bereit = tokens(preset, { zeta: preset.simDate, popp: ["egk-1"] });
    expect(run(bereit, "epa-zeta").enabled).toBe(true);
    expect(run(without(bereit, "zeta-1"), "epa-zeta").enabled).toBe(false);
  });

  it("ein PoPP-Token einer fremden eGK genügt nicht", () => {
    const t = tokens(preset, { zeta: preset.simDate, popp: ["egk-9"] });
    expect(run(t, "vsdm2-pruefen").disabledReason).toBe(
      "Kein PoPP-Token für diese eGK ausgestellt.",
    );
  });

  it("ein abgelaufener ZETA-Token sperrt VSDM 2.0", () => {
    const t = tokens(preset, { zeta: "2026-10-31", popp: ["egk-1"] });
    expect(run(t, "vsdm2-pruefen")).toMatchObject({
      enabled: false,
      disabledReason: "Kein gültiger ZETA-Token für diesen Simulationstag.",
    });
  });

  it("ohne Internetkante ist das Gateway nicht erreichbar", () => {
    expect(
      run(cut(preset, "gateway-1"), "zeta-anmelden-hsmb").disabledReason,
    ).toBe("Das TI-Gateway mit HSM-B ist nicht erreichbar.");
  });

  it("ohne Internetkante sind alle vier Aktionen gesperrt", () => {
    const t = {
      ...cut(preset, "mobil-1"),
      tokens: { zeta: preset.simDate, popp: ["egk-1"] },
    };
    for (const id of [
      "zeta-anmelden-hsmb",
      "popp-token-beantragen",
      "vsdm2-pruefen",
      "epa-zeta",
    ])
      expect(run(withEgk(t, "egk-1"), id).enabled, id).toBe(false);
  });

  it("HSM-B zählt nur am TI-Gateway, nicht am Konnektor", () => {
    const kon = (t: Topology): Topology => ({
      ...t,
      nodes: t.nodes.map((n) =>
        n.id === "gateway-1" ? { ...n, type: "kon" } : n,
      ),
    });
    expect(run(kon(preset), "zeta-anmelden-hsmb").disabledReason).toBe(
      "Kein TI-Gateway mit HSM-B im Netz.",
    );
  });

  it("zetaHsmb bindet K an das Gateway mit HSM-B, nicht an ein anderes", () => {
    const gw = node(preset, "gateway-1");
    const zweites: Topology = {
      ...preset,
      nodes: [
        { ...gw, id: "gateway-0", config: { ...gw.config, hsmb: false } },
        ...preset.nodes,
      ],
      edges: [
        ...preset.edges,
        {
          id: "e-0",
          fault: false,
          ends: [
            { node: "gateway-0", port: "wan" },
            { node: "internet-1", port: "netz" },
          ],
        },
      ],
    };
    const steps = bindFlow(
      flowOf("zetaHsmb"),
      node(zweites, "mobil-1"),
      zweites,
      catalog,
    );
    expect(steps[0]?.nodes.at(-1)).toBe("gateway-1");
    expect(steps.flatMap((s) => s.nodes)).not.toContain("gateway-0");
  });

  it("Versicherten-Apps binden T nicht an sich selbst (nur Auslöser mit trigger)", () => {
    const app: Topology = {
      ...preset,
      nodes: [
        ...preset.nodes,
        {
          id: "erpapp-1",
          type: "erpapp",
          fault: false,
          position: { x: 0, y: 0 },
        },
      ],
    };
    const [first] = bindFlow(
      flowOf("popp"),
      node(app, "erpapp-1"),
      app,
      catalog,
    );
    expect(first?.nodes).toEqual([]);
    expect(first?.problem).toEqual({ kind: "fehlt" });
  });

  it("Standardwerte: hsmb nur am TI-Gateway, dort aus", () => {
    expect(defaultConfig("gateway", preset, catalog)?.hsmb).toBe(false);
    expect(defaultConfig("kon", preset, catalog)).not.toHaveProperty("hsmb");
  });
});
