import {
  useStoreApi,
  type Connection,
  type OnConnectEnd,
  type OnConnectStart,
} from "@xyflow/react";
import { useRef, useState, type KeyboardEvent } from "react";
import { validateConnection } from "../engine/rules";
import { useCatalog, useTopology } from "../store";
import { useToast } from "../ui/Toast";

/** Regeln, deren Verstoß der ExclusionDialog erklärt: X-1 und V-10 (Konnektor an TI-Gateway). */
const EXCLUSION_RULES = ["X-1", "V-10"];

/**
 * Verbinden mit Begründung: Maus über die Anschlusspunkte, Tastatur über „V“
 * am Gerät (Quelle wählen, mit Tab zum Ziel, „V“, Esc bricht ab). Die Topologie
 * ändert nur `useTopology.connect`; ungültige Versuche melden ihre Begründung
 * als Toast oder, bei X-1, im Dialog.
 */
export function useConnecting() {
  const toast = useToast();
  const connect = useTopology((s) => s.connect);
  const [source, setSource] = useState<string>();
  const [exclusion, setExclusion] = useState<string>();
  // Klick-Zug: Quelle vom ersten Klick, und ob der zweite Klick verbunden hat.
  // React Flow liefert im Klick-Modus kein Prüfergebnis an `onClickConnectEnd`.
  const clickFrom = useRef<string>(undefined);
  const clickConnected = useRef(false);
  const flow = useStoreApi();

  /** Bricht einen Klick-Zug ab (Punkt angeklickt, Ziel noch offen). */
  const cancelClick = () => {
    if (flow.getState().connectionClickStartHandle === null) return false;
    flow.setState({ connectionClickStartHandle: null });
    toast.show("Verbinden abgebrochen.");
    return true;
  };

  const nameOf = (id: string) => {
    const node = useTopology.getState().topology.nodes.find((n) => n.id === id);
    const device = useCatalog
      .getState()
      .catalog.deviceTypes.find((d) => d.id === node?.type);
    return node?.label ?? device?.name ?? id;
  };

  const check = (a: string, b: string) =>
    validateConnection(
      useTopology.getState().topology,
      a,
      undefined,
      b,
      undefined,
      useCatalog.getState().catalog,
    );

  const reject = (reason: string, ruleId?: string) => {
    if (ruleId && EXCLUSION_RULES.includes(ruleId)) setExclusion(reason);
    else toast.show(reason, "error");
  };

  const tryConnect = (a: string, b: string) => {
    const r = connect(a, b);
    if (r.ok) toast.show(`Verbunden: ${nameOf(a)} mit ${nameOf(b)}.`);
    else reject(r.reason, r.ruleId);
  };

  return {
    /** Gerät, das per Tastatur als Quelle gewählt ist. */
    source,
    exclusion,
    closeExclusion: () => {
      setExclusion(undefined);
    },
    isValidConnection: (c: { source: string; target: string }) =>
      check(c.source, c.target).ok,
    onConnect: (c: Connection) => {
      clickConnected.current = true;
      tryConnect(c.source, c.target);
    },
    /** Ein losgelassener, ungültiger Zug auf ein Gerät nennt den Grund. */
    onConnectEnd: ((_, state) => {
      if (state.isValid !== false || !state.toNode) return;
      const r = check(state.fromNode.id, state.toNode.id);
      if (!r.ok) reject(r.reason ?? "Verbindung nicht möglich.", r.ruleId);
    }) satisfies OnConnectEnd,
    /** Verbinden per Klick: erst den Punkt, dann das Zielgerät. */
    onClickConnectStart: ((_, { nodeId }) => {
      clickFrom.current = nodeId ?? undefined;
      clickConnected.current = false;
      if (nodeId)
        toast.show(
          `Quelle ${nameOf(nodeId)} gewählt. Jetzt das Zielgerät anklicken, Esc oder ein Klick auf die freie Fläche bricht ab.`,
        );
    }) satisfies OnConnectStart,
    /** Zweiter Klick ohne Verbindung (Zielfläche oder Punkt eines Geräts): Grund nennen. */
    onClickConnectEnd: ((event) => {
      const from = clickFrom.current;
      clickFrom.current = undefined;
      if (clickConnected.current) {
        clickConnected.current = false;
        return;
      }
      const target = event.target instanceof Element ? event.target : null;
      const to = target?.closest(".react-flow__node")?.getAttribute("data-id");
      if (!from || !to) return;
      if (from === to) {
        toast.show("Verbinden abgebrochen.");
        return;
      }
      const r = check(from, to);
      if (!r.ok) reject(r.reason ?? "Verbindung nicht möglich.", r.ruleId);
    }) satisfies OnConnectEnd,
    cancelClick,
    onKeyDown: (e: KeyboardEvent) => {
      // Esc bricht von jeder Stelle der Canvas aus ab
      if (e.key === "Escape" && cancelClick()) return;
      if (e.key === "Escape" && source) {
        setSource(undefined);
        toast.show("Verbinden abgebrochen.");
        return;
      }
      const el = e.target as HTMLElement;
      // nur am fokussierten Gerät selbst, nicht in Unterelementen
      if (!el.classList.contains("react-flow__node")) return;
      const id = el.dataset["id"];
      if (!id) return;
      // Strg/Cmd/Alt+V sind Einfügen und Systemkürzel
      if (e.key.toLowerCase() !== "v" || e.ctrlKey || e.metaKey || e.altKey)
        return;
      if (!source) {
        setSource(id);
        toast.show(
          `Quelle ${nameOf(id)} gewählt. Mit Tab zum Zielgerät gehen und V drücken, Esc bricht ab.`,
        );
        return;
      }
      setSource(undefined);
      if (source === id) toast.show("Verbinden abgebrochen.");
      else tryConnect(source, id);
    },
  };
}
