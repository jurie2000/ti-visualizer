import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  emptyTopology,
  hasUnsaved,
  useCatalog,
  useFile,
  useSettings,
  useTopology,
} from "../store";
import { ToastProvider } from "../ui/Toast";
import { SaveControls } from "./SaveControls";

const ui = () =>
  render(
    <ToastProvider>
      <SaveControls />
    </ToastProvider>,
  );

beforeEach(() => {
  localStorage.clear();
  useTopology.getState().reset(emptyTopology());
  useFile.getState().markSaved(useTopology.getState().topology, null);
  useSettings.getState().set({ saveSettingsWithFile: false });
});

describe("Speichern: Häkchen und Hinweis", () => {
  it("Häkchen ist standardmäßig aus, schaltet die Einstellung und wird gemerkt", async () => {
    const user = userEvent.setup();
    ui();
    const box = screen.getByRole("checkbox", {
      name: "Einstellungen mitspeichern",
    });
    expect(box).not.toBeChecked();
    await user.click(box);
    expect(box).toBeChecked();
    expect(useSettings.getState().saveSettingsWithFile).toBe(true);
    expect(localStorage.getItem("tiv.saveSettingsWithFile")).toBe("1");
  });

  it("meldet leere Fläche nicht, geänderten Stand schon, gespeicherten nicht mehr", () => {
    ui();
    expect(hasUnsaved()).toBe(false);
    expect(screen.queryByText("Nicht als Datei gespeichert")).toBeNull();
    act(() => {
      useTopology.getState().addNode("switch", { x: 0, y: 0 });
    });
    expect(screen.getByText("Nicht als Datei gespeichert")).toBeInTheDocument();
    act(() => {
      useFile
        .getState()
        .markSaved(useTopology.getState().topology, "x.tiv.json");
    });
    expect(screen.queryByText("Nicht als Datei gespeichert")).toBeNull();
    expect(screen.getByText("Gespeichert: x.tiv.json")).toBeInTheDocument();
  });

  it("meldet ein unverändertes Preset nicht, ein bearbeitetes schon", () => {
    const preset = useCatalog.getState().catalog.presets[0];
    if (!preset) throw new Error("kein Preset");
    useTopology.getState().replace(preset.topology);
    expect(hasUnsaved()).toBe(false);
    useTopology.getState().addNode("switch", { x: 0, y: 0 });
    expect(hasUnsaved()).toBe(true);
    useTopology.getState().undo();
    expect(hasUnsaved()).toBe(false);
  });
});
