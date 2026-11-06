import type { Catalog, Edge, Topology } from "../schema";

/** Verbindungsarten mit eigenem Linienstil (Tokens `--tiv-edge-…`). */
export type EdgeKind = "phys" | "nfc" | "tcp" | "vpn" | "wlan" | "inet";

interface Described {
  kind: EdgeKind;
  /** Kurztext an der Kante. */
  label: string;
  /** Satz für Screenreader. */
  description: string;
}

const KIND_NAME: Record<EdgeKind, string> = {
  phys: "Kabel",
  nfc: "NFC",
  tcp: "TCP/TLS",
  vpn: "VPN",
  wlan: "WLAN",
  inet: "Internet",
};

/** Ordnet eine Kante nach den Anschlussarten ihrer Enden einer Verbindungsart zu (A-4: wifi = WLAN). */
export function describeEdge(
  edge: Edge,
  topology: Topology,
  catalog: Catalog,
): Described {
  const ends = edge.ends.map((end) => {
    const node = topology.nodes.find((n) => n.id === end.node);
    const device = catalog.deviceTypes.find((d) => d.id === node?.type);
    const port = device?.ports.find((p) => p.id === end.port);
    return {
      device: node?.label ?? device?.abbr ?? end.node,
      port: port?.name ?? end.port,
      kind: port?.kind,
    };
  });
  const has = (k: string) => ends.some((e) => e.kind === k);
  const both = (k: string) => ends.every((e) => e.kind === k);

  const kind: EdgeKind = has("wifi")
    ? "wlan"
    : both("tun")
      ? "vpn"
      : has("net")
        ? "inet"
        : both("ti")
          ? "tcp"
          : "phys";

  const [a, b] = ends;
  const ports = a && b ? `${a.port} ↔ ${b.port}` : "";
  const label = kind === "phys" || kind === "wlan" ? ports : KIND_NAME[kind];
  const fault = edge.fault ? ", gestört" : "";
  return {
    kind,
    label,
    description: `Verbindung ${a?.device ?? ""} zu ${b?.device ?? ""}, ${KIND_NAME[kind]}, ${ports}${fault}`,
  };
}
