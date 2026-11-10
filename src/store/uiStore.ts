import { create } from "zustand";

export type Selection =
  { kind: "node" | "edge" | "zone"; id: string } | undefined;

/** Gewählte Aktion aus dem Kontextmenü; der Player (T-405) spielt sie ab. */
export interface PendingAction {
  nodeId: string;
  actionId: string;
  /** Wahl der Nutzer, wenn mehrere Terminals passen (Regelwerk 6.0). */
  terminal?: string;
}

/** Flüchtiger Oberflächenzustand: nicht gespeichert, nicht Teil des Verlaufs. */
export const useUi = create<{
  selection: Selection;
  /** Name des offenen Dialogs oder Panels, `undefined` wenn keiner offen ist. */
  dialog: string | undefined;
  pendingAction: PendingAction | undefined;
  select: (selection: Selection) => void;
  startAction: (action: PendingAction | undefined) => void;
  openDialog: (dialog: string | undefined) => void;
}>((set) => ({
  selection: undefined,
  dialog: undefined,
  pendingAction: undefined,
  select: (selection) => {
    set({ selection });
  },
  startAction: (pendingAction) => {
    set({ pendingAction });
  },
  openDialog: (dialog) => {
    set({ dialog });
  },
}));
