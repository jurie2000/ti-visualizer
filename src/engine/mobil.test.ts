import { describe, expect, it } from "vitest";
import type { AnyCard, Node, Topology } from "../schema";
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
const run = (
  t: Topology,
  id: string,
  mode: "simple" | "advanced" = "simple",
) => {
  const a = availableActions(node(t, "mobil-1"), t, catalog, mode).find(
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

// Das HSM-B des Gateways ändern: Karte entfernen oder Felder überschreiben
const hsmbCard = (t: Topology, f: (c: AnyCard | undefined) => AnyCard[]) => ({
  ...t,
  nodes: t.nodes.map((n) =>
    n.id === "gateway-1"
      ? { ...n, cards: f(n.cards?.find((c) => c.kind === "hsmb")) }
      : n,
  ),
});

describe("Dienst-Smartphone (#254)", () => {
  it("Preset lädt ohne Fehler und ohne Token", () => {
    expect(preset.tokens).toBeUndefined();
    const fehler = runChecks(preset, "advanced", catalog).filter(
      (f) => f.severity === "Fehler",
    );
    expect(fehler.map((f) => f.id)).toEqual([]);
  });

  it.each(["simple", "advanced"] as const)(
    "Aktionsfolge im Modus %s: HSM-B, Access Token, PoPP-Token, VSDM 2.0 und ePA, wie der Player sie ausführt",
    (mode) => {
      let t = preset;
      const folge = [
        "zeta-anmelden-hsmb",
        "popp-token-beantragen",
        "vsdm2-pruefen",
        "epa-gateway",
      ];
      // Vor den Token sind VSDM 2.0 und ePA gesperrt, die beiden Token-Aktionen offen
      expect(run(t, "vsdm2-pruefen", mode).disabledReason).toContain(
        "ZETA-Token",
      );
      expect(run(t, "epa-gateway", mode).disabledReason).toContain(
        "PoPP-Token",
      );
      for (const id of folge) {
        const mobil = node(t, "mobil-1");
        const a = run(t, id, mode);
        expect(a.enabled, `${id}: ${a.disabledReason ?? ""}`).toBe(true);
        // Der Player stellt das Token nur aus, wenn kein Schritt ein Problem hat
        const steps = bindFlow(flowOf(actionOf(id).flow), mobil, t, catalog);
        expect(
          steps.map((x) => x.problem),
          id,
        ).toEqual(steps.map(() => undefined));
        const issues = actionOf(id).issues;
        if (issues) t = issueToken(issues, mobil, t, catalog);
      }
      expect(t.tokens?.zeta).toBe(t.simDate);
      expect(t.tokens?.popp).toHaveLength(1);
    },
  );

  it("das klassische VSDM 1.0 bleibt am Smartphone gesperrt (SMC-B oder HBA fehlen)", () => {
    expect(run(preset, "vsdm-pruefen").disabledReason).toBe(
      "Keine SMC-B gesteckt. Oder: Keine HBA gesteckt.",
    );
  });

  it("jede Aktion bleibt gesperrt, solange ihre Voraussetzung fehlt", () => {
    const ohneHsmb = hsmbCard(preset, () => []);
    expect(run(ohneHsmb, "zeta-anmelden-hsmb").disabledReason).toBe(
      "Kein HSM-B im TI-Gateway gesteckt.",
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
    expect(run(without(bereit, "epa-1"), "epa-gateway").enabled).toBe(false);
    expect(run(bereit, "epa-gateway").enabled).toBe(true);
  });

  it("das TI-Gateway ist für das Smartphone der Zugang zur TI: Internet, Gateway, ePA", () => {
    const r = resolvePath(preset, "mobil-1", "epa-1", catalog, "ti");
    expect(r).toMatchObject({ ok: true, zugang: "gateway-1" });
    expect(r.ok && r.nodes).toEqual([
      "mobil-1",
      "internet-1",
      "gateway-1",
      "epa-1",
    ]);
    // ohne Internetkante des Gateways kein Weg
    expect(
      resolvePath(cutAt(preset, "gateway-1"), "mobil-1", "epa-1", catalog, "ti")
        .ok,
    ).toBe(false);
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

  it("Ablauf epaGateway: HSM-B im Gateway, dann über das Gateway zur ePA", () => {
    const steps = bindFlow(
      flowOf("epaGateway"),
      node(preset, "mobil-1"),
      preset,
      catalog,
    );
    expect(steps.every((s) => !s.problem)).toBe(true);
    expect(steps[0]?.nodes.at(-1)).toBe("gateway-1");
    expect(steps[1]?.nodes).toEqual([
      "pvs-1",
      "mobil-1",
      "internet-1",
      "gateway-1",
      "epa-1",
    ]);
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
  const cutAt = (t: Topology, id: string): Topology => ({
    ...t,
    edges: t.edges.filter(
      (e) =>
        !(
          e.ends.some((x) => x.node === id) &&
          e.ends.some((x) => x.node === "internet-1")
        ),
    ),
  });

  it("epa-gateway braucht das PoPP-Token, kein ZETA-Token, aber das HSM-B und die ePA", () => {
    const nurZeta = tokens(preset, { zeta: preset.simDate });
    expect(run(nurZeta, "epa-gateway").disabledReason).toBe(
      "Kein PoPP-Token für diese eGK ausgestellt.",
    );
    const nurPopp = tokens(preset, { popp: ["egk-1"] });
    expect(run(nurPopp, "epa-gateway").enabled).toBe(true);
    expect(
      run(
        hsmbCard(nurPopp, () => []),
        "epa-gateway",
      ).disabledReason,
    ).toBe("Kein HSM-B im TI-Gateway gesteckt.");
    expect(run(without(nurPopp, "epa-1"), "epa-gateway").enabled).toBe(false);
  });

  it("epa-gateway: Negativfälle nennen ihren Grund, das ZETA-Token fehlt nie als Grund", () => {
    const basis = tokens(preset, { popp: ["egk-1"] });
    expect(basis.tokens?.zeta).toBeUndefined();
    const hsmbEdit = (f: (c: AnyCard) => AnyCard) =>
      hsmbCard(basis, (c) => [f(c as AnyCard)]);
    const faulty: Topology = {
      ...basis,
      nodes: basis.nodes.map((n) =>
        n.id === "gateway-1" ? { ...n, fault: true } : n,
      ),
    };
    const faelle: [string, Topology, string][] = [
      [
        "abgelaufenes HSM-B",
        hsmbEdit((c) => ({ ...c, expires: "2026-10-31" })),
        "HSM-B ist seit 31.10.2026 abgelaufen.",
      ],
      [
        "HSM-B ohne Software",
        hsmbEdit((c) => ({ kind: "hsmb", expires: c.expires })),
        "Das HSM-B ist keiner Software dieses Geräts zugeordnet.",
      ],
      ["Gateway ausgefallen", faulty, "ist ausgefallen."],
      [
        "Gateway ohne Internetkante",
        cutAt(basis, "gateway-1"),
        "Das TI-Gateway mit HSM-B ist nicht erreichbar.",
      ],
    ];
    for (const [name, t, grund] of faelle) {
      const a = run(t, "epa-gateway");
      expect(a.enabled, name).toBe(false);
      expect(a.disabledReason, name).toContain(grund);
      expect(a.disabledReason, name).not.toContain("ZETA");
    }
  });

  // Praxis-Rechner und Gateway hängen beide am Internet; ohne Smartphone führt kein Weg durchs Gateway
  const praxisAmInternet = (): Topology => {
    const at = (id: string, type: string) => ({
      id,
      type,
      fault: false,
      position: { x: 0, y: 0 },
    });
    const edge = (id: string, a: [string, string], b: [string, string]) => ({
      id,
      fault: false,
      ends: [
        { node: a[0], port: a[1] },
        { node: b[0], port: b[1] },
      ] as [{ node: string; port: string }, { node: string; port: string }],
    });
    return {
      name: "t",
      description: "",
      simDate: "2026-11-01",
      zones: [],
      nodes: [
        at("pc-1", "pc"),
        at("router-1", "router"),
        at("internet-1", "internet"),
        at("gateway-1", "gateway"),
        at("epa-1", "epa"),
      ],
      edges: [
        edge("e1", ["pc-1", "eth0"], ["router-1", "lan1"]),
        edge("e2", ["router-1", "wan"], ["internet-1", "netz"]),
        edge("e3", ["gateway-1", "wan"], ["internet-1", "netz"]),
        edge("e4", ["gateway-1", "ti"], ["epa-1", "ti"]),
      ],
    };
  };

  it("ohne Smartphone führt vom Praxis-Rechner kein Weg über das Internet ins Gateway", () => {
    const t = praxisAmInternet();
    for (const goal of ["gateway-1", "epa-1"])
      expect(resolvePath(t, "pc-1", goal, catalog, "ti").ok, goal).toBe(false);
  });

  it("das Smartphone erreicht ein Gateway im LAN einer Praxis nicht", () => {
    // gateway-1 hängt nur am Router (LAN), das Smartphone nur am Internet
    const t = {
      ...preset,
      nodes: [
        ...preset.nodes,
        {
          id: "router-1",
          type: "router",
          fault: false,
          position: { x: 0, y: 0 },
        },
      ],
      edges: [
        ...preset.edges.filter((e) =>
          e.ends.every((x) => x.node !== "gateway-1" || x.port !== "wan"),
        ),
        {
          id: "e-r1",
          fault: false,
          ends: [
            { node: "router-1", port: "wan" },
            { node: "internet-1", port: "netz" },
          ],
        },
        {
          id: "e-r2",
          fault: false,
          ends: [
            { node: "router-1", port: "lan1" },
            { node: "gateway-1", port: "lan" },
          ],
        },
      ],
    } satisfies Topology;
    expect(resolvePath(t, "mobil-1", "gateway-1", catalog, "ti").ok).toBe(
      false,
    );
    expect(resolvePath(t, "mobil-1", "epa-1", catalog, "ti").ok).toBe(false);
  });

  it("[popp] Ablauftext passt zum Auslöser: NFC am Smartphone, sonst Kartenterminal", () => {
    const text = bindFlow(
      flowOf("popp"),
      node(preset, "mobil-1"),
      preset,
      catalog,
    )[0]?.text;
    expect(text).toContain("per NFC");
    expect(text).not.toContain("Kartenterminal");
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
      run(cutAt(preset, "gateway-1"), "zeta-anmelden-hsmb").disabledReason,
    ).toBe("Das TI-Gateway mit HSM-B ist nicht erreichbar.");
  });

  it("ohne Internetkante sind alle vier Aktionen gesperrt", () => {
    const t = {
      ...cutAt(preset, "mobil-1"),
      tokens: { zeta: preset.simDate, popp: ["egk-1"] },
    };
    for (const id of [
      "zeta-anmelden-hsmb",
      "popp-token-beantragen",
      "vsdm2-pruefen",
      "epa-gateway",
    ])
      expect(run(withEgk(t, "egk-1"), id).enabled, id).toBe(false);
  });

  it("eine hsmb-Karte an einem Gerät ohne hsmSlot zählt nicht (K-10)", () => {
    const kon: Topology = {
      ...preset,
      nodes: preset.nodes.map((n) =>
        n.id === "gateway-1" ? { ...n, type: "kon" } : n,
      ),
    };
    expect(run(kon, "zeta-anmelden-hsmb").disabledReason).toBe(
      "Kein HSM-B im TI-Gateway gesteckt.",
    );
  });

  // Software-Angabe entfernen (Feld fehlt, nicht `undefined`)
  const ohneSoftware = (c: AnyCard | undefined): AnyCard[] => [
    { kind: "hsmb", expires: (c as AnyCard).expires },
  ];
  it.each([
    ["ohne Software", ohneSoftware],
    [
      "mit Software außerhalb des Geräts",
      (c: AnyCard | undefined) => [{ ...(c as AnyCard), software: "pvs-9" }],
    ],
  ])("HSM-B %s sperrt die Anmeldung", (_name, change) => {
    expect(
      run(hsmbCard(preset, change), "zeta-anmelden-hsmb").disabledReason,
    ).toBe("Das HSM-B ist keiner Software dieses Geräts zugeordnet.");
  });

  it("das HSM-B einer zweiten Software auf dem Smartphone genügt (Auslöser ist nicht die Software)", () => {
    const kis: Topology = {
      ...preset,
      nodes: [
        ...preset.nodes,
        { id: "kis-1", type: "kis", fault: false, position: { x: 0, y: 0 } },
      ],
      edges: [
        ...preset.edges,
        {
          id: "e-kis",
          fault: false,
          ends: [
            { node: "kis-1", port: "host" },
            { node: "mobil-1", port: "soft" },
          ],
        },
      ],
    };
    const t = hsmbCard(kis, (c) => [{ ...(c as AnyCard), software: "kis-1" }]);
    expect(run(t, "zeta-anmelden-hsmb").enabled).toBe(true);
  });

  it("ein abgelaufenes HSM-B sperrt die Anmeldung", () => {
    const t = hsmbCard({ ...preset, simDate: "2026-11-01" }, (c) => [
      { ...(c as AnyCard), expires: "2026-10-31" },
    ]);
    expect(run(t, "zeta-anmelden-hsmb").disabledReason).toBe(
      "HSM-B ist seit 31.10.2026 abgelaufen.",
    );
  });

  // Zweites Gateway mit eigenem HSM-B neben gateway-1 (Software pvs-1)
  const mitZweitem = (zweite: (c: AnyCard | undefined) => AnyCard[]) => {
    const gw = node(preset, "gateway-1");
    return {
      ...preset,
      nodes: [
        {
          ...gw,
          id: "gateway-0",
          cards: zweite(gw.cards?.find((c) => c.kind === "hsmb")),
        },
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
    } satisfies Topology;
  };
  const kZiel = (t: Topology) =>
    bindFlow(flowOf("zetaHsmb"), node(t, "mobil-1"), t, catalog)[0]?.nodes.at(
      -1,
    );

  it.each([
    ["ohne HSM-B", () => []],
    [
      "mit HSM-B einer anderen Software",
      (c: AnyCard | undefined) => [{ ...(c as AnyCard), software: "pvs-9" }],
    ],
    [
      "mit abgelaufenem HSM-B",
      (c: AnyCard | undefined) => [
        { ...(c as AnyCard), expires: "2026-10-31" },
      ],
    ],
  ])(
    "zetaHsmb bindet K an das passende Gateway, nicht an eines %s",
    (_n, f) => {
      // gateway-0 steht vor gateway-1 in der Liste und würde sonst gewählt
      const t = mitZweitem(f);
      expect(kZiel(t)).toBe("gateway-1");
      expect(
        bindFlow(flowOf("zetaHsmb"), node(t, "mobil-1"), t, catalog).flatMap(
          (st) => st.nodes,
        ),
      ).not.toContain("gateway-0");
    },
  );

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
});
