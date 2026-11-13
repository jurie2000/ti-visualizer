import { ReactFlowProvider } from "@xyflow/react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IDLE } from "../engine/simulation";
import { ToastProvider } from "../ui/Toast";
import { Canvas } from "../canvas/Canvas";
import { DRAG_TYPE } from "../canvas/deviceStyle";
import { useCatalog, useSim, useTopology } from "../store";
import { Palette } from "./Palette";
import { PalettePanel } from "./PalettePanel";

const empty = { ...useTopology.getState().topology, nodes: [], edges: [] };
const count = () => useTopology.getState().topology.nodes.length;
const pvsCount = () =>
  useTopology.getState().topology.nodes.filter((n) => n.type === "pvs").length;

beforeEach(() => {
  useTopology.getState().reset(empty);
});

describe("Palette", () => {
  it("gruppiert nach Kategorie, klappt ein und zeigt nur platzierbare Typen", async () => {
    const user = userEvent.setup();
    render(<Palette onAdd={() => undefined} />);
    const head = screen.getByRole("button", { name: /^Software/ });
    expect(head).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("button", {
        name: "PVS Praxisverwaltungssystem hinzufügen",
      }),
    ).toBeVisible();
    await user.click(head);
    expect(head).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("button", {
        name: "PVS Praxisverwaltungssystem hinzufügen",
      }),
    ).not.toBeInTheDocument();
    const placeable = useCatalog
      .getState()
      .catalog.deviceTypes.filter((d) => d.placeable).length;
    expect(
      screen.getAllByRole("button", { name: / hinzufügen$/, hidden: true }),
    ).toHaveLength(placeable);
  });

  it("sucht nach Name und Kürzel und meldet keine Treffer", async () => {
    const user = userEvent.setup();
    render(<Palette onAdd={() => undefined} />);
    const search = screen.getByRole("searchbox", { name: "Geräte suchen" });
    await user.type(search, "konnektor");
    const items = screen.getAllByRole("button", { name: / hinzufügen$/ });
    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThan(5);
    await user.clear(search);
    await user.type(search, "gibtesnicht");
    expect(screen.getByRole("status")).toHaveTextContent("Kein Gerät gefunden");
  });

  it("pinnt ein Gerät in die Gruppe Angepinnt", async () => {
    const user = userEvent.setup();
    render(<Palette onAdd={() => undefined} />);
    await user.click(
      screen.getAllByRole("button", { name: /anpinnen$/ })[0] as HTMLElement,
    );
    const group = screen
      .getByRole("button", { name: /Angepinnt/ })
      .closest("section") as HTMLElement;
    expect(within(group).getAllByRole("listitem")).toHaveLength(1);
  });

  it("fügt per Enter hinzu, beliebig oft je Typ", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <ReactFlowProvider>
          <PalettePanel />
        </ReactFlowProvider>
      </ToastProvider>,
    );
    const add = screen.getByRole("button", {
      name: "PVS Praxisverwaltungssystem hinzufügen",
    });
    add.focus();
    await user.keyboard("{Enter}{Enter}{Enter}");
    expect(pvsCount()).toBe(3);
  });

  it("T-703 meldet onAdded nur bei tatsächlich hinzugefügtem Gerät", async () => {
    const user = userEvent.setup();
    const onAdded = vi.fn();
    render(
      <ToastProvider>
        <ReactFlowProvider>
          <PalettePanel onAdded={onAdded} />
        </ReactFlowProvider>
      </ToastProvider>,
    );
    const add = screen.getByRole("button", {
      name: "PVS Praxisverwaltungssystem hinzufügen",
    });
    useSim.setState({ sim: { ...IDLE, status: "running" } });
    await user.click(add);
    expect(onAdded).not.toHaveBeenCalled();
    useSim.setState({ sim: IDLE });
    await user.click(add);
    expect(onAdded).toHaveBeenCalledTimes(1);
  });

  it("fügt per Drop auf die Canvas hinzu", () => {
    render(
      <ToastProvider>
        <ReactFlowProvider>
          <Canvas />
        </ReactFlowProvider>
      </ToastProvider>,
    );
    const pane = document.querySelector(".react-flow") as HTMLElement;
    const dataTransfer = {
      types: [DRAG_TYPE],
      getData: (t: string) => (t === DRAG_TYPE ? "pvs" : ""),
      files: { item: () => null },
      items: [],
    };
    fireEvent.drop(pane, { dataTransfer, clientX: 200, clientY: 100 });
    expect(count()).toBe(1);
    expect(pvsCount()).toBe(1);
  });

  it("ignoriert fremde Drops", () => {
    render(
      <ToastProvider>
        <ReactFlowProvider>
          <Canvas />
        </ReactFlowProvider>
      </ToastProvider>,
    );
    const pane = document.querySelector(".react-flow") as HTMLElement;
    fireEvent.drop(pane, {
      dataTransfer: {
        types: [],
        getData: () => "",
        files: { item: () => null },
        items: [],
      },
    });
    expect(count()).toBe(0);
  });

  it("T-711 Schienen-Symbol klappt die gewählte Gruppe wieder auf", async () => {
    Element.prototype.scrollIntoView = vi.fn(); // fehlt in jsdom
    const user = userEvent.setup();
    const { rerender } = render(<Palette onAdd={() => undefined} />);
    const head = screen.getByRole("button", { name: /^Software/ });
    await user.click(head);
    expect(head).toHaveAttribute("aria-expanded", "false");
    const id = useCatalog
      .getState()
      .catalog.categories.find((c) => c.name === "Software")?.id;
    rerender(
      <Palette onAdd={() => undefined} reveal={{ id: id ?? "", n: 1 }} />,
    );
    expect(head).toHaveAttribute("aria-expanded", "true");
  });
});
