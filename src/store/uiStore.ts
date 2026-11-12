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
  /** Tutorial-Karte sichtbar (FR-20); der Fortschritt steht in den Einstellungen. */
  tutorial: boolean;
  /** Aktionen, die im Tutorial bis zum Ende durchliefen (Prüfung der Aktions-Schritte). */
  played: string[];
  /** Anschluss, von dem ein Klick im Detailpanel das Verbinden gestartet hat (A-3: der PortPicker wählt ihn vor). */
  connectPort: { node: string; port: string } | undefined;
  select: (selection: Selection) => void;
  startAction: (action: PendingAction | undefined) => void;
  openDialog: (dialog: string | undefined) => void;
  /** Ein- und Ausschalten setzt die gespielten Aktionen zurück. */
  setTutorial: (on: boolean) => void;
  markPlayed: (actionId: string) => void;
  setConnectPort: (p: { node: string; port: string } | undefined) => void;
}>((set) => ({
  selection: undefined,
  dialog: undefined,
  pendingAction: undefined,
  tutorial: false,
  played: [],
  connectPort: undefined,
  select: (selection) => {
    set({ selection });
  },
  startAction: (pendingAction) => {
    set({ pendingAction });
  },
  openDialog: (dialog) => {
    set({ dialog });
  },
  setTutorial: (tutorial) => {
    set({ tutorial, played: [] });
  },
  setConnectPort: (connectPort) => {
    set({ connectPort });
  },
  markPlayed: (actionId) => {
    set((s) => ({ played: [...new Set([...s.played, actionId])] }));
  },
}));
