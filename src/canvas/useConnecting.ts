import type { Connection, OnConnectEnd } from "@xyflow/react";
import { useState, type KeyboardEvent } from "react";
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
      tryConnect(c.source, c.target);
    },
    /** Ein losgelassener, ungültiger Zug auf ein Gerät nennt den Grund. */
    onConnectEnd: ((_, state) => {
      if (state.isValid !== false || !state.toNode) return;
      const r = check(state.fromNode.id, state.toNode.id);
      if (!r.ok) reject(r.reason ?? "Verbindung nicht möglich.", r.ruleId);
    }) satisfies OnConnectEnd,
    onKeyDown: (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      // nur am fokussierten Gerät selbst, nicht in Unterelementen
      if (!el.classList.contains("react-flow__node")) return;
      const id = el.dataset["id"];
      if (!id) return;
      if (e.key === "Escape" && source) {
        setSource(undefined);
        toast.show("Verbinden abgebrochen.");
        return;
      }
      if (e.key.toLowerCase() !== "v") return;
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
