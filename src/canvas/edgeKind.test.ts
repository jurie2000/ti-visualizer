import { describe, expect, it } from "vitest";
import { loadCatalog, type Edge, type Topology } from "../schema";
import { describeEdge } from "./edgeKind";

const catalog = loadCatalog();

/** Eine Kante zwischen zwei Geräten der angegebenen Typen und Anschlüsse. */
function kindOf(a: [string, string], b: [string, string]) {
  const topology: Topology = {
    name: "",
    description: "",
    simDate: "2026-11-01",
    nodes: [
      { id: "a", type: a[0], position: { x: 0, y: 0 }, fault: false },
      { id: "b", type: b[0], position: { x: 0, y: 0 }, fault: false },
    ],
    edges: [],
    zones: [],
  };
  const edge: Edge = {
    id: "e",
    fault: false,
    ends: [
      { node: "a", port: a[1] },
      { node: "b", port: b[1] },
    ],
  };
  return describeEdge(edge, topology, catalog).kind;
}

describe("Verbindungsart einer Kante (Regelwerk 3)", () => {
  it("[A-4] WLAN-Anschluss ergibt WLAN", () => {
    expect(kindOf(["tab", "wlan0"], ["ap", "wlan"])).toBe("wlan");
  });
  it("T-724a: „Läuft auf“ zwischen Software und Rechner ergibt eigene Art", () => {
    expect(kindOf(["pvs", "host"], ["pc", "soft"])).toBe("host");
  });
  it("T-724c: Zugriff auf einen Cloud-Server ergibt die Art Internet", () => {
    expect(kindOf(["pc", "web"], ["cloud", "web"])).toBe("inet");
  });
  it("#221: Cloud-Server und TI-Gateway (WAN) am Internet ergeben Internet", () => {
    expect(kindOf(["cloud", "inet"], ["internet", "netz"])).toBe("inet");
    expect(kindOf(["gateway", "wan"], ["internet", "netz"])).toBe("inet");
  });
  it("#221: Cloud-Server am TI-Gateway (LAN) ergibt TCP", () => {
    expect(kindOf(["cloud", "lan"], ["gateway", "lan"])).toBe("tcp");
  });
  it("[#202] ZETA Guard, PoPP und VSDM 2.0 ergeben die Art Internet", () => {
    expect(kindOf(["internet", "netz"], ["zeta", "net"])).toBe("inet");
    expect(kindOf(["internet", "netz"], ["popp", "net"])).toBe("inet");
    expect(kindOf(["zeta", "net"], ["vsdm2", "net"])).toBe("inet");
  });
  it("USB-Anschluss ergibt USB", () => {
    expect(kindOf(["mkt", "usb0"], ["pvs", "usb0"])).toBe("usb");
  });
  it("Zugang zum VPN-Zugangsdienst ergibt VPN", () => {
    expect(kindOf(["kon", "vpn"], ["vpn", "zugang"])).toBe("vpn");
  });
  it("Zugang zum Internet ergibt Internet", () => {
    expect(kindOf(["timc", "wan"], ["tim", "net"])).toBe("inet");
  });
  it("Fachdienst im TI-Netz ergibt TCP/TLS", () => {
    expect(kindOf(["vpn", "zentral"], ["vsdm", "ti"])).toBe("tcp");
  });
  it("Primärsystem direkt am Zugang (SOAP/TLS) ergibt TCP/TLS", () => {
    expect(kindOf(["pvs", "eth0"], ["kon", "lan"])).toBe("tcp");
  });
  it("Kartenterminal am Zugang (SICCT/TLS) ergibt TCP/TLS", () => {
    expect(kindOf(["kt", "lan0"], ["kon", "lan"])).toBe("tcp");
  });
  it("Kabel zum Switch bleibt Kabel", () => {
    expect(kindOf(["pvs", "eth0"], ["switch", "p1"])).toBe("phys");
    expect(kindOf(["kon", "lan"], ["switch", "p1"])).toBe("phys");
  });
  it("[#211] Switch zum TI-Gateway ergibt VPN, in beide Richtungen", () => {
    expect(kindOf(["switch", "p1"], ["gateway", "lan"])).toBe("vpn");
    expect(kindOf(["gateway", "lan"], ["switch", "p1"])).toBe("vpn");
  });
  it("[#241] Router zum TI-Gateway (LAN) ergibt VPN, in beide Richtungen", () => {
    expect(kindOf(["router", "lan1"], ["gateway", "lan"])).toBe("vpn");
    expect(kindOf(["gateway", "lan"], ["router", "lan1"])).toBe("vpn");
  });
  it("[#241] TI-Gateway am Zentralen Netz ergibt TCP", () => {
    expect(kindOf(["gateway", "ti"], ["zentral", "netz"])).toBe("tcp");
  });
});
