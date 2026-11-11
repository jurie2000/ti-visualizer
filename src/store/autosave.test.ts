import "fake-indexeddb/auto";
import { clear, get, set } from "idb-keyval";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { serialize } from "../persistence";
import { loadCatalog } from "../schema";
import {
  dismissAutosave,
  initAutosave,
  restoreAutosave,
  saveNow,
  useAutosave,
} from "./autosave";
import { useOpen } from "./openFile";
import { emptyTopology, useTopology } from "./topologyStore";
import { useSettings } from "./settingsStore";

const catalog = loadCatalog();
const praxis = (() => {
  const p = catalog.presets.find((x) => x.id === "praxis");
  if (!p) throw new Error("Preset praxis fehlt");
  return p.topology;
})();

let off: (() => void) | undefined;
const start = async () => {
  off = await initAutosave();
};

beforeEach(async () => {
  await clear();
  useAutosave.setState({ start: undefined, failed: false });
  useTopology.getState().reset(emptyTopology());
  useSettings.getState().set({ mode: "simple", theme: "system" });
});
afterEach(() => {
  off?.();
  off = undefined;
  vi.restoreAllMocks();
});

describe("Autosave (T-304)", () => {
  it("sichert genau einen Stand und stellt ihn wieder her", async () => {
    useTopology.getState().reset(praxis);
    useSettings.getState().set({ mode: "advanced", theme: "dark" });
    await saveNow();
    await saveNow(); // zweites Sichern überschreibt, keine Liste

    useTopology.getState().reset(emptyTopology());
    useSettings.getState().set({ mode: "simple", theme: "system" });
    await start();

    expect(useAutosave.getState().start?.kind).toBe("wiederherstellen");
    useOpen.setState({ imported: { fileName: "alt.json", list: [] } });
    restoreAutosave();
    expect(useOpen.getState().imported).toBeUndefined();
    expect(useTopology.getState().topology).toEqual(praxis);
    expect(useTopology.getState().past).toHaveLength(1); // Rückgängig möglich
    expect(useSettings.getState().mode).toBe("advanced");
    expect(useSettings.getState().theme).toBe("dark");
    expect(useAutosave.getState().start).toBeUndefined();
  });

  it("übernimmt die Einstellungen auch bei Verwerfen und fragt bei leerer Topologie nicht", async () => {
    useSettings.getState().set({ mode: "advanced", theme: "dark" });
    await saveNow(); // leere Topologie, nur Einstellungen
    useSettings.getState().set({ mode: "simple", theme: "system" });
    await start();
    expect(useAutosave.getState().start?.kind).toBe("hinweis");
    expect(useSettings.getState().theme).toBe("dark");

    off?.();
    useTopology.getState().reset(praxis);
    await saveNow();
    useSettings.getState().set({ theme: "light" });
    await saveNow();
    useSettings.getState().set({ theme: "system" });
    useTopology.getState().reset(emptyTopology());
    await start();
    expect(useAutosave.getState().start?.kind).toBe("wiederherstellen");
    await dismissAutosave();
    expect(useSettings.getState().theme).toBe("light");
    expect(useTopology.getState().topology).toEqual(emptyTopology());
  });

  it("sichert entprellt nach einer Änderung", async () => {
    await start(); // erster Start: Hinweis, kein Stand
    await dismissAutosave();
    useTopology.getState().addNode("kt", { x: 1, y: 2 });
    useTopology.getState().addNode("kt", { x: 3, y: 4 });
    expect(await get("autosave")).toBeUndefined();
    await vi.waitFor(
      async () => {
        expect(await get("autosave")).toContain('"x": 3');
      },
      { timeout: 3000 },
    );
  });

  it("überschreibt den alten Stand nicht, solange die Rückfrage offen ist", async () => {
    useTopology.getState().reset(praxis);
    await saveNow();
    const before = await get<string>("autosave");
    useTopology.getState().reset(emptyTopology());
    await start();
    useTopology.getState().addNode("kt", { x: 0, y: 0 });
    await new Promise((r) => setTimeout(r, 800));
    expect(await get("autosave")).toBe(before);
  });

  it("zeigt den Hinweis auf die Grenzen nur beim ersten Start", async () => {
    await start();
    expect(useAutosave.getState().start?.kind).toBe("hinweis");
    await dismissAutosave();
    off?.();
    await start();
    expect(useAutosave.getState().start).toBeUndefined();
  });

  it.each([
    ["kein JSON", "{kaputt"],
    ["fremde Datei", JSON.stringify({ hallo: 1 })],
    ["kein Text", 42],
  ])(
    "lehnt einen kaputten Autosave ab (%s), ohne Absturz",
    async (_name, wert) => {
      await set("autosave", wert);
      await start();
      const s = useAutosave.getState().start;
      expect(s?.kind).toBe("abgelehnt");
      if (s?.kind === "abgelehnt") expect(s.reason).not.toBe("");
      expect(useTopology.getState().topology).toEqual(emptyTopology());
      expect(await get("autosave")).toBeUndefined();
    },
  );

  it("zeigt Importbefunde eines teilweise gültigen Stands", async () => {
    const data = JSON.parse(serialize(praxis, catalog)) as {
      topology: { nodes: unknown[] };
    };
    data.topology.nodes.push({
      id: "x",
      type: "gibtEsNicht",
      fault: false,
      position: { x: 0, y: 0 },
    });
    await set("autosave", JSON.stringify(data));
    await start();
    const s = useAutosave.getState().start;
    expect(s?.kind).toBe("wiederherstellen");
    if (s?.kind === "wiederherstellen")
      expect(s.findings.some((f) => f.code === "unbekannterTyp")).toBe(true);
  });

  it("stürzt bei Fehlern von IndexedDB nicht ab und meldet sie", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(() => {
      throw new DOMException("voll", "QuotaExceededError");
    });
    await expect(saveNow()).resolves.toBeUndefined();
    expect(useAutosave.getState().failed).toBe(true);
  });
});
