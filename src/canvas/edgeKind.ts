import { isWlan } from "../engine/rules";
import type { Catalog, Edge, Selector, Topology } from "../schema";

/** Verbindungsarten mit eigenem Linienstil (Tokens `--tiv-edge-…`). */
export type EdgeKind =
  "phys" | "usb" | "tcp" | "vpn" | "wlan" | "inet" | "host";

interface Described {
  kind: EdgeKind;
  /** Kurztext an der Kante. */
  label: string;
  /** Satz für Screenreader. */
  description: string;
}

const KIND_NAME: Record<EdgeKind, string> = {
  phys: "Kabel",
  usb: "USB",
  tcp: "TCP/TLS",
  vpn: "VPN",
  wlan: "WLAN",
  inet: "Internet",
  host: "läuft auf",
};

const selects = (s: Selector, type: string, catalog: Catalog) =>
  "types" in s
    ? s.types.includes(type)
    : (catalog.deviceTypes
        .find((d) => d.id === type)
        ?.capabilities.includes(s.capability) ?? false);

/**
 * Kabel zwischen Endgeräten, für die das Regelwerk (3) ein TLS-Protokoll kennt,
 * ist eine TCP/TLS-Verbindung. Kabel zu Netzgeräten (Switch, Router)
 * bleiben physisch.
 */
function carriesTls(types: [string, string], catalog: Catalog): boolean {
  const category = (t: string) =>
    catalog.deviceTypes.find((d) => d.id === t)?.category;
  if (types.some((t) => category(t) === "lan")) return false;
  const [x, y] = types;
  return catalog.protocols.protocols.some(
    (p) =>
      p.tls === true &&
      ((selects(p.a, x, catalog) && selects(p.b, y, catalog)) ||
        (selects(p.a, y, catalog) && selects(p.b, x, catalog))),
  );
}

/** Ordnet eine Kante nach den Anschlussarten ihrer Enden einer Verbindungsart zu (A-4: wifi = WLAN). */
export function describeEdge(
  edge: Edge,
  topology: Topology,
  catalog: Catalog,
  selected = false,
): Described {
  const ends = edge.ends.map((end) => {
    const node = topology.nodes.find((n) => n.id === end.node);
    const device = catalog.deviceTypes.find((d) => d.id === node?.type);
    const port = device?.ports.find((p) => p.id === end.port);
    return {
      device: node?.label ?? device?.abbr ?? end.node,
      port: port?.name ?? end.port,
      kind: port?.kind,
      type: node?.type ?? "",
    };
  });
  const has = (k: string) => ends.some((e) => e.kind === k);
  const both = (k: string) => ends.every((e) => e.kind === k);

  const [a, b] = ends;
  const kind: EdgeKind = both("host")
    ? "host"
    : isWlan(edge, topology, catalog)
      ? "wlan"
      : both("tun")
        ? "vpn"
        : has("net")
          ? "inet"
          : both("ti") || both("app")
            ? "tcp"
            : has("usb")
              ? "usb"
              : a && b && carriesTls([a.type, b.type], catalog)
                ? "tcp"
                : "phys";

  const ports = a && b ? `${a.port} ↔ ${b.port}` : "";
  const label =
    kind === "phys" || kind === "usb" || kind === "wlan"
      ? ports
      : KIND_NAME[kind];
  const fault = edge.fault ? ", gestört" : "";
  return {
    kind,
    label,
    description: `Verbindung ${a?.device ?? ""} zu ${b?.device ?? ""}, ${KIND_NAME[kind]}, ${ports}${fault}${selected ? ", ausgewählt" : ""}`,
  };
}
