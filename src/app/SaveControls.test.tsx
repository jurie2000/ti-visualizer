import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  emptyTopology,
  hasUnsaved,
  useCatalog,
  useFile,
  useSettings,
  useTopology,
  useUi,
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

describe("Speichern: Dialog und Schutz", () => {
  it("Status-Icon: gespeichert grün mit Haken, geändert rot mit Punkt, jeweils auch als Text", () => {
    ui();
    const knopf = screen.getByRole("button", { name: /^Speichern/ });
    expect(knopf).toHaveClass("is-saved");
    expect(knopf).toHaveAccessibleName("Speichern (gespeichert)");
    act(() => {
      useTopology.getState().addNode("switch", { x: 0, y: 0 });
    });
    expect(knopf).toHaveClass("is-open");
    expect(knopf).toHaveAccessibleName("Speichern (nicht gespeichert)");
    act(() => {
      useFile
        .getState()
        .markSaved(useTopology.getState().topology, "x.tiv.json");
    });
    expect(knopf).toHaveClass("is-saved");
  });

  it("meldet ein unverändertes Preset nicht, ein bearbeitetes schon", () => {
    const preset = useCatalog.getState().catalog.presets[0];
    if (!preset) throw new Error("kein Preset");
    useTopology.getState().replace(preset.topology);
    useFile.getState().markSaved(useTopology.getState().topology, null);
    expect(hasUnsaved()).toBe(false);
    useTopology.getState().addNode("switch", { x: 0, y: 0 });
    expect(hasUnsaved()).toBe(true);
    useTopology.getState().undo();
    expect(hasUnsaved()).toBe(false);
  });

  it("fragt beim Schließen nur bei ungespeichertem Stand nach", () => {
    ui();
    const frei = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(frei);
    expect(frei.defaultPrevented).toBe(false);
    act(() => {
      useTopology.getState().addNode("switch", { x: 0, y: 0 });
    });
    const offen = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(offen);
    expect(offen.defaultPrevented).toBe(true);
  });

  it("Strg+S und der Knopf öffnen den Speichern-Dialog", async () => {
    const user = userEvent.setup();
    ui();
    await user.keyboard("{Control>}s{/Control}");
    expect(useUi.getState().dialog).toBe("save");
    useUi.getState().openDialog(undefined);
    await user.click(screen.getByRole("button", { name: /^Speichern/ }));
    expect(useUi.getState().dialog).toBe("save");
  });

  it("meldet leere Fläche mit offener Datei als ungespeichert", () => {
    useTopology.getState().addNode("switch", { x: 0, y: 0 });
    useFile.getState().markSaved(useTopology.getState().topology, "a.tiv.json");
    useTopology.getState().removeNode("switch-1");
    expect(hasUnsaved()).toBe(true);
  });
});
