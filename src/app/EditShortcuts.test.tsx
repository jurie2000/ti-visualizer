import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IDLE } from "../engine/simulation";
import { emptyTopology, useSim, useTopology, useUi } from "../store";
import { ToastProvider } from "../ui/Toast";
import { EditShortcuts } from "./EditShortcuts";

const t = () => useTopology.getState();
const ui = () =>
  render(
    <ToastProvider>
      <EditShortcuts />
      <input aria-label="Feld" />
      <section className="tiv-canvas">
        <button>Fläche</button>
      </section>
    </ToastProvider>,
  );
const add = (type: string) => {
  const r = t().addNode(type, { x: 0, y: 0 });
  if (!r.ok || !r.id) throw new Error("addNode");
  return r.id;
};

beforeEach(() => {
  t().reset(emptyTopology());
  useUi.getState().select(undefined);
  useSim.setState({ sim: IDLE });
});

describe("Editor-Hilfen: Kürzel (FR-16, D10, T-508)", () => {
  it("FR-16 Entf löscht das gewählte Gerät samt Kanten", async () => {
    const user = userEvent.setup();
    ui();
    const pc = add("pc");
    const sw = add("switch");
    t().connect(pc, sw);
    act(() => {
      useUi.getState().select({ kind: "node", id: pc });
    });
    await user.click(screen.getByRole("button", { name: "Fläche" }));
    await user.keyboard("{Delete}");
    expect(t().topology.nodes.map((n) => n.id)).toEqual([sw]);
    expect(t().topology.edges).toHaveLength(0);
    expect(useUi.getState().selection).toBeUndefined();
  });

  it("FR-16 Entf löscht die gewählte Kante", async () => {
    const user = userEvent.setup();
    ui();
    t().connect(add("pc"), add("switch"));
    act(() => {
      useUi
        .getState()
        .select({ kind: "edge", id: t().topology.edges[0]?.id ?? "" });
    });
    await user.click(screen.getByRole("button", { name: "Fläche" }));
    await user.keyboard("{Backspace}");
    expect(t().topology.edges).toHaveLength(0);
    expect(t().topology.nodes).toHaveLength(2);
  });

  it("FR-16 in einem Eingabefeld greifen die Kürzel nicht", async () => {
    const user = userEvent.setup();
    ui();
    const pc = add("pc");
    act(() => {
      useUi.getState().select({ kind: "node", id: pc });
    });
    await user.click(screen.getByLabelText("Feld"));
    await user.keyboard("{Control>}c{/Control}{Delete}{Backspace}");
    expect(t().topology.nodes).toHaveLength(1);
  });

  it("FR-16 Kopieren und Einfügen legen eine Kopie an", async () => {
    const user = userEvent.setup();
    ui();
    const pc = add("pc");
    act(() => {
      useUi.getState().select({ kind: "node", id: pc });
    });
    await user.click(screen.getByRole("button", { name: "Fläche" }));
    await user.keyboard("{Control>}c{/Control}");
    await user.keyboard("{Control>}v{/Control}");
    expect(t().topology.nodes.map((n) => n.id)).toEqual(["pc-1", "pc-2"]);
    expect(useUi.getState().selection).toEqual({ kind: "node", id: "pc-2" });
  });

  it("FR-16 während der Simulation melden die Kürzel die Sperre", async () => {
    const user = userEvent.setup();
    ui();
    const pc = add("pc");
    act(() => {
      useUi.getState().select({ kind: "node", id: pc });
      useSim.setState({ sim: { ...IDLE, status: "running" } });
    });
    await user.click(screen.getByRole("button", { name: "Fläche" }));
    await user.keyboard("{Delete}");
    expect(t().topology.nodes).toHaveLength(1);
    expect(
      await screen.findByText(/Während der Simulation ist die Topologie/),
    ).toBeInTheDocument();
    act(() => {
      useSim.setState({ sim: IDLE });
    });
  });
});
