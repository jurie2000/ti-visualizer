import { del, get, set } from "idb-keyval";
import { create } from "zustand";
import {
  fromFileSettings,
  parse,
  serialize,
  toFileSettings,
  type Finding,
} from "../persistence";
import type { Topology } from "../schema";
import { useCatalog } from "./catalogStore";
import { useOpen } from "./openFile";
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
    const r =
      text === undefined
        ? undefined
        : typeof text === "string"
          ? parse(text, useCatalog.getState().catalog)
          : ({
              ok: false,
              reason: "Der gesicherte Stand hat ein falsches Format.",
            } as const);
    if (r && !r.ok) {
      useAutosave.setState({ start: { kind: "abgelehnt", reason: r.reason } });
      await del(KEY_STAND);
    } else if (r?.topology.nodes.length) {
      // Zuerst die Rückfrage setzen: Sie hält das Sichern an, bis entschieden ist.
      useAutosave.setState({
        start: {
          kind: "wiederherstellen",
          topology: r.topology,
          findings: r.findings,
        },
      });
    } else if ((await get<unknown>(KEY_HINWEIS)) === undefined) {
      useAutosave.setState({ start: { kind: "hinweis" } });
    }
    // Einstellungen gelten immer wieder, auch bei „Verwerfen“: Der Autosave ist ihre einzige Ablage.
    if (r?.ok && r.settings)
      useSettings.getState().set(fromFileSettings(r.settings));
  } catch (e) {
    log("Lesen fehlgeschlagen", e);
  }
  return watch();
}

/**
 * Übernimmt den gefundenen Stand als ein Rückgängig-Schritt (`replace`, wie
 * Öffnen und Preset): Hat der Benutzer vor der Antwort schon begonnen, bleibt
 * seine Arbeit erreichbar.
 */
export function restoreAutosave(): void {
  const s = useAutosave.getState().start;
  if (s?.kind !== "wiederherstellen") return;
  useTopology.getState().replace(s.topology);
  // Importbefunde gehören zur ersetzten Topologie (Sicherheitsprüfung, T-506)
  useOpen.setState({ imported: undefined });
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
