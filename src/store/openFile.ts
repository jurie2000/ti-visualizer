import { create } from "zustand";
import {
  fromFileSettings,
  MAX_FILE_BYTES,
  MESSAGES,
  parse,
  type Finding,
} from "../persistence";
import type { Settings, Topology } from "../schema";
import { useCatalog } from "./catalogStore";
import {
  FILE_EXTENSION,
  hasUnsaved,
  saveToFile,
  useFile,
  type FileSystemFileHandleLike,
} from "./fileStore";
import { useSettings } from "./settingsStore";
import { useTopology } from "./topologyStore";
import { useUi } from "./uiStore";

export type { Finding };
// Für Tests der Oberfläche, die Dateitext brauchen (Oberfläche importiert persistence/ nicht direkt)
export { serialize, toFileSettings } from "../persistence";

/** Datei-Handle der File System Access API, wie ihn Öffnen und Drag & Drop liefern. */
export type OpenHandle = FileSystemFileHandleLike & {
  getFile: () => Promise<File>;
};

/** Eine geprüfte, noch nicht eingesetzte Datei. */
interface Pending {
  topology: Topology;
  settings?: Settings;
  findings: Finding[];
  fileName: string;
  handle: OpenHandle | null;
}

interface OpenState {
  /** Geprüfte Datei, bei der noch die Frage nach den Einstellungen offen ist. */
  pending: Pending | undefined;
  /** Wartet auf die Entscheidung „Speichern / Verwerfen / Abbrechen“. */
  guard: (() => void) | undefined;
  /** Befunde der zuletzt geöffneten Datei, bis der Benutzer sie quittiert. */
  findings: { fileName: string; list: Finding[] } | undefined;
  /** Zählt jedes Ersetzen durch Datei oder Preset (die App wechselt dann zur Arbeitsfläche). */
  opened: number;
}

export const useOpen = create<OpenState>(() => ({
  pending: undefined,
  guard: undefined,
  findings: undefined,
  opened: 0,
}));

/**
 * Führt `action` aus. Bei ungespeichertem Stand fragt zuerst der
 * `UnsavedGuardDialog` (Speichern, Verwerfen, Abbrechen).
 */
export function guardReplace(action: () => void) {
  if (hasUnsaved()) useOpen.setState({ guard: action });
  else action();
}

/** Antwort des Schutzdialogs. Speichern, das abbricht, ersetzt nichts. */
export async function resolveGuard(choice: "save" | "discard" | "cancel") {
  const action = useOpen.getState().guard;
  useOpen.setState({ guard: undefined });
  if (!action || choice === "cancel") return;
  if (choice === "save" && !(await saveToFile())) return;
  action();
}

/** Ersetzt die Topologie als ein Rückgängig-Schritt und setzt den Dateibezug. */
function install(
  topology: Topology,
  fileName: string | null,
  handle: OpenHandle | null,
) {
  useTopology.getState().replace(topology);
  // Dasselbe Objekt übergeben: der Vergleich „ungespeichert“ läuft per Referenz
  useFile
    .getState()
    .markSaved(useTopology.getState().topology, fileName, handle);
  useOpen.setState((s) => ({ opened: s.opened + 1 }));
}

/** Preset oder leerer Start: kein Dateibezug, nie als eigene Datei gekennzeichnet. */
export function openTopology(topology: Topology) {
  guardReplace(() => {
    install(topology, null, null);
  });
}

/** Antwort auf „Einstellungen aus der Datei übernehmen?“ (oder direkt ohne Frage). */
export function confirmOpen(
  withSettings: boolean,
  pending = useOpen.getState().pending,
) {
  useOpen.setState({ pending: undefined });
  useUi.getState().openDialog(undefined);
  if (!pending) return;
  guardReplace(() => {
    install(pending.topology, pending.fileName, pending.handle);
    if (withSettings && pending.settings)
      useSettings.getState().set(fromFileSettings(pending.settings));
    if (pending.findings.length > 0)
      useOpen.setState({
        findings: { fileName: pending.fileName, list: pending.findings },
      });
  });
}

/**
 * Liest und prüft eine Datei. Gibt den Grund zurück, wenn sie nicht
 * geöffnet werden kann; sonst laufen Rückfrage und Schutz an.
 */
export async function openFile(
  file: File,
  handle: OpenHandle | null = null,
): Promise<string | undefined> {
  if (file.size > MAX_FILE_BYTES) return MESSAGES.tooBig;
  let text: string;
  try {
    text = await file.text();
  } catch {
    return "Die Datei konnte nicht gelesen werden.";
  }
  const r = parse(text, useCatalog.getState().catalog);
  if (!r.ok) return r.reason;
  const pending: Pending = {
    topology: r.topology,
    findings: r.findings,
    fileName: file.name,
    handle,
    ...(r.settings && { settings: r.settings }),
  };
  if (pending.settings) {
    // Erst fragen, ob die Einstellungen mitkommen (Standard: nein)
    useOpen.setState({ pending });
    useUi.getState().openDialog("open");
  } else confirmOpen(false, pending);
  return undefined;
}

type OpenPicker = (options: {
  multiple: false;
  types: { description: string; accept: Record<string, string[]> }[];
}) => Promise<OpenHandle[]>;

/**
 * Dateiauswahl über die File System Access API (Chrome/Edge), damit Strg+S
 * zurückschreibt. Sonst `"nicht-verfuegbar"`: der Aufrufer nimmt `<input type=file>`.
 */
export async function pickFileWithHandle(): Promise<
  { file: File; handle: OpenHandle } | "abbruch" | "nicht-verfuegbar"
> {
  const picker = (window as { showOpenFilePicker?: OpenPicker })
    .showOpenFilePicker;
  if (!picker) return "nicht-verfuegbar";
  try {
    const [handle] = await picker.call(window, {
      multiple: false,
      types: [
        {
          description: "TI-Visualizer-Topologie",
          accept: { "application/json": [FILE_EXTENSION, ".json"] },
        },
      ],
    });
    return handle ? { file: await handle.getFile(), handle } : "abbruch";
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return "abbruch";
    throw e;
  }
}

/** Datei von der Canvas: Handle (nur Chrome/Edge) mitnehmen, damit Strg+S zurückschreibt. */
export async function openDropped(
  item: DataTransferItem | undefined,
  file: File,
): Promise<string | undefined> {
  let handle: OpenHandle | null = null;
  try {
    const h = await (
      item as { getAsFileSystemHandle?: () => Promise<unknown> } | undefined
    )?.getAsFileSystemHandle?.();
    if (h && (h as { kind?: string }).kind === "file") handle = h as OpenHandle;
  } catch {
    /* ohne Handle: Strg+S lädt dann herunter */
  }
  return openFile(file, handle);
}
