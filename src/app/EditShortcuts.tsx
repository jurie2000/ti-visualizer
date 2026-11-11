import { useEffect, useRef } from "react";
import {
  copyNodes,
  pasteClip,
  simLocked,
  useCatalog,
  useSim,
  useTopology,
  useUi,
  type Clip,
} from "../store";
import { useToast } from "../ui/Toast";
import { OWN_KEYS } from "./keys";

/** Kürzel für Kopieren, Einfügen und Löschen (FR-16, D10). */
export function EditShortcuts() {
  const toast = useToast();
  const clip = useRef<{ clip: Clip; pastes: number }>(undefined);

  const run = (action: () => void) => {
    if (simLocked(useSim.getState().sim)) {
      toast.show("Während der Simulation ist die Topologie gesperrt.");
      return;
    }
    action();
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
        if (k === "v") handle(paste);
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

  return null;
}
