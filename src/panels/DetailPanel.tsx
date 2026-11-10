import { Pin, PinOff } from "lucide-react";
import { useState, type ReactNode } from "react";
import { describeEdge } from "../canvas/edgeKind";
import { matches } from "../engine/rules";
import type { Catalog, Edge, Node, Topology } from "../schema";
import {
  useCatalog,
  useOpen,
  useTopology,
  useUi,
  type Selection,
} from "../store";
import { Button } from "../ui/Button";

const TONE = { sage: "Salbei", accent: "Akzent", neutral: "Neutral" } as const;

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

/** Wird in `Body` immer an derselben Stelle gerendert: ein dauerhaftes Element trägt allein die Live-Ansage (D10). */
function Titled({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <h3 aria-live="polite">{title}</h3>
      {children}
    </>
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

function DeviceDetail({ node, catalog }: { node: Node; catalog: Catalog }) {
  const type = catalog.deviceTypes.find((d) => d.id === node.type);
  return (
    <>
      <dl className="tiv-detail__facts">
        {type && <Row name="Gerätetyp">{`${type.name} (${type.abbr})`}</Row>}
        <Row name="Betrieb">{node.fault ? "Ausgefallen" : "In Betrieb"}</Row>
        {type && (
          <Row name="Anschlüsse">
            {type.ports.map((p) => p.name).join(", ") || "keine"}
          </Row>
        )}
        {type && <Row name="Status">{type.status}</Row>}
      </dl>
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

function Body({ sel }: { sel: Selection }) {
  const topology = useTopology((s) => s.topology);
  const catalog = useCatalog((s) => s.catalog);
  let title = "Details";
  let found = false;
  let content: ReactNode = (
    <p>Gerät oder Verbindung wählen, um Details zu sehen.</p>
  );
  if (sel?.kind === "node") {
    const node = topology.nodes.find((n) => n.id === sel.id);
    if (node) {
      found = true;
      title = nameOf(node, catalog);
      content = <DeviceDetail node={node} catalog={catalog} />;
    }
  } else if (sel?.kind === "edge") {
    const edge = topology.edges.find((e) => e.id === sel.id);
    if (edge) {
      found = true;
      title = endsOf(edge, topology)
        .map((n) => (n ? nameOf(n, catalog) : "?"))
        .join(" ↔ ");
      content = (
        <EdgeDetail edge={edge} topology={topology} catalog={catalog} />
      );
    }
  } else if (sel?.kind === "zone") {
    const zone = topology.zones.find((z) => z.id === sel.id);
    if (zone) {
      found = true;
      title = zone.label ?? zone.id;
      content = (
        <dl className="tiv-detail__facts">
          <Row name="Farbe">{TONE[zone.tone]}</Row>
        </dl>
      );
    }
  }
  if (sel && !found) content = <p>Die Auswahl gibt es nicht mehr.</p>;
  return <Titled title={title}>{content}</Titled>;
}

/** Detailpanel (FR-11): einblendbar; angepinnt bleibt der Inhalt trotz neuer Auswahl. */
export function DetailPanel() {
  const selection = useUi((s) => s.selection);
  const [open, setOpen] = useState(true);
  const opened = useOpen((s) => s.opened);
  const [pin, setPin] = useState<{ sel: Selection; opened: number }>();
  // Beim Öffnen einer Datei oder eines Presets verfällt die Anheftung.
  const pinned = pin?.opened === opened ? pin.sel : undefined;
  const shown = pinned ?? selection;
  return (
    <>
      <div className="tiv-detail__bar">
        <Button
          aria-expanded={open}
          aria-controls="tiv-detail-body"
          onClick={() => {
            setOpen(!open);
          }}
        >
          {open ? "Details ausblenden" : "Details einblenden"}
        </Button>
        {open && shown && (
          <Button
            aria-pressed={pinned !== undefined}
            onClick={() => {
              setPin(pinned ? undefined : { sel: selection, opened });
            }}
          >
            {pinned ? (
              <PinOff aria-hidden="true" />
            ) : (
              <Pin aria-hidden="true" />
            )}
            Anpinnen
          </Button>
        )}
      </div>
      <div id="tiv-detail-body" hidden={!open}>
        <Body sel={shown} />
      </div>
    </>
  );
}
