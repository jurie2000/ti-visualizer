import { describe, expect, it } from "vitest";
import { checkReferences } from "./catalog";
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
      ["eth", "net", "ti", "tun", "usb", "wan", "wifi"].sort(),
    );
  });

  it("[A-1] gleiche Anschlussarten passen zusammen, außer wan mit wan", () => {
    for (const k of kinds)
      expect(compatible(k, k), `${k}/${k}`).toBe(k !== "wan");
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

  it("[A-1][A-2] alle übrigen Paare unterschiedlicher Arten sind unverträglich", () => {
    const allowed = new Set(["eth-wan", "net-wan", "net-tun"]);
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
      [
        "avs",
        "kimcm",
        "kis",
        "lis",
        "pc",
        "pflege",
        "pvs",
        "ris",
        "tab",
      ].sort(),
    );
  });
});
