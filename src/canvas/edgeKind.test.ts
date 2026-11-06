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
  });
});
