import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadCatalog } from "../schema";
import {
  emptyTopology,
  hasUnsaved,
  openDropped,
  openFile,
  serialize,
  toFileSettings,
  useCatalog,
  useFile,
  useOpen,
  useSettings,
  useTopology,
  useUi,
} from "../store";
import { ToastProvider } from "../ui/Toast";
import { ImportFindingsDialog } from "./ImportFindingsDialog";
import { OpenDialog } from "./OpenDialog";
import { UnsavedGuardDialog } from "./UnsavedGuardDialog";

const catalog = loadCatalog();
const praxis = catalog.presets.find((p) => p.id === "praxis")?.topology;
if (!praxis) throw new Error("Preset praxis fehlt");

const mount = () => {
  render(
    <ToastProvider>
      <OpenDialog />
      <UnsavedGuardDialog />
      <ImportFindingsDialog />
    </ToastProvider>,
  );
  act(() => {
    useUi.getState().openDialog("open");
  });
};
const fileOf = (text: string) =>
  new File([text], "meine.tiv.json", { type: "application/json" });
const upload = async (f: File) => {
  const input = document.querySelector<HTMLInputElement>("input[type=file]");
  if (!input) throw new Error("Dateifeld fehlt");
  await userEvent.upload(input, f);
};
/** Dateitext der Praxis, optional mit Einstellungen (Theme dunkel) und Zusatzfeld. */
const text = (withSettings: boolean, extra: Record<string, unknown> = {}) =>
  JSON.stringify({
    ...(JSON.parse(
      serialize(
        praxis,
        catalog,
        withSettings
          ? {
              settings: toFileSettings({
                ...useSettings.getState(),
                theme: "dark",
              }),
            }
          : {},
      ),
    ) as object),
    ...extra,
  });

beforeEach(() => {
  useCatalog.setState({ catalog });
  useTopology.getState().reset(emptyTopology());
  useFile.getState().markSaved(useTopology.getState().topology, null);
  useSettings.getState().set({ theme: "light" });
  useOpen.setState({
    pending: undefined,
    guard: undefined,
    findings: undefined,
  });
  useUi.getState().openDialog(undefined);
});

describe("Öffnen (T-303)", () => {
  it("fragt nach den Einstellungen, Standard nein: Topologie ja, Einstellungen bleiben", async () => {
    mount();
    await upload(fileOf(text(true)));
    expect(
      await screen.findByText(/Einstellungen aus der Datei übernehmen\?/),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: /^Nein/ })).toHaveFocus();
    await userEvent.click(screen.getByRole("button", { name: /^Nein/ }));
    expect(useTopology.getState().topology).toEqual(praxis);
    expect(useSettings.getState().theme).toBe("light");
    expect(useFile.getState().fileName).toBe("meine.tiv.json");
    expect(hasUnsaved()).toBe(false);
  });

  it("übernimmt die Einstellungen nur nach Zustimmung", async () => {
    mount();
    await upload(fileOf(text(true)));
    await userEvent.click(
      await screen.findByRole("button", { name: "Ja, übernehmen" }),
    );
    expect(useSettings.getState().theme).toBe("dark");
  });

  it("fragt ohne Einstellungen in der Datei nicht und öffnet gleich", async () => {
    mount();
    await upload(fileOf(text(false)));
    await waitFor(() => {
      expect(useTopology.getState().topology).toEqual(praxis);
    });
    expect(screen.queryByText(/übernehmen\?/)).toBeNull();
  });

  it("zeigt Importbefunde nach dem Öffnen", async () => {
    mount();
    await upload(fileOf(text(false, { unbekannt: 1 })));
    expect(await screen.findByText(/Beim Öffnen von meine/)).toBeVisible();
    expect(screen.getByRole("listitem")).toHaveTextContent(/unbekannt/i);
    await userEvent.click(screen.getByRole("button", { name: "Verstanden" }));
    expect(useOpen.getState().findings).toBeUndefined();
  });

  it("lehnt eine kaputte Datei mit Grund ab und lässt den Stand unberührt", async () => {
    mount();
    await upload(fileOf("{kaputt"));
    expect(await screen.findByRole("alert")).toBeVisible();
    expect(useTopology.getState().topology.nodes).toHaveLength(0);
  });

  it("Rückgängig bringt nach dem Öffnen den alten Stand zurück", async () => {
    useTopology.getState().addNode("switch", { x: 0, y: 0 });
    const alt = useTopology.getState().topology;
    useFile.getState().markSaved(alt, "alt.tiv.json");
    mount();
    await upload(fileOf(text(false)));
    await waitFor(() => {
      expect(useTopology.getState().topology).toEqual(praxis);
    });
    act(() => {
      useTopology.getState().undo();
    });
    expect(useTopology.getState().topology).toBe(alt);
  });

  it("bietet bei ungespeichertem Stand Speichern an; Abbrechen ersetzt nichts, Verwerfen ersetzt und bleibt rückgängig", async () => {
    useTopology.getState().addNode("switch", { x: 0, y: 0 });
    const alt = useTopology.getState().topology;
    mount();
    await upload(fileOf(text(false)));
    expect(await screen.findByText(/erst speichern\?/)).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Abbrechen" }));
    expect(useTopology.getState().topology).toBe(alt);

    act(() => {
      useUi.getState().openDialog("open");
    });
    await upload(fileOf(text(false)));
    await userEvent.click(
      await screen.findByRole("button", { name: "Verwerfen" }),
    );
    expect(useTopology.getState().topology).toEqual(praxis);
    act(() => {
      useTopology.getState().undo();
    });
    expect(useTopology.getState().topology).toBe(alt);
  });

  it("Preset öffnen ist keine eigene Datei", async () => {
    useFile.getState().markSaved(useTopology.getState().topology, "x.tiv.json");
    mount();
    await userEvent.click(screen.getByRole("button", { name: praxis.name }));
    expect(useTopology.getState().topology).toEqual(praxis);
    expect(useFile.getState().fileName).toBeNull();
  });

  it("lehnt zu große Dateien vor dem Lesen ab", async () => {
    const big = new File(["x"], "gross.tiv.json");
    Object.defineProperty(big, "size", { value: 2_000_000 });
    expect(await openFile(big)).toMatch(/1 MB/);
    expect(useTopology.getState().topology.nodes).toHaveLength(0);
  });

  describe("File System Access API", () => {
    afterEach(() => {
      Reflect.deleteProperty(window, "showOpenFilePicker");
    });

    it("öffnet über den Dateidialog und merkt sich das Handle für Strg+S", async () => {
      const file = fileOf(text(false));
      const handle = { name: file.name, getFile: () => Promise.resolve(file) };
      Object.assign(window, {
        showOpenFilePicker: vi.fn(() => Promise.resolve([handle])),
      });
      mount();
      await userEvent.click(
        screen.getByRole("button", { name: /Datei wählen/ }),
      );
      await waitFor(() => {
        expect(useTopology.getState().topology).toEqual(praxis);
      });
      expect(useFile.getState().handle).toBe(handle);
    });

    it("Abbrechen im Dateidialog ändert nichts", async () => {
      Object.assign(window, {
        showOpenFilePicker: vi.fn(() =>
          Promise.reject(new DOMException("x", "AbortError")),
        ),
      });
      mount();
      await userEvent.click(
        screen.getByRole("button", { name: /Datei wählen/ }),
      );
      expect(useTopology.getState().topology.nodes).toHaveLength(0);
      expect(screen.queryByRole("alert")).toBeNull();
    });

    it("Drop übernimmt das Handle des Eintrags", async () => {
      const file = fileOf(text(false));
      const handle = {
        kind: "file",
        name: file.name,
        getFile: () => Promise.resolve(file),
      };
      await openDropped(
        { getAsFileSystemHandle: () => Promise.resolve(handle) } as never,
        file,
      );
      expect(useFile.getState().handle).toBe(handle);
    });
  });
});
