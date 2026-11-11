import { LayoutGrid, Redo2, Copy, Undo2 } from "lucide-react";
import { useEffect, useRef } from "react";
import {
  arrange,
  copyNodes,
  pasteClip,
  simLocked,
  useCatalog,
  useSim,
  useTopology,
  useUi,
  type Clip,
} from "../store";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { keyshortcuts, label, OWN_KEYS } from "./keys";

/** Rückgängig, Wiederholen, Duplizieren, Anordnen in der Kopfleiste, dazu die Kürzel (FR-16, D10). */
export function EditControls() {
  const toast = useToast();
  const past = useTopology((s) => s.past.length);
  const future = useTopology((s) => s.future.length);
  const selection = useUi((s) => s.selection);
  const locked = simLocked(useSim((s) => s.sim));
  const clip = useRef<{ clip: Clip; pastes: number }>(undefined);

  const run = (action: () => void) => {
    if (simLocked(useSim.getState().sim)) {
      toast.show("Während der Simulation ist die Topologie gesperrt.");
      return;
    }
    action();
  };
  const dropStaleSelection = () => {
    const { selection: sel, select } = useUi.getState();
    const t = useTopology.getState().topology;
    if (
      sel &&
      ![...t.nodes, ...t.edges, ...t.zones].some((e) => e.id === sel.id)
    )
      select(undefined);
  };
  const undo = () => {
    run(() => {
      useTopology.getState().undo();
      dropStaleSelection();
    });
  };
  const redo = () => {
    run(() => {
      useTopology.getState().redo();
      dropStaleSelection();
    });
  };
  const copy = () => {
    const sel = useUi.getState().selection;
    if (sel?.kind !== "node") return false;
    clip.current = {
      clip: copyNodes(useTopology.getState().topology, [sel.id]),
      pastes: 0,
    };
    toast.show("Gerät kopiert.");
    return true;
  };
  const paste = () => {
    const c = clip.current;
    if (!c) return;
    run(() => {
      const r = pasteClip(
        useTopology.getState().topology,
        c.clip,
        useCatalog.getState().catalog,
        c.pastes + 1,
      );
      if (!r.ok) {
        toast.show(r.reason, "error");
        return;
      }
      c.pastes++;
      useTopology.getState().replace(r.topology);
      const first = r.ids[0];
      if (first) useUi.getState().select({ kind: "node", id: first });
      if (r.skippedEdges > 0)
        toast.show(
          `${String(r.skippedEdges)} Verbindung(en) nicht übernommen: nicht gültig.`,
        );
    });
  };
  const duplicate = () => {
    if (copy()) paste();
  };
  const remove = () => {
    const sel = useUi.getState().selection;
    if (sel?.kind !== "node" && sel?.kind !== "edge") return;
    run(() => {
      const t = useTopology.getState();
      if (sel.kind === "node") t.removeNode(sel.id);
      else t.removeEdge(sel.id);
      useUi.getState().select(undefined);
    });
  };
  const doArrange = () => {
    run(() => {
      useTopology.getState().replace(arrange(useTopology.getState().topology));
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target instanceof Element ? e.target : undefined;
      if (e.defaultPrevented || target?.closest(OWN_KEYS)) return;
      const k = e.key.toLowerCase();
      const handle = (action: () => void) => {
        e.preventDefault();
        action();
      };
      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        if (k === "z") handle(e.shiftKey ? redo : undo);
        else if (k === "y") handle(redo);
        else if (k === "d") handle(duplicate);
        else if (k === "v") handle(paste);
        // markierter Text auf der Seite behält sein Kopieren
        else if (k === "c" && !window.getSelection()?.toString()) copy();
      } else if (
        (k === "delete" || k === "backspace") &&
        (!target || target === document.body || target.closest(".tiv-canvas"))
      )
        handle(remove);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  });

  return (
    <div role="group" aria-label="Bearbeiten" className="tiv-edit">
      <Button
        onClick={undo}
        disabled={locked || past === 0}
        title={label("Z")}
        aria-keyshortcuts={keyshortcuts("Z")}
      >
        <Undo2 size={18} aria-hidden="true" className="tiv-edit__icon" />
        <span className="tiv-edit__text">Rückgängig</span>
      </Button>
      <Button
        onClick={redo}
        disabled={locked || future === 0}
        title={label("Y")}
        aria-keyshortcuts={keyshortcuts("Y")}
      >
        <Redo2 size={18} aria-hidden="true" className="tiv-edit__icon" />
        <span className="tiv-edit__text">Wiederholen</span>
      </Button>
      <Button
        onClick={duplicate}
        disabled={locked || selection?.kind !== "node"}
        title={label("D")}
        aria-keyshortcuts={keyshortcuts("D")}
      >
        <Copy size={18} aria-hidden="true" className="tiv-edit__icon" />
        <span className="tiv-edit__text">Duplizieren</span>
      </Button>
      <Button onClick={doArrange} disabled={locked} title="Anordnen">
        <LayoutGrid size={18} aria-hidden="true" className="tiv-edit__icon" />
        <span className="tiv-edit__text">Anordnen</span>
      </Button>
    </div>
  );
}
