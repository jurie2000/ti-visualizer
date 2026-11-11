import { ReactFlowProvider } from "@xyflow/react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { loadCatalog } from "../schema";
import {
  emptyTopology,
  serialize,
  useSettings,
  useTopology,
  useUi,
} from "../store";
import { ToastProvider } from "../ui/Toast";
import { Canvas } from "./Canvas";

const praxis = (() => {
  const preset = loadCatalog().presets.find((p) => p.id === "praxis");
  if (!preset) throw new Error("Preset praxis fehlt");
  return preset.topology;
})();
const pvsNode = (nodes: typeof praxis.nodes) => {
  const node = nodes.find((n) => n.type === "pvs");
  if (!node) throw new Error("PVS fehlt");
  return node;
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <ToastProvider>
    <ReactFlowProvider>{children}</ReactFlowProvider>
  </ToastProvider>
);

beforeEach(() => {
  useSettings.setState({ mode: "advanced" });
  useUi.setState({ selection: undefined });
  useTopology.getState().reset(praxis);
});

describe("Canvas (Preset Arztpraxis, Erweitert)", () => {
  it("zeigt alle Geräte mit Rolle und Label", () => {
    render(<Canvas />, { wrapper });
    const devices = document.querySelectorAll(".react-flow__node");
    expect(devices).toHaveLength(praxis.nodes.length);
    const pvs = screen.getByRole("group", {
      name: /^PVS: Praxisverwaltungssystem/,
    });
    expect(pvs).toHaveAttribute("aria-roledescription", "Gerät");
  });

  it("zeigt alle Verbindungen mit Label und Beschreibung", async () => {
    render(<Canvas />, { wrapper });
    // Kanten erscheinen erst, wenn React Flow die Knoten gemessen hat
    await waitFor(() => {
      expect(
        screen.getAllByRole("group", { name: /^Verbindung .* zu .*, / }),
      ).toHaveLength(praxis.edges.length);
    });
    expect(screen.getAllByText("VPN").length).toBeGreaterThan(0);
  });

  it("hat Zoom, Einpassen und Übersichtskarte mit deutschen Namen", () => {
    render(<Canvas />, { wrapper });
    const view = screen.getByLabelText("Ansicht");
    expect(
      within(view).getByRole("button", { name: "Einpassen" }),
    ).toBeInTheDocument();
    expect(
      within(view).getByRole("button", { name: "Vergrößern" }),
    ).toBeInTheDocument();
    expect(
      within(view).getByRole("button", { name: "Anordnen" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("img", { name: "Übersichtskarte" }),
    ).toBeInTheDocument();
  });

  it("wählt per Enter und verschiebt per Pfeiltaste (ein Verlaufsschritt je Taste)", async () => {
    const user = userEvent.setup();
    render(<Canvas />, { wrapper });
    const first = pvsNode(praxis.nodes);
    const el = screen.getByRole("group", { name: /^PVS: / });
    el.focus();
    await user.keyboard("{Enter}");
    expect(useUi.getState().selection).toEqual({ kind: "node", id: first.id });
    // Auswahl nicht nur über Farbe: Screenreader hören sie im Label
    expect(
      screen.getByRole("group", { name: /^PVS: .*, ausgewählt$/ }),
    ).toBeInTheDocument();
    const before = useTopology.getState().past.length;
    await act(async () => {
      await user.keyboard("{ArrowRight}");
    });
    const moved = pvsNode(useTopology.getState().topology.nodes);
    expect(moved.position.x).toBeGreaterThan(first.position.x);
    expect(useTopology.getState().past.length).toBe(before + 1);
  });

  it("öffnet eine auf die Canvas gezogene Datei statt ein Gerät anzulegen", async () => {
    useTopology.getState().reset(emptyTopology());
    render(<Canvas />, { wrapper });
    const pane = document.querySelector(".react-flow") as HTMLElement;
    const file = new File(
      [serialize(praxis, loadCatalog())],
      "praxis.tiv.json",
    );
    fireEvent.drop(pane, {
      dataTransfer: {
        types: ["Files"],
        getData: () => "",
        files: { item: () => file },
        items: [],
      },
    });
    await waitFor(() => {
      expect(useTopology.getState().topology.nodes).toHaveLength(
        praxis.nodes.length,
      );
    });
  });
});
