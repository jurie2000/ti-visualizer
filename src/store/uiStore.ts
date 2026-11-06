import { create } from "zustand";

export type Selection =
  { kind: "node" | "edge" | "zone"; id: string } | undefined;

/** Flüchtiger Oberflächenzustand: nicht gespeichert, nicht Teil des Verlaufs. */
export const useUi = create<{
  selection: Selection;
  /** Name des offenen Dialogs oder Panels, `undefined` wenn keiner offen ist. */
  dialog: string | undefined;
  select: (selection: Selection) => void;
  openDialog: (dialog: string | undefined) => void;
}>((set) => ({
  selection: undefined,
  dialog: undefined,
  select: (selection) => {
    set({ selection });
  },
  openDialog: (dialog) => {
    set({ dialog });
  },
}));
