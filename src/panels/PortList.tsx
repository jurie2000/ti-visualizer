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
import type { Catalog, Node, Topology } from "../schema";
import { useUi } from "../store";

const ICON: Record<string, LucideIcon> = {
  eth: EthernetPort,
  wan: Globe,
  usb: Usb,
  wifi: Wifi,
  net: Network,
  tun: ShieldCheck,
  ti: Server,
};

const abbrOf = (id: string, topology: Topology, catalog: Catalog) => {
  const type = topology.nodes.find((n) => n.id === id)?.type;
  return catalog.deviceTypes.find((d) => d.id === type)?.abbr ?? "?";
};

/**
 * Anschlüsse eines Geräts mit Art und Belegung (Mockup `showPorts`, FR-14, Modus Erweitert).
 * Der Status steht als Text („frei“, Gegenstelle), nie nur in der Farbe; ein belegter
 * Anschluss mit einer Verbindung wählt diese Kante.
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
  const ports = catalog.deviceTypes.find((d) => d.id === node.type)?.ports;
  if (!ports?.length) return null;
  const free = ports.filter((p) => isFree(topology, node.id, p)).length;
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
          const peers = edges.map((e) => {
            const o = e.ends.find((x) => x.node !== node.id || x.port !== p.id);
            const name = catalog.deviceTypes
              .find(
                (d) =>
                  d.id === topology.nodes.find((n) => n.id === o?.node)?.type,
              )
              ?.ports.find((q) => q.id === o?.port)?.name;
            return `${abbrOf(o?.node ?? "", topology, catalog)} · ${name ?? "?"}`;
          });
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
          const body = (
            <>
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
            </>
          );
          const only = edges.length === 1 && !p.multi ? edges[0] : undefined;
          return (
            <li key={p.id}>
              {only ? (
                <button
                  type="button"
                  className="tiv-port"
                  title={`Verbunden mit ${peers.join(", ")}`}
                  onClick={() => {
                    useUi.getState().select({ kind: "edge", id: only.id });
                  }}
                >
                  {body}
                </button>
              ) : (
                <div
                  className="tiv-port"
                  title={
                    used
                      ? `Verbunden mit ${peers.join(", ")}`
                      : "Anschluss frei"
                  }
                >
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
