import { describe, expect, it } from "vitest";
import regelwerk from "../../specs/001-ti-visualizer-baukasten/regelwerk.md?raw";
import { regelwerkRows } from "../../scripts/regelwerk.ts";
import { checkReferences, type Selector } from "./catalog";
import { loadCatalog } from "./loadCatalog";

const catalog = loadCatalog();

// Verträglichkeit zweier Anschlussarten nach der Liste im Katalog (ungeordnet).
const compatible = (a: string, b: string) =>
  catalog.portKinds.compatible.some(
    (p) => (p.a === a && p.b === b) || (p.a === b && p.b === a),
  );
const kinds = catalog.portKinds.kinds.map((k) => k.id);

describe("Echter Katalog: Geräte, Anschlüsse, Quellen (T-103)", () => {
  it("besteht Schema und Referenzprüfung", () => {
    expect(checkReferences(catalog)).toEqual([]);
  });

  it("Anschlussarten sind genau die aus Regelwerk 2.1", () => {
    expect([...kinds].sort()).toEqual(
      ["app", "eth", "host", "net", "ti", "tun", "usb", "wan", "wifi"].sort(),
    );
  });

  it("[A-1] gleiche Anschlussarten passen zusammen, außer wan mit wan", () => {
    for (const k of kinds)
      expect(compatible(k, k), `${k}/${k}`).toBe(k !== "wan");
  });

  it("[A-6] Anwendungsverbindung passt zu eth, usb und app, in beide Richtungen", () => {
    for (const b of ["eth", "usb", "app"] as const) {
      expect(compatible("app", b), `app/${b}`).toBe(true);
      expect(compatible(b, "app"), `${b}/app`).toBe(true);
    }
  });

  it("[A-2] zusätzlich erlaubt: eth-wan, wan-net, tun-net, in beide Richtungen", () => {
    for (const [a, b] of [
      ["eth", "wan"],
      ["wan", "net"],
      ["tun", "net"],
    ] as const) {
      expect(compatible(a, b), `${a}/${b}`).toBe(true);
      expect(compatible(b, a), `${b}/${a}`).toBe(true);
    }
  });

  it("[A-1][A-2][A-6] alle übrigen Paare unterschiedlicher Arten sind unverträglich", () => {
    const allowed = new Set([
      "eth-wan",
      "net-wan",
      "net-tun",
      "app-eth",
      "app-usb",
    ]);
    for (const a of kinds)
      for (const b of kinds)
        if (a !== b)
          expect(compatible(a, b), `${a}/${b}`).toBe(
            allowed.has([a, b].sort().join("-")),
          );
  });

  it("Smartcards sind keine Knoten und haben keine Anschlüsse (D12)", () => {
    const cards = catalog.deviceTypes.filter((t) => t.category === "card");
    expect(cards.map((c) => c.id).sort()).toEqual(["egk", "hba", "smcb"]);
    for (const c of cards) {
      expect(c.placeable).toBe(false);
      expect(c.ports).toEqual([]);
    }
    expect(
      catalog.deviceTypes
        .filter((t) => t.category !== "card")
        .every((t) => t.placeable),
    ).toBe(true);
  });

  it("jede Fähigkeit aus Regelwerk 1.9 gehört den genannten Gerätetypen", () => {
    const owners = (c: string) =>
      catalog.deviceTypes
        .filter((t) => t.capabilities.includes(c))
        .map((t) => t.id)
        .sort();
    expect(owners("cardSlots")).toEqual(["kt", "mkt"]);
    expect(owners("nfcCard")).toEqual(["cardlink", "epaapp", "erpapp"]);
    expect(owners("zugang")).toEqual(["gateway", "hskon", "kon"]);
    expect(owners("netConfig:konnektor")).toEqual(["gateway", "hskon", "kon"]);
    expect(owners("netConfig:terminal")).toEqual(["cardlink", "kt"]);
    expect(owners("netConfig:router")).toEqual(["router"]);
    expect(owners("netConfig:infra")).toEqual(["ap", "fw", "switch"]);
    expect(owners("netConfig:client")).toEqual(
      ["kimcm", "pc", "server", "tab"].sort(),
    );
    expect(owners("workplace")).toEqual(["pc", "tab"]);
  });
});

// --- T-104: Verbindungsregeln und Protokolle ---------------------------------

/** Meldungen der Zeilen G-*, V-* und X-* (ID, Status, Quelle prüft check-regelwerk-katalog.ts). */
const expected = regelwerkRows(regelwerk)
  .filter((r) => /^[GVX]-/.test(r.id))
  .map((r) => ({
    id: r.id,
    // X-1 hat keine Meldungsspalte
    message: r.cells.length === 5 ? (r.cells[2] ?? "") : "",
  }));
const catalogRows = [
  ...catalog.baseChecks,
  ...catalog.reasonRules,
  ...catalog.exclusionRules.map((r) => ({ ...r, message: "" })),
];

const placeable = catalog.deviceTypes.filter((t) => t.placeable);
const members = (s: Selector) =>
  new Set(
    "types" in s
      ? s.types
      : placeable
          .filter((t) => t.capabilities.includes(s.capability))
          .map((t) => t.id),
  );
const covers = (a: Selector, b: Selector, x: string, y: string) =>
  (members(a).has(x) && members(b).has(y)) ||
  (members(a).has(y) && members(b).has(x));

describe("Echter Katalog: Verbindungsregeln und Protokolle (T-104)", () => {
  it("das Regelwerk nennt genau die Regeln dieses Tasks", () => {
    expect(expected.map((r) => r.id)).toEqual([
      "G-1",
      "G-2",
      "G-3",
      "G-4",
      "V-4",
      "V-5",
      "V-6",
      "V-7",
      "V-8",
      "V-9",
      "V-10",
      "V-12",
      "V-14",
      "V-15",
      "V-16",
      "V-17",
      "V-18",
      "V-19",
      "V-20",
      "X-1",
    ]);
  });

  it("Meldung im Katalog wie im Regelwerk (ID, Status, Quelle: check-regelwerk-katalog.ts)", () => {
    for (const rule of expected) {
      const found = catalogRows.find((r) => r.id === rule.id);
      expect(found, `${rule.id} fehlt`).toBeDefined();
      if (rule.message) expect(found?.message, rule.id).toBe(rule.message);
    }
  });

  it("der Katalog enthält keine weiteren G-, V- oder X-Regeln", () => {
    expect(catalogRows.map((r) => r.id).sort()).toEqual(
      expected.map((r) => r.id).sort(),
    );
  });

  it("[G-1][G-2][G-3][G-4] Grundprüfungen tragen die passende Prüfart", () => {
    expect(catalog.baseChecks.map((r) => [r.id, r.check])).toEqual([
      ["G-1", "self"],
      ["G-2", "duplicate"],
      ["G-3", "freePort"],
      ["G-4", "singleZugang"],
    ]);
  });

  it("[X-1] schließt Konnektor/Highspeed-Konnektor und TI-Gateway gegeneinander aus", () => {
    const [a, b] = catalog.exclusionRules[0]?.exclusive ?? [];
    expect([...members(a as Selector)].sort()).toEqual(["hskon", "kon"]);
    expect([...members(b as Selector)]).toEqual(["gateway"]);
  });

  it("Konsistenz: keine Begründungsregel erfasst ein erlaubtes Paar", () => {
    const allowed = (x: string, y: string) =>
      catalog.connectionRules.some((r) => covers(r.a, r.b, x, y));
    for (const r of catalog.reasonRules) {
      let hits = 0;
      for (const x of placeable)
        for (const y of placeable) {
          if (!covers(r.a, r.b, x.id, y.id)) continue;
          if (r.except?.some((e) => covers(e.a, e.b, x.id, y.id))) continue;
          hits++;
          expect(allowed(x.id, y.id), `${r.id}: ${x.id}/${y.id}`).toBe(false);
        }
      expect(hits, `${r.id} trifft kein Paar`).toBeGreaterThan(0);
    }
  });

  it("Protokolle: sieben Verbindungsarten und die 13 Zeilen aus Regelwerk 3", () => {
    expect(catalog.protocols.connectionKinds.map((k) => k.id)).toEqual([
      "phys",
      "tcp",
      "vpn",
      "wlan",
      "inet",
      "usb",
      "host",
    ]);
    expect(catalog.protocols.protocols).toHaveLength(13);
    const byId = (id: string) =>
      catalog.protocols.protocols.find((p) => p.id === id);
    expect(byId("prot-kt-zugang")).toMatchObject({
      netPort: "4742",
      tls: true,
    });
    expect(byId("prot-mkt-ps")).toMatchObject({
      netPort: "keiner",
      tls: false,
    });
    expect(byId("prot-cardlink-zugang")?.netPort).toBeNull();
    expect(
      catalog.protocols.protocols
        .filter((p) => p.netPortStatus)
        .map((p) => p.id),
    ).toEqual([
      "prot-kt-zugang",
      "prot-ps-zugang",
      "prot-zugang-vpn",
      "prot-timc-tim",
    ]);
    expect(byId("prot-mkt-ps")?.b).toEqual({
      types: ["pvs", "kis", "avs", "pflege", "pc"],
    });
  });
});

describe("Echter Katalog: Nachbesserung T-401", () => {
  const action = (id: string) => catalog.actions.find((a) => a.id === id);
  const flow = (id: string) => catalog.flows.find((f) => f.id === id);

  it("Regelwerk 7: Rezeptcode-Weg ohne eGK- und VSDM-Schritte", () => {
    expect(action("erezept-einloesen-code")?.flow).toBe("erezeptEinloesenCode");
    const code = flow("erezeptEinloesenCode")?.steps ?? [];
    const egk = flow("erezeptEinloesen")?.steps ?? [];
    expect(code.map((s) => [s.from, s.to])).toEqual(
      egk.slice(2).map((s) => [s.from, s.to]),
    );
    expect(code.some((s) => s.to === "VSDM")).toBe(false);
  });

  it("Regelwerk 6.3: AVS liest den Medikationsplan nur mit SMC-B", () => {
    expect(action("medikationsplan-lesen")?.offeredBy).toEqual({
      types: ["pvs", "kis", "kt"],
    });
    const avs = action("medikationsplan-lesen-avs");
    expect(avs?.offeredBy).toEqual({ types: ["avs"] });
    const json = JSON.stringify(avs?.requires);
    expect(json).toContain('"smcb"');
    expect(json).not.toContain('"hba"');
  });

  it("Regelwerk 6.5: mobiles KT liest die eGK offline als plausibel", () => {
    expect(action("mkt-egk-offline-einlesen")?.status).toBe("plausibel");
  });

  it("Regelwerk 7: eAU-Quittung läuft KK→KIM→P", () => {
    const steps = flow("eau")?.steps ?? [];
    expect(steps.slice(-2).map((s) => `${s.from}>${s.to}`)).toEqual([
      "kk>kim",
      "kim>P",
    ]);
  });
});
