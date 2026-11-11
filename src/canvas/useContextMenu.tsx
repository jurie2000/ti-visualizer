import type { Edge as FlowEdge, Node as FlowNode } from "@xyflow/react";
import { useState, type KeyboardEvent, type MouseEvent } from "react";
import { TerminalDialog } from "../dialogs/TerminalDialog";
import { availableActions } from "../engine/actions";
import { useCatalog, useSettings, useTopology, useUi } from "../store";
import { useToast } from "../ui/Toast";
import { ContextMenu, type MenuEntry } from "./ContextMenu";

type Target = { kind: "node" | "edge"; id: string; x: number; y: number };

/** Kontextmenü an Gerät und Verbindung (FR-6, FR-7, FR-18): Rechtsklick, Menütaste, Umschalt+F10. */
export function useContextMenu() {
  const topology = useTopology((s) => s.topology);
  const toggleFault = useTopology((s) => s.toggleFault);
  const catalog = useCatalog((s) => s.catalog);
  const mode = useSettings((s) => s.mode);
  const toast = useToast();
  const [target, setTarget] = useState<Target>();
  const [choosing, setChoosing] = useState<{
    nodeId: string;
    actionId: string;
    name: string;
    terminals: string[];
  }>();

  const nameOf = (id: string) => {
    const n = topology.nodes.find((x) => x.id === id);
    return n
      ? (n.label ??
          catalog.deviceTypes.find((d) => d.id === n.type)?.name ??
          n.type)
      : id;
  };

  const entries = (t: Target): MenuEntry[] => {
    const fault = (label: string): MenuEntry => ({
      id: "fault",
      label,
      onSelect: () => {
        toggleFault(t.id);
      },
    });
    if (t.kind === "edge") {
      const e = topology.edges.find((x) => x.id === t.id);
      return [
        fault(e?.fault ? "Verbindung wiederherstellen" : "Verbindung trennen"),
      ];
    }
    const node = topology.nodes.find((x) => x.id === t.id);
    if (!node) return [];
    const actions = availableActions(node, topology, catalog, mode).map(
      (a): MenuEntry => ({
        id: `action-${a.id}`,
        label: a.name,
        ...(!a.enabled && {
          disabledReason: a.disabledReason || "Nicht ausführbar.",
        }),
        onSelect: () => {
          if (a.chooseTerminal) {
            setChoosing({
              nodeId: node.id,
              actionId: a.id,
              name: a.name,
              terminals: a.chooseTerminal,
            });
            return;
          }
          useUi.getState().startAction({
            nodeId: node.id,
            actionId: a.id,
            ...(a.terminal && { terminal: a.terminal }),
          });
          toast.show(`„${a.name}“ gewählt.`);
        },
      }),
    );
    return [
      {
        id: "details",
        label: "Details",
        onSelect: () => {
          useUi.getState().select({ kind: "node", id: node.id });
        },
      },
      ...actions,
      fault(node.fault ? "Wieder in Betrieb nehmen" : "Ausfall simulieren"),
    ];
  };

  const known = (kind: Target["kind"], id: string) =>
    (kind === "node" ? topology.nodes : topology.edges).some(
      (x) => x.id === id,
    );

  const open = (kind: Target["kind"], id: string, x: number, y: number) => {
    if (known(kind, id)) setTarget({ kind, id, x, y });
  };

  // Tastatur-Menü (und `contextmenu` ohne Maus) öffnet am Rand des Elements.
  const openAt = (el: Element, kind: Target["kind"], id: string) => {
    const r = el.getBoundingClientRect();
    open(kind, id, r.left, r.bottom);
  };

  const onMouse =
    (kind: Target["kind"]) => (e: MouseEvent, item: FlowNode | FlowEdge) => {
      e.preventDefault();
      if (e.button === 2) open(kind, item.id, e.clientX, e.clientY);
      else openAt(e.currentTarget, kind, item.id);
    };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "ContextMenu" && !(e.shiftKey && e.key === "F10")) return;
    const el = e.target as HTMLElement;
    const kind = el.classList.contains("react-flow__node")
      ? "node"
      : el.classList.contains("react-flow__edge")
        ? "edge"
        : undefined;
    const id = el.dataset["id"];
    if (!kind || !id) return;
    e.preventDefault();
    openAt(el, kind, id);
  };

  const close = () => {
    setTarget(undefined);
  };

  const element = (
    <>
      {target && (
        <ContextMenu
          x={target.x}
          y={target.y}
          title={target.kind === "node" ? nameOf(target.id) : "Verbindung"}
          entries={entries(target)}
          onClose={close}
        />
      )}
      <TerminalDialog
        options={(choosing?.terminals ?? []).map((id) => ({
          id,
          name: nameOf(id),
        }))}
        onClose={() => {
          setChoosing(undefined);
        }}
        onChoose={(terminal) => {
          if (choosing)
            useUi.getState().startAction({
              nodeId: choosing.nodeId,
              actionId: choosing.actionId,
              terminal,
            });
          setChoosing(undefined);
          if (choosing) toast.show(`„${choosing.name}“ gewählt.`);
        }}
      />
    </>
  );

  return {
    element,
    onNodeContextMenu: onMouse("node"),
    onEdgeContextMenu: onMouse("edge"),
    onKeyDown,
    /** Menü an einem Knopf der Listenansicht (T-701). */
    openAt,
  };
}
