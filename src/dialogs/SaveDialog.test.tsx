import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { emptyTopology, useSettings, useTopology, useUi } from "../store";
import { ToastProvider } from "../ui/Toast";
import { SaveDialog } from "./SaveDialog";

const ui = () =>
  render(
    <ToastProvider>
      <SaveDialog />
    </ToastProvider>,
  );

beforeEach(() => {
  localStorage.clear();
  useTopology.getState().reset(emptyTopology());
  useSettings.getState().set({ saveSettingsWithFile: false });
  useUi.getState().openDialog("save");
});

describe("Speichern-Dialog", () => {
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

  it("speichert, schließt und meldet Fehler als Meldung", async () => {
    const user = userEvent.setup();
    URL.createObjectURL = vi.fn(() => "blob:x");
    URL.revokeObjectURL = vi.fn();
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    ui();
    act(() => {
      useTopology.getState().addNode("switch", { x: 0, y: 0 });
    });
    await user.click(screen.getByRole("button", { name: "Speichern" }));
    expect(click).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Datei gespeichert.")).toBeInTheDocument();
    expect(useUi.getState().dialog).toBeUndefined();

    act(() => {
      useUi.getState().openDialog("save");
    });
    click.mockImplementation(() => {
      throw new Error("kaputt");
    });
    await user.click(screen.getByRole("button", { name: "Speichern" }));
    expect(
      await screen.findByText("Speichern fehlgeschlagen."),
    ).toBeInTheDocument();
    expect(useUi.getState().dialog).toBe("save");
    vi.restoreAllMocks();
  });

  it("Abbrechen schließt ohne zu speichern", async () => {
    const user = userEvent.setup();
    ui();
    await user.click(screen.getByRole("button", { name: "Abbrechen" }));
    expect(useUi.getState().dialog).toBeUndefined();
  });
});
