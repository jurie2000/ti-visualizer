import { SimPlayer } from "../canvas/SimPlayer";
import { describeEdge } from "../canvas/edgeKind";
import { useContextMenu } from "../canvas/useContextMenu";
import { CARD_NAMES, cardState } from "../engine/cards";
import { collapseHidden } from "../engine/collapse";
import { useCatalog, useSettings, useTopology, useUi } from "../store";
import { Button } from "../ui/Button";
import "./topologyList.css";

const CARD_STATUS = {
  expired: "abgelaufen",
  locked: "nicht freigeschaltet",
  ready: "",
  none: "",
} as const;

/**
 * Textalternative zur Fläche (FR-22, D10): Geräte mit Kategorie, Karten und
 * Verbindungen als Tabelle. Die Aktionen öffnen dasselbe Menü wie auf der
 * Fläche (`useContextMenu`), die Sicherheitsprüfung ist ein eigener Knopf.
 */
export function TopologyList() {
  const topology = useTopology((s) => s.topology);
  const catalog = useCatalog((s) => s.catalog);
  const mode = useSettings((s) => s.mode);
  const menu = useContextMenu();
  // Wie auf der Fläche: im Modus Einfach nur sichtbare Geräte, Wege über ausgeblendete als Sammelkante
  const view =
    mode === "simple"
      ? collapseHidden(topology, catalog)
      : { ...topology, groups: [] };
  const name = (id: string) => {
    const n = topology.nodes.find((x) => x.id === id);
    return (
      n?.label ?? catalog.deviceTypes.find((d) => d.id === n?.type)?.name ?? id
    );
  };

  return (
    <div className="tiv-list">
      <div className="tiv-list__bar">
        <Button
          onClick={() => {
            useUi.getState().openDialog("security");
          }}
        >
          Sicherheitsprüfung
        </Button>
      </div>
      {view.nodes.length === 0 ? (
        <p>Die Topologie enthält noch keine Geräte.</p>
      ) : (
        <table className="tiv-list__table">
          <caption>Geräte und Verbindungen der Topologie</caption>
          <thead>
            <tr>
              <th scope="col">Gerät</th>
              <th scope="col">Kategorie</th>
              <th scope="col">Karten</th>
              <th scope="col">Verbindungen</th>
              <th scope="col">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {view.nodes.map((node) => {
              const device = catalog.deviceTypes.find(
                (d) => d.id === node.type,
              );
              const category = catalog.categories.find(
                (c) => c.id === device?.category,
              );
              return (
                <tr key={node.id}>
                  <th scope="row">
                    {name(node.id)}
                    {node.fault && " (gestört)"}
                  </th>
                  <td>{category?.name ?? "–"}</td>
                  <td>
                    {node.cards?.length ? (
                      <ul>
                        {node.cards.map((c) => {
                          const s =
                            CARD_STATUS[
                              cardState(topology, node.id, c.kind).state
                            ];
                          return (
                            <li key={c.kind}>
                              {CARD_NAMES[c.kind]}
                              {s && ` (${s})`}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      "–"
                    )}
                  </td>
                  <td>
                    <ul>
                      {view.edges
                        .filter((e) => e.ends.some((x) => x.node === node.id))
                        .map((e) => {
                          const text = describeEdge(
                            e,
                            topology,
                            catalog,
                          ).description;
                          return (
                            <li key={e.id}>
                              {text}{" "}
                              <Button
                                aria-haspopup="menu"
                                aria-label={`Aktionen: ${text}`}
                                onClick={(ev) => {
                                  menu.openAt(ev.currentTarget, "edge", e.id);
                                }}
                              >
                                Aktionen
                              </Button>
                            </li>
                          );
                        })}
                      {view.groups
                        .filter((g) => g.ends.includes(node.id))
                        .map((g) => (
                          <li key={g.id}>
                            Sammelkante zu{" "}
                            {name(g.ends.find((x) => x !== node.id) ?? "")} über{" "}
                            {g.hidden.map(name).join(", ")}
                          </li>
                        ))}
                    </ul>
                  </td>
                  <td>
                    <Button
                      data-sim-return={node.id}
                      aria-haspopup="menu"
                      aria-label={`Aktionen: ${name(node.id)}`}
                      onClick={(ev) => {
                        menu.openAt(ev.currentTarget, "node", node.id);
                      }}
                    >
                      Aktionen
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <SimPlayer />
      {menu.element}
    </div>
  );
}
