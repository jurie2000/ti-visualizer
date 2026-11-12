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
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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

  it("hat Zoom, Übersicht und Übersichtskarte mit deutschen Namen", () => {
    render(<Canvas />, { wrapper });
    const view = screen.getByLabelText("Ansicht");
    expect(
      within(view).getByRole("button", { name: "Übersicht" }),
    ).toBeInTheDocument();
    expect(
      within(view).getByRole("button", { name: "Vergrößern" }),
    ).toBeInTheDocument();
    expect(
      within(view).getByRole("button", { name: "Sortieren" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("img", { name: "Übersichtskarte" }),
    ).toBeInTheDocument();
  });

  describe("T-720a Übersicht", () => {
    // jsdom misst aus `style`: „100 %“ ergäbe 100 px, daher feste Maße für die Flächen.
    const sized = wrapper;
    const original = {
      w: Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth"),
      h: Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight"),
    };
    beforeEach(() => {
      const fixed = (key: "w" | "h", size: number) => ({
        configurable: true,
        get(this: HTMLElement) {
          return this.style.width === "100%" || this.style.height === "100%"
            ? size
            : (original[key]?.get?.call(this) as number);
        },
      });
      Object.defineProperty(
        HTMLElement.prototype,
        "offsetWidth",
        fixed("w", 1000),
      );
      Object.defineProperty(
        HTMLElement.prototype,
        "offsetHeight",
        fixed("h", 700),
      );
    });
    afterEach(() => {
      if (original.w)
        Object.defineProperty(HTMLElement.prototype, "offsetWidth", original.w);
      if (original.h)
        Object.defineProperty(
          HTMLElement.prototype,
          "offsetHeight",
          original.h,
        );
    });
    /** Alle Geräte und Zonen liegen nach Zoom und Verschiebung im Sichtbereich. */
    const sichtbar = () => {
      const m =
        /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\) scale\((-?[\d.]+)\)/.exec(
          document.querySelector<HTMLElement>(".react-flow__viewport")?.style
            .transform ?? "",
        );
      if (!m) throw new Error("Viewport ohne Transform");
      const [tx, ty, k] = [Number(m[1]), Number(m[2]), Number(m[3])];
      const t = useTopology.getState().topology;
      const rects = [
        ...t.nodes.map((n) => ({
          x: n.position.x,
          y: n.position.y,
          w: 148,
          h: 64,
        })),
        ...t.zones.map((z) => z.area),
      ];
      return rects.every(
        (r) =>
          r.x * k + tx >= 0 &&
          r.y * k + ty >= 0 &&
          (r.x + r.w) * k + tx <= 1000 &&
          (r.y + r.h) * k + ty <= 700,
      );
    };

    it("T-720a Übersicht zeigt alle Geräte und Zonen, auch nach Sortieren", async () => {
      const user = userEvent.setup();
      useTopology
        .getState()
        .reset(
          loadCatalog().presets.find((p) => p.id === "klinikum")?.topology ??
            praxis,
        );
      render(<Canvas />, { wrapper: sized });
      const view = screen.getByLabelText("Ansicht");
      await user.click(within(view).getByRole("button", { name: "Übersicht" }));
      await waitFor(() => {
        expect(sichtbar()).toBe(true);
      });
      await user.click(within(view).getByRole("button", { name: "Sortieren" }));
      // Mockup: fit() nach 30 ms, wenn die neuen Positionen gezeichnet sind
      await waitFor(() => {
        expect(sichtbar()).toBe(true);
      });
    });

    it("T-720a Übersicht bricht auf leerer Fläche nicht ab", async () => {
      const user = userEvent.setup();
      useTopology.getState().reset(emptyTopology());
      render(<Canvas />, { wrapper: sized });
      await user.click(screen.getByRole("button", { name: "Übersicht" }));
      expect(screen.getByRole("button", { name: "Sortieren" })).toBeEnabled();
    });
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
