import type { Settings } from "../schema";
import type { SettingsState } from "../store/settingsStore";

/** Die Werte des Settings-Stores ohne die Aktion `set`. */
export type StoredSettings = Omit<SettingsState, "set">;

const themeOut = { system: "system", light: "hell", dark: "dunkel" } as const;
const themeIn = { system: "system", hell: "light", dunkel: "dark" } as const;

/** Einstellungen des Stores im Format der Datei (Speichern mit Häkchen). */
export function toFileSettings(s: StoredSettings): Settings {
  return {
    theme: themeOut[s.theme],
    mode: s.mode === "advanced" ? "erweitert" : "einfach",
    simSpeed: Math.min(4, Math.max(0.25, s.simSpeed)),
    reducedMotion: s.reduceMotion,
    tutorialStep: s.tutorialProgress,
    solvedChallenges: s.solvedChallenges,
    pinnedPanels: s.pinnedPanels,
    saveSettings: s.saveSettingsWithFile,
  };
}

/** Einstellungen aus der Datei als Patch für `useSettings.set` (Öffnen nach Rückfrage). */
export function fromFileSettings(s: Settings): StoredSettings {
  return {
    theme: themeIn[s.theme],
    mode: s.mode === "erweitert" ? "advanced" : "simple",
    simSpeed: s.simSpeed,
    pinnedPanels: s.pinnedPanels,
    reduceMotion: s.reducedMotion,
    tutorialProgress: s.tutorialStep,
    solvedChallenges: s.solvedChallenges,
    saveSettingsWithFile: s.saveSettings,
  };
}
