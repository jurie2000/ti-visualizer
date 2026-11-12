import {
  EthernetPort,
  Globe,
  Network,
  Server,
  ShieldCheck,
  Usb,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { isFree } from "../engine/rules";
import type { Catalog, Edge, Node, Topology } from "../schema";
import { simLocked, useSim, useUi } from "../store";

const ICON: Record<string, LucideIcon> = {
  eth: EthernetPort,
  wan: Globe,
  usb: Usb,
  wifi: Wifi,
  net: Network,
  tun: ShieldCheck,
  ti: Server,
};

/**
 * Anschlüsse eines Geräts mit Art und Belegung (Mockup `showPorts`, FR-14, Modus Erweitert).
 * Der Status steht als Text („frei“, Gegenstelle), nie nur in der Farbe. Jeder Anschluss
 * ist ein Knopf: ein Einfachanschluss mit Verbindung wählt diese Kante, jeder andere
 * startet das Verbinden von diesem Anschluss (Klick-Modus der Fläche, A-3).
 */
export function PortList({
  node,
  topology,
  catalog,
}: {
  node: Node;
  topology: Topology;
  catalog: Catalog;
}) {
  const locked = simLocked(useSim((s) => s.sim));
  const ports = catalog.deviceTypes.find((d) => d.id === node.type)?.ports;
  if (!ports?.length) return null;
  const free = ports.filter((p) => isFree(topology, node.id, p)).length;
  /** Gegenstelle als „Abkürzung · Anschluss“ (Mockup). */
  const peerText = (e: Edge, port: string) => {
    const o = e.ends.find((x) => x.node !== node.id || x.port !== port);
    const type = topology.nodes.find((n) => n.id === o?.node)?.type;
    const d = catalog.deviceTypes.find((x) => x.id === type);
    return `${d?.abbr ?? "?"} · ${d?.ports.find((q) => q.id === o?.port)?.name ?? "?"}`;
  };
  return (
    <section className="tiv-ports-list" aria-label="Anschlüsse">
      <div className="tiv-ports-list__head">
        <h4>Anschlüsse</h4>
        <span>{`${String(free)} von ${String(ports.length)} frei`}</span>
      </div>
      <ul>
        {ports.map((p) => {
          const edges = topology.edges.filter((e) =>
            e.ends.some((x) => x.node === node.id && x.port === p.id),
          );
          const peers = edges.map((e) => peerText(e, p.id));
          const used = edges.length > 0;
          const status = !used
            ? "frei"
            : p.multi
              ? edges.length === 1
                ? "1 Verbindung"
                : `${String(edges.length)} Verbindungen`
              : (peers[0] ?? "");
          const kind = catalog.portKinds.kinds.find((k) => k.id === p.kind);
          const Icon = ICON[p.kind] ?? Network;
          const only = edges.length === 1 && !p.multi ? edges[0] : undefined;
          const peerInfo = used ? `verbunden mit ${peers.join(", ")}` : "frei";
          return (
            <li key={p.id}>
              <button
                type="button"
                className="tiv-port"
                disabled={locked && !only}
                aria-label={
                  only
                    ? undefined
                    : `${p.name}: Verbindung von hier starten, ${peerInfo}`
                }
                title={only ? `Verbunden mit ${peers.join(", ")}` : peerInfo}
                onClick={() => {
                  if (only)
                    useUi.getState().select({ kind: "edge", id: only.id });
                  else
                    useUi
                      .getState()
                      .setConnectPort({ node: node.id, port: p.id });
                }}
              >
                <span className="tiv-port__icon" data-kind={p.kind}>
                  <Icon size={18} aria-hidden="true" />
                </span>
                <span className="tiv-port__text">
                  <strong>{p.name}</strong>
                  <span>{`${kind?.name ?? p.kind}${p.multi ? " · mehrfach" : ""}`}</span>
                </span>
                <span className="tiv-port__pill" data-used={used}>
                  {status}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
