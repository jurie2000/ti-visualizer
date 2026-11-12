import { Cable, Layers, TriangleAlert, X, type LucideIcon } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import {
  FALLBACK_ICON,
  ICONS,
  NODE_SIZE,
  categoryColor,
} from "../canvas/deviceStyle";
import { describeEdge } from "../canvas/edgeKind";
import { containedNodes } from "../engine/zones";
import { runChecks } from "../engine/checks";
import { matches } from "../engine/rules";
import type { Catalog, Edge, Node, Topology, Zone } from "../schema";
import {
  useCatalog,
  useSettings,
  useTopology,
  useUi,
  type Selection,
} from "../store";
import { Actions } from "./Actions";
import { CardSlots } from "./CardSlots";
import { ConfigForm } from "./ConfigForm";
import { PortList } from "./PortList";
import { ViewPanel } from "./ViewPanel";
import { ZoneForm } from "./ZoneForm";

/** Quellen mit Link (nur https laut Schema), Texte nie als HTML (D10). */
function Sources({ ids, catalog }: { ids: string[]; catalog: Catalog }) {
  return (
    <ul className="tiv-detail__list" aria-label="Quellen">
      {ids.map((id) => {
        const s = catalog.sources.find((x) => x.id === id);
        return (
          <li key={id}>
            {s ? (
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                {s.title}
              </a>
            ) : (
              id
            )}
          </li>
        );
      })}
    </ul>
  );
}

interface Head {
  Icon: LucideIcon;
  color: string;
  kicker: string;
}

/**
 * Kopf des Detailpanels (Mockup: Symbol-Kachel, Kicker, Titel, Schließen).
 * Die Überschrift steht immer an derselben Stelle: ein dauerhaftes Element trägt allein die Live-Ansage (D10).
 */
function Titled({
  title,
  head,
  children,
}: {
  title: string;
  head?: Head | undefined;
  children: ReactNode;
}) {
  return (
    <>
      <div className="tiv-dhead">
        {head && (
          <span
            className="tiv-dhead__tile"
            style={{ "--tile": head.color } as CSSProperties}
          >
            <head.Icon size={19} aria-hidden="true" />
          </span>
        )}
        <div className="tiv-dhead__text">
          {head && <span className="tiv-dhead__kicker">{head.kicker}</span>}
          <h3 aria-live="polite">{title}</h3>
        </div>
        {head && (
          <button
            type="button"
            className="tiv-dhead__close"
            aria-label="Auswahl aufheben"
            onClick={() => {
              useUi.getState().select(undefined);
            }}
          >
            <X size={15} aria-hidden="true" />
          </button>
        )}
      </div>
      {children}
    </>
  );
}

/** Regelverstoß-Kasten (Mockup `detailWarn`): Fehler und Warnungen der Prüfregeln, Text statt nur Farbe. */
function Violations({ names }: { names: string[] }) {
  if (names.length === 0) return null;
  return (
    <div className="tiv-dwarn" role="group" aria-label="Regelverstoß">
      <TriangleAlert size={18} aria-hidden="true" />
      <span>
        <strong>Regelverstoß</strong>
        {names.join(" · ")}
      </span>
    </div>
  );
}

function Row({ name, children }: { name: string; children: ReactNode }) {
  return (
    <>
      <dt>{name}</dt>
      <dd>{children}</dd>
    </>
  );
}

const nameOf = (n: Node, catalog: Catalog) =>
  n.label ?? catalog.deviceTypes.find((d) => d.id === n.type)?.name ?? n.type;

function DeviceDetail({
  node,
  catalog,
  topology,
}: {
  node: Node;
  catalog: Catalog;
  topology: Topology;
}) {
  const type = catalog.deviceTypes.find((d) => d.id === node.type);
  const advanced = useSettings((s) => s.mode) === "advanced";
  const category = catalog.categories.find((c) => c.id === type?.category);
  const connections = topology.edges.filter((e) =>
    e.ends.some((x) => x.node === node.id),
  ).length;
  return (
    <>
      {type?.description && <p className="tiv-dbody">{type.description}</p>}
      <dl className="tiv-detail__facts">
        {type && <Row name="Gerätetyp">{`${type.name} (${type.abbr})`}</Row>}
        {category && <Row name="Kategorie">{category.name}</Row>}
        <Row name="Verbindungen">{String(connections)}</Row>
        <Row name="Position">
          {`x ${String(Math.round(node.position.x))} · y ${String(Math.round(node.position.y))}`}
        </Row>
        <Row name="Betrieb">{node.fault ? "Ausgefallen" : "In Betrieb"}</Row>
        {type && !advanced && (
          <Row name="Anschlüsse">
            {type.ports.map((p) => p.name).join(", ") || "keine"}
          </Row>
        )}
        {type && <Row name="Status">{type.status}</Row>}
      </dl>
      {advanced && (
        <PortList node={node} topology={topology} catalog={catalog} />
      )}
      <CardSlots node={node} catalog={catalog} />
      {advanced && <ConfigForm node={node} />}
      {type && <Sources ids={type.source} catalog={catalog} />}
    </>
  );
}

const endsOf = (edge: Edge, topology: Topology) =>
  edge.ends.map((e) => topology.nodes.find((n) => n.id === e.node));

function EdgeDetail({
  edge,
  topology,
  catalog,
}: {
  edge: Edge;
  topology: Topology;
  catalog: Catalog;
}) {
  const [x, y] = endsOf(edge, topology);
  const kind = describeEdge(edge, topology, catalog).kind;
  const rows = catalog.protocols.protocols.filter(
    (p) =>
      x !== undefined &&
      y !== undefined &&
      ((matches(p.a, x.type, catalog) && matches(p.b, y.type, catalog)) ||
        (matches(p.a, y.type, catalog) && matches(p.b, x.type, catalog))),
  );
  return (
    <>
      <p className="tiv-dbody">
        Über diese Kante läuft der Datenverkehr zwischen den beiden Geräten.
        Verbindungen sind ungerichtet.
      </p>
      <dl className="tiv-detail__facts">
        <Row name="Verbindungsart">
          {catalog.protocols.connectionKinds.find((k) => k.id === kind)?.name ??
            kind}
        </Row>
        <Row name="Zustand">{edge.fault ? "Getrennt" : "Verbunden"}</Row>
      </dl>
      {rows.length === 0 && (
        <p>Für diese Verbindung ist kein Protokoll belegt.</p>
      )}
      {rows.map((p) => (
        <section key={p.id} aria-label={`Protokoll ${p.label}`}>
          <h4>{p.label}</h4>
          <dl className="tiv-detail__facts">
            <Row name="Protokoll und Datenformat">{p.protocol}</Row>
            {p.netPort !== null && (
              <Row name="Netzport">
                {p.netPort}
                {p.netPortStatus ? ` (${p.netPortStatus})` : ""}
              </Row>
            )}
            {p.tls !== null && <Row name="TLS">{p.tls ? "ja" : "nein"}</Row>}
            <Row name="Status">{p.status}</Row>
          </dl>
          <Sources ids={p.source} catalog={catalog} />
        </section>
      ))}
    </>
  );
}

const ZONE_TEXT =
  "Zonen gliedern die Fläche, etwa nach Abteilung oder Raum. Sie sind nur Beschriftung und ändern nichts an den Verbindungen.";

const ZONE_COLOR: Record<Zone["tone"], string> = {
  sage: "var(--color-accent-2)",
  accent: "var(--color-accent)",
  neutral: "var(--color-neutral-600)",
};

/** Geräte in der Zone (Mockup „Geräte darin“): Klick wählt das Gerät. In einer Ellipse zählt das Rechteck. */
function ZoneMembers({
  zone,
  topology,
  catalog,
}: {
  zone: Zone;
  topology: Topology;
  catalog: Catalog;
}) {
  const inside = containedNodes(zone, topology.nodes, NODE_SIZE);
  return (
    <section className="tiv-members" aria-label="Geräte in der Zone">
      <h4>Geräte in der Zone</h4>
      {inside.length === 0 ? (
        <p>keine</p>
      ) : (
        <ul>
          {inside.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                className="tiv-members__item"
                onClick={() => {
                  useUi.getState().select({ kind: "node", id: n.id });
                }}
              >
                {nameOf(n, catalog)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Body({ sel }: { sel: Selection }) {
  const topology = useTopology((s) => s.topology);
  const catalog = useCatalog((s) => s.catalog);
  const mode = useSettings((s) => s.mode);
  let title = "Details";
  let head: Head | undefined;
  let violations: string[] = [];
  let actions: ReactNode;
  let found = false;
  let content: ReactNode = <ViewPanel />;
  const violated = (
    pick: (f: { nodes: string[]; edges: string[] }) => boolean,
  ) =>
    runChecks(topology, mode, catalog)
      .filter((f) => f.severity !== "Hinweis" && pick(f))
      .map((f) => f.name);
  if (sel?.kind === "node") {
    const node = topology.nodes.find((n) => n.id === sel.id);
    if (node) {
      found = true;
      const type = catalog.deviceTypes.find((d) => d.id === node.type);
      title = nameOf(node, catalog);
      head = {
        Icon: ICONS[type?.icon ?? ""] ?? FALLBACK_ICON,
        color: categoryColor(type?.category ?? ""),
        kicker:
          catalog.categories.find((c) => c.id === type?.category)?.name ??
          "Gerät",
      };
      violations = violated((f) => f.nodes.includes(node.id));
      actions = <Actions kind="node" id={node.id} fault={node.fault} />;
      content = (
        <DeviceDetail node={node} catalog={catalog} topology={topology} />
      );
    }
  } else if (sel?.kind === "edge") {
    const edge = topology.edges.find((e) => e.id === sel.id);
    if (edge) {
      found = true;
      title = endsOf(edge, topology)
        .map((n) => (n ? nameOf(n, catalog) : "?"))
        .join(" ↔ ");
      head = {
        Icon: Cable,
        color: `var(--tiv-edge-${describeEdge(edge, topology, catalog).kind}, var(--color-neutral-600))`,
        kicker: "Verbindung",
      };
      violations = violated((f) => f.edges.includes(edge.id));
      actions = <Actions kind="edge" id={edge.id} fault={edge.fault} />;
      content = (
        <EdgeDetail edge={edge} topology={topology} catalog={catalog} />
      );
    }
  } else if (sel?.kind === "zone") {
    const zone = topology.zones.find((z) => z.id === sel.id);
    if (zone) {
      found = true;
      title = zone.label ?? zone.id;
      head = { Icon: Layers, color: ZONE_COLOR[zone.tone], kicker: "Zone" };
      content = (
        <>
          <p className="tiv-dbody tiv-dbody--text">
            {zone.description ?? ZONE_TEXT}
          </p>
          {/* key: eine andere Zone startet wieder eingeklappt */}
          <ZoneForm key={zone.id} zone={zone} />
          <ZoneMembers zone={zone} topology={topology} catalog={catalog} />
        </>
      );
    }
  }
  if (sel && !found) content = <p>Die Auswahl gibt es nicht mehr.</p>;
  return (
    <Titled title={title} head={head}>
      <Violations names={violations} />
      {content}
      {actions}
    </Titled>
  );
}

/** Detailpanel (FR-11): zeigt die Auswahl; Einblenden und Anheften übernimmt `SidePanel` (T-711). */
export function DetailPanel() {
  const selection = useUi((s) => s.selection);
  return (
    <div id="tiv-detail-body">
      <Body sel={selection} />
    </div>
  );
}
