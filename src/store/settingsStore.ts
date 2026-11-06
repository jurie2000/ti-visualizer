import { create } from "zustand";

export type Theme = "system" | "light" | "dark";
export type Mode = "simple" | "advanced";

/** Einstellungen laut plan.md „Was gespeichert wird“. Speichern und Autosave folgen in P3. */
export interface SettingsState {
  theme: Theme;
  mode: Mode;
  /** Schritte pro Sekunde der Simulation. */
  simSpeed: number;
  pinnedPanels: string[];
  reduceMotion: boolean;
  tutorialProgress: number;
  solvedChallenges: string[];
  saveSettingsWithFile: boolean;
  set: (patch: Partial<Omit<SettingsState, "set">>) => void;
}

export const useSettings = create<SettingsState>((set) => ({
  theme: "system",
  mode: "simple",
  simSpeed: 1,
  pinnedPanels: [],
  reduceMotion: false,
  tutorialProgress: 0,
  solvedChallenges: [],
  saveSettingsWithFile: false,
  set,
}));
