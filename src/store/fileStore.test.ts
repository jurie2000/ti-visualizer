import { parse } from "../persistence";
import {
  emptyTopology,
  saveToFile,
  suggestFileName,
  useCatalog,
  useFile,
  useSettings,
  useTopology,
} from "./index";

const w = window as unknown as Record<string, unknown>;

function mockHandle(name = "a.tiv.json") {
  const writes: string[] = [];
  const handle = {
    name,
    createWritable: () =>
      Promise.resolve({
        write: (d: string) => {
          writes.push(d);
          return Promise.resolve();
        },
        close: () => Promise.resolve(),
      }),
  };
  return { handle, writes };
}

beforeEach(() => {
  useTopology.getState().reset(emptyTopology());
  useTopology.getState().addNode("switch", { x: 0, y: 0 });
  useFile.getState().markSaved(emptyTopology(), null);
  useSettings.getState().set({ saveSettingsWithFile: false });
});
afterEach(() => {
  delete w["showSaveFilePicker"];
  vi.restoreAllMocks();
});

describe("saveToFile", () => {
  it("schreibt über den Dateidialog, merkt das Handle und überschreibt beim zweiten Mal ohne Dialog", async () => {
    const { handle, writes } = mockHandle();
    const picker = vi.fn(() => Promise.resolve(handle));
    w["showSaveFilePicker"] = picker;
    expect(await saveToFile()).toBe(true);
    expect(await saveToFile()).toBe(true);
    expect(picker).toHaveBeenCalledTimes(1);
    expect(writes).toHaveLength(2);
    const r = parse(writes[0] ?? "", useCatalog.getState().catalog);
    expect(r.ok && r.settings).toBeFalsy();
    expect(useFile.getState().fileName).toBe("a.tiv.json");
    expect(useFile.getState().baseline).toBe(useTopology.getState().topology);
  });

  it("nimmt die Einstellungen nur mit Häkchen mit", async () => {
    const { handle, writes } = mockHandle();
    w["showSaveFilePicker"] = () => Promise.resolve(handle);
    useSettings
      .getState()
      .set({ saveSettingsWithFile: true, mode: "advanced" });
    await saveToFile();
    const r = parse(writes[0] ?? "", useCatalog.getState().catalog);
    expect(r.ok && r.settings?.mode).toBe("erweitert");
  });

  it("meldet false bei Abbruch und lässt den Stand ungespeichert", async () => {
    w["showSaveFilePicker"] = () =>
      Promise.reject(new DOMException("x", "AbortError"));
    expect(await saveToFile()).toBe(false);
    expect(useFile.getState().fileName).toBeNull();
  });

  it("wirft bei echten Schreibfehlern", async () => {
    w["showSaveFilePicker"] = () => Promise.reject(new Error("kaputt"));
    await expect(saveToFile()).rejects.toThrow("kaputt");
  });

  it("lädt ohne File System Access API per Download herunter", async () => {
    URL.createObjectURL = vi.fn(() => "blob:x");
    URL.revokeObjectURL = vi.fn();
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    expect(await saveToFile()).toBe(true);
    expect(click).toHaveBeenCalledTimes(1);
    expect(useFile.getState().fileName).toBe("topologie.tiv.json");
  });
});

describe("suggestFileName", () => {
  it("bildet aus dem Namen einen Dateinamen mit .tiv.json", () => {
    expect(
      suggestFileName({ ...emptyTopology(), name: "Praxis Dr. Müller!" }),
    ).toBe("praxis-dr-müller.tiv.json");
  });
});
