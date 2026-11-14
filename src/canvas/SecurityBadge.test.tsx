import { ReactFlowProvider } from "@xyflow/react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { loadCatalog } from "../schema";
import { emptyTopology, useSettings, useTopology, useUi } from "../store";
import { SecurityBadge } from "./SecurityBadge";

const ui = () =>
  render(
    <ReactFlowProvider>
      <SecurityBadge />
    </ReactFlowProvider>,
  );

beforeEach(() => {
  useSettings.setState({ mode: "advanced" });
  useUi.getState().openDialog(undefined);
});

describe("Zugang zur Sicherheitsprüfung im Canvas", () => {
  it("fehlt ohne Befunde", () => {
    useTopology.getState().reset(emptyTopology());
    ui();
    expect(
      screen.queryByRole("button", { name: /Sicherheitsprüfung/ }),
    ).toBeNull();
  });

  it("erscheint mit Befunden und öffnet den Dialog", async () => {
    const user = userEvent.setup();
    const preset = loadCatalog().presets.find((p) => p.id === "praxis");
    if (!preset) throw new Error("Preset praxis fehlt");
    useTopology.getState().reset(preset.topology);
    useTopology.getState().addNode("switch", { x: 0, y: 0 });
    ui();
    await user.click(
      screen.getByRole("button", { name: /Sicherheitsprüfung: \d+ Befund/ }),
    );
    expect(useUi.getState().dialog).toBe("security");
  });
});
