import { del, get, set } from "idb-keyval";
import { create } from "zustand";
import {
  fromFileSettings,
  parse,
  serialize,
  toFileSettings,
  type Finding,
} from "../persistence";
import type { Settings, Topology } from "../schema";
import { useCatalog } from "./catalogStore";
import { useSettings } from "./settingsStore";
import { useTopology } from "./topologyStore";

/** Genau ein Stand (plan.md, D34): ein fester Schlüssel, keine Liste. */
const KEY_STAND = "autosave";
/** Merkt, dass der Hinweis auf die Grenzen schon gezeigt wurde. */
const KEY_HINWEIS = "autosave-hinweis";
export const DEBOUNCE_MS = 500;

/** Was der Start gefunden hat; die Oberfläche fragt entsprechend nach. */
export type AutosaveStart =
  | {
      kind: "wiederherstellen";
      topology: Topology;
      settings?: Settings;
      findings: Finding[];
    }
  /** Der Autosave war kaputt und wurde wie eine fremde Datei abgelehnt. */
  | { kind: "abgelehnt"; reason: string }
  /** Erster Start: Hinweis auf die Grenzen des Autosave. */
  | { kind: "hinweis" };

interface AutosaveState {
  /** Offene Rückfrage, `undefined` wenn nichts zu fragen ist. */
  start: AutosaveStart | undefined;
  /** Sichern ist fehlgeschlagen (Quota, privater Modus); die Oberfläche weist einmal darauf hin. */
  failed: boolean;
}

export const useAutosave = create<AutosaveState>(() => ({
  start: undefined,
  failed: false,
}));

const log = (...args: unknown[]) => {
  console.warn("Autosave:", ...args);
};

/** Sichert den aktuellen Stand als `.tiv.json`-Text. Wirft nie. */
export async function saveNow(): Promise<void> {
  try {
    const text = serialize(
      useTopology.getState().topology,
      useCatalog.getState().catalog,
      { settings: toFileSettings(useSettings.getState()) },
    );
    await set(KEY_STAND, text);
  } catch (e) {
    log("Sichern fehlgeschlagen", e);
    useAutosave.setState({ failed: true });
  }
}

let timer: ReturnType<typeof setTimeout> | undefined;
let stop: (() => void) | undefined;

/** Solange die Rückfrage offen ist, bleibt der alte Stand unberührt. */
const blocked = () => useAutosave.getState().start?.kind === "wiederherstellen";

function schedule() {
  if (blocked()) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    timer = undefined;
    void saveNow();
  }, DEBOUNCE_MS);
}

/** Beim Verbergen des Tabs sofort sichern, falls noch etwas aussteht. */
function flush() {
  if (timer === undefined || document.visibilityState !== "hidden") return;
  clearTimeout(timer);
  timer = undefined;
  void saveNow();
}

/** Beobachtet beide Stores und sichert entprellt nach jeder Änderung. */
function watch() {
  stop?.();
  const unsubs = [
    useTopology.subscribe(schedule),
    useSettings.subscribe(schedule),
  ];
  document.addEventListener("visibilitychange", flush);
  stop = () => {
    unsubs.forEach((u) => {
      u();
    });
    document.removeEventListener("visibilitychange", flush);
    clearTimeout(timer);
    timer = undefined;
  };
  return stop;
}

/**
 * Programmstart: liest den letzten Stand und prüft ihn wie eine fremde Datei
 * (`parse`). Dann beginnt das Sichern. Wirft nie; ohne IndexedDB läuft die App
 * weiter. Gibt die Abmeldefunktion zurück.
 */
export async function initAutosave(): Promise<() => void> {
  try {
    const text = await get<unknown>(KEY_STAND);
    if (text !== undefined) {
      const r =
        typeof text === "string"
          ? parse(text, useCatalog.getState().catalog)
          : ({
              ok: false,
              reason: "Der gesicherte Stand hat ein falsches Format.",
            } as const);
      if (r.ok) {
        const { topology, settings, findings } = r;
        useAutosave.setState({
          start: {
            kind: "wiederherstellen",
            topology,
            ...(settings && { settings }),
            findings,
          },
        });
      } else {
        useAutosave.setState({
          start: { kind: "abgelehnt", reason: r.reason },
        });
        await del(KEY_STAND);
      }
    } else if ((await get<unknown>(KEY_HINWEIS)) === undefined) {
      useAutosave.setState({ start: { kind: "hinweis" } });
    }
  } catch (e) {
    log("Lesen fehlgeschlagen", e);
  }
  return watch();
}

/**
 * Übernimmt den gefundenen Stand. `reset` statt `replace`: Es ist der
 * Programmstart, es gibt keinen Stand, zu dem „Rückgängig“ zurückkehren könnte.
 */
export function restoreAutosave(): void {
  const s = useAutosave.getState().start;
  if (s?.kind !== "wiederherstellen") return;
  useTopology.getState().reset(s.topology);
  if (s.settings) useSettings.getState().set(fromFileSettings(s.settings));
  useAutosave.setState({ start: undefined });
}

/** Schließt die Rückfrage ohne Übernahme; der nächste Stand überschreibt den alten. */
export async function dismissAutosave(): Promise<void> {
  const s = useAutosave.getState().start;
  useAutosave.setState({ start: undefined });
  if (s?.kind === "hinweis") {
    try {
      await set(KEY_HINWEIS, true);
    } catch (e) {
      log("Hinweis nicht gemerkt", e);
    }
  }
}
