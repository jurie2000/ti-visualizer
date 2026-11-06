import { create } from "zustand";
import { serialize, toFileSettings } from "../persistence";
import type { Topology } from "../schema";
import { useCatalog } from "./catalogStore";
import { useSettings } from "./settingsStore";
import { useTopology } from "./topologyStore";

/** Der benutzte Ausschnitt der File System Access API (nicht in der DOM-Typbibliothek). */
export interface FileSystemFileHandleLike {
  name: string;
  createWritable: () => Promise<{
    write: (data: string) => Promise<void>;
    close: () => Promise<void>;
  }>;
}

type SavePicker = (options: {
  suggestedName: string;
  types: { description: string; accept: Record<string, string[]> }[];
}) => Promise<FileSystemFileHandleLike>;

export const FILE_EXTENSION = ".tiv.json";

/**
 * Dateistand der aktuellen Topologie (T-302). Vertrag für T-303 (Öffnen):
 * nach dem Laden `markSaved(topology, fileName, handle?)` aufrufen, vor dem
 * Ersetzen bei `hasUnsaved()` das Speichern per `saveToFile()` anbieten.
 */
interface FileState {
  /** Name der zuletzt gespeicherten oder geöffneten Datei, sonst `null`. */
  fileName: string | null;
  /** File-System-Access-Handle (nur Chrome/Edge): Strg+S überschreibt dann ohne Dialog. */
  handle: FileSystemFileHandleLike | null;
  /** Topologie-Objekt, das dem Stand der Datei entspricht (Referenzvergleich). */
  baseline: Topology;
  /**
   * Setzt den Stand „aus Datei, unverändert“. Nach dem Öffnen mit genau dem
   * Topologie-Objekt aufrufen, das zuvor per `useTopology.replace/reset`
   * eingesetzt wurde (dasselbe Objekt, keine Kopie).
   */
  markSaved: (
    topology: Topology,
    fileName: string | null,
    handle?: FileSystemFileHandleLike | null,
  ) => void;
}

export const useFile = create<FileState>((set) => ({
  fileName: null,
  handle: null,
  baseline: useTopology.getState().topology,
  markSaved: (topology, fileName, handle = null) => {
    set({ baseline: topology, fileName, handle });
  },
}));

/**
 * Gilt der aktuelle Stand als nicht gespeichert? Nein bei leerer Fläche (kein
 * Verlust), bei unverändertem Preset (jederzeit neu wählbar) und wenn er dem
 * Stand der Datei entspricht (auch nach Rückgängig bis dorthin).
 */
export function hasUnsaved(): boolean {
  const { topology } = useTopology.getState();
  if (topology === useFile.getState().baseline) return false;
  if (topology.nodes.length === 0 && topology.zones.length === 0) return false;
  return !useCatalog
    .getState()
    .catalog.presets.some((p) => p.topology === topology);
}

/** Reaktive Fassung von `hasUnsaved` für Komponenten. */
export function useHasUnsaved(): boolean {
  useTopology((s) => s.topology);
  useFile((s) => s.baseline);
  return hasUnsaved();
}

const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9äöüß]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

/** Dateiname-Vorschlag aus dem Topologienamen, immer mit `.tiv.json`. */
export const suggestFileName = (t: Topology) =>
  `${slug(t.name) || "topologie"}${FILE_EXTENSION}`;

function download(text: string, fileName: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}

/**
 * Speichert die aktuelle Topologie als `.tiv.json`. Chrome/Edge: Dateidialog
 * beim ersten Mal, danach überschreibt es dieselbe Datei. Firefox/Safari:
 * Download. Die Einstellungen kommen nur mit, wenn
 * `useSettings.saveSettingsWithFile` gesetzt ist.
 *
 * @returns `true` = gespeichert, `false` = Benutzer hat den Dialog abgebrochen.
 * @throws bei echten Schreibfehlern (der Aufrufer zeigt eine Meldung).
 */
export async function saveToFile(): Promise<boolean> {
  const { topology } = useTopology.getState();
  const settings = useSettings.getState();
  const text = serialize(topology, useCatalog.getState().catalog, {
    ...(settings.saveSettingsWithFile && {
      settings: toFileSettings(settings),
    }),
  });
  const picker = (window as { showSaveFilePicker?: SavePicker })
    .showSaveFilePicker;
  if (!picker) {
    const name = suggestFileName(topology);
    download(text, name);
    useFile.getState().markSaved(topology, name);
    return true;
  }
  try {
    const handle =
      useFile.getState().handle ??
      (await picker.call(window, {
        suggestedName: suggestFileName(topology),
        types: [
          {
            description: "TI-Visualizer-Topologie",
            accept: { "application/json": [FILE_EXTENSION, ".json"] },
          },
        ],
      }));
    const w = await handle.createWritable();
    await w.write(text);
    await w.close();
    useFile.getState().markSaved(topology, handle.name, handle);
    return true;
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return false;
    throw e;
  }
}

// Wahl „Einstellungen mitspeichern“ merken (nur dieses Flag).
const KEY = "tiv.saveSettingsWithFile";
try {
  if (localStorage.getItem(KEY) === "1")
    useSettings.getState().set({ saveSettingsWithFile: true });
} catch {
  /* Speicher gesperrt: Standard bleibt */
}
useSettings.subscribe((s, prev) => {
  if (s.saveSettingsWithFile === prev.saveSettingsWithFile) return;
  try {
    localStorage.setItem(KEY, s.saveSettingsWithFile ? "1" : "0");
  } catch {
    /* ignorieren */
  }
});
