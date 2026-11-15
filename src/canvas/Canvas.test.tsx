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

    const zoom = () =>
      Number(
        /scale\((-?[\d.]+)\)/.exec(
          document.querySelector<HTMLElement>(".react-flow__viewport")?.style
            .transform ?? "",
        )?.[1],
      );

    it("Issue #140: Start und Übersicht zoomen kleine Topologien nicht über 100 %", async () => {
      const user = userEvent.setup();
      useTopology.getState().reset(praxis);
      render(<Canvas />, { wrapper: sized });
      await waitFor(() => {
        expect(zoom()).toBeGreaterThan(0);
      });
      expect(zoom()).toBeLessThanOrEqual(1);
      await user.click(screen.getByRole("button", { name: "Vergrößern" }));
      await waitFor(() => {
        expect(zoom()).toBeGreaterThan(1);
      });
      await user.click(screen.getByRole("button", { name: "Übersicht" }));
      await waitFor(() => {
        expect(zoom()).toBeLessThanOrEqual(1);
      });
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

describe("Gelenkpunkte einer Verbindung (FR-23)", () => {
  const edgeId = praxis.edges[0]?.id ?? "";
  const waypoints = () =>
    useTopology.getState().topology.edges.find((e) => e.id === edgeId)
      ?.waypoints;
  const handle = () =>
    screen.queryAllByRole("button", { name: /^Gelenkpunkt / });

  it("zeigt nur bei gewählter Verbindung Griffe", async () => {
    render(<Canvas />, { wrapper });
    await waitFor(() => {
      expect(
        screen.getAllByRole("group", { name: /^Verbindung .* zu .*, / }),
      ).toHaveLength(praxis.edges.length);
    });
    expect(handle()).toHaveLength(0);
    act(() => {
      useUi.setState({ selection: { kind: "edge", id: edgeId } });
    });
    expect(handle()).toHaveLength(1);
  });

  it("Pfeiltasten legen Gelenkpunkte an und verschieben sie, Undo stellt die Linie her", async () => {
    useUi.setState({ selection: { kind: "edge", id: edgeId } });
    render(<Canvas />, { wrapper });
    await waitFor(() => {
      expect(handle()).toHaveLength(1);
    });
    const first = handle()[0] as HTMLElement;
    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(waypoints()).toHaveLength(1);
    const x = waypoints()?.[0]?.x ?? 0;
    fireEvent.keyDown(handle()[0] as HTMLElement, { key: "ArrowDown" });
    fireEvent.keyDown(handle()[0] as HTMLElement, { key: "a" });
    expect(waypoints()?.[0]?.x).toBe(x);
    act(() => {
      useTopology.getState().undo();
    });
    act(() => {
      useTopology.getState().undo();
    });
    expect(waypoints()).toBeUndefined();
  });

  it("Ziehen mit der Maus setzt den Punkt beim Loslassen als ein Schritt, Klick und Abbruch nicht", async () => {
    useUi.setState({ selection: { kind: "edge", id: edgeId } });
    render(<Canvas />, { wrapper });
    await waitFor(() => {
      expect(handle()).toHaveLength(1);
    });
    const first = handle()[0] as HTMLElement;
    first.setPointerCapture = () => undefined;
    const before = useTopology.getState().past.length;
    fireEvent.pointerDown(first, { pointerId: 1 });
    fireEvent.pointerUp(first, { pointerId: 1 });
    expect(waypoints()).toBeUndefined();
    fireEvent.pointerDown(first, { pointerId: 1 });
    fireEvent.pointerMove(first, { clientX: 20, clientY: 30, pointerId: 1 });
    fireEvent.pointerCancel(first, { pointerId: 1 });
    fireEvent.pointerUp(first, { pointerId: 1 });
    expect(waypoints()).toBeUndefined();
    fireEvent.pointerDown(first, { pointerId: 1 });
    fireEvent.pointerMove(first, { clientX: 20, clientY: 30, pointerId: 1 });
    fireEvent.pointerUp(first, { pointerId: 1 });
    expect(waypoints()).toHaveLength(1);
    expect(useTopology.getState().past.length).toBe(before + 1);
    act(() => {
      useTopology.getState().undo();
    });
    expect(waypoints()).toBeUndefined();
  });

  const pts = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ x: 100 + i * 10, y: 100 }));
  const select = async (n: number) => {
    useTopology.getState().setWaypoints(edgeId, pts(n));
    useUi.setState({ selection: { kind: "edge", id: edgeId } });
    render(<Canvas />, { wrapper });
    await waitFor(() => {
      expect(handle()).toHaveLength(n === 0 ? 1 : 2 * n + 1);
    });
  };
  const named = (re: RegExp) => screen.getAllByRole("button", { name: re });

  it("Eingabetaste am Einfüge-Griff legt dort einen Punkt an (L-6), ein Undo-Schritt", async () => {
    await select(2);
    const before = useTopology.getState().past.length;
    fireEvent.keyDown(
      named(/^Gelenkpunkt einfügen, Abschnitt 2 /)[0] as Element,
      {
        key: "Enter",
      },
    );
    expect(waypoints()).toHaveLength(3);
    expect(waypoints()?.[1]).toEqual({ x: 105, y: 100 });
    expect(waypoints()?.[0]).toEqual({ x: 100, y: 100 });
    expect(useTopology.getState().past.length).toBe(before + 1);
    expect(document.activeElement?.getAttribute("aria-label")).toMatch(
      /^Gelenkpunkt 2 von 3/,
    );
    act(() => {
      useTopology.getState().undo();
    });
    expect(waypoints()).toHaveLength(2);
  });

  it("Ziehen am Einfüge-Griff fügt einen Punkt ein, Klick ohne Ziehen nicht (L-4, L-6)", async () => {
    await select(1);
    const add = named(/^Gelenkpunkt einfügen, Abschnitt 1 /)[0] as HTMLElement;
    add.setPointerCapture = () => undefined;
    fireEvent.pointerDown(add, { pointerId: 1 });
    fireEvent.pointerUp(add, { pointerId: 1 });
    expect(waypoints()).toHaveLength(1);
    fireEvent.pointerDown(add, { pointerId: 1 });
    fireEvent.pointerMove(add, { clientX: 20, clientY: 30, pointerId: 1 });
    fireEvent.pointerUp(add, { pointerId: 1 });
    expect(waypoints()).toHaveLength(2);
    expect(waypoints()?.[1]).toEqual({ x: 100, y: 100 });
  });

  it("Entf und Doppelklick entfernen einen Punkt, je ein Undo-Schritt (L-7)", async () => {
    await select(3);
    const before = useTopology.getState().past.length;
    fireEvent.keyDown(named(/^Gelenkpunkt 3 von 3/)[0] as Element, {
      key: "Delete",
    });
    expect(waypoints()).toHaveLength(2);
    fireEvent.doubleClick(named(/^Gelenkpunkt 1 von 2/)[0] as Element);
    expect(waypoints()).toEqual([{ x: 110, y: 100 }]);
    expect(useTopology.getState().past.length).toBe(before + 2);
    // Einfüge-Griffe ignorieren Doppelklick und Entf
    fireEvent.doubleClick(named(/^Gelenkpunkt einfügen/)[0] as Element);
    fireEvent.keyDown(named(/^Gelenkpunkt einfügen/)[0] as Element, {
      key: "Delete",
    });
    expect(waypoints()).toHaveLength(1);
    fireEvent.keyDown(named(/^Gelenkpunkt 1 von 1/)[0] as Element, {
      key: "Delete",
    });
    expect(waypoints()).toBeUndefined();
    expect(document.activeElement?.getAttribute("aria-label")).toMatch(
      /^Gelenkpunkt einfügen/,
    );
    act(() => {
      useTopology.getState().undo();
    });
    expect(waypoints()).toHaveLength(1);
  });

  it("bei 20 Punkten gibt es keine Einfüge-Griffe mehr (L-8)", async () => {
    useTopology.getState().setWaypoints(edgeId, pts(20));
    useUi.setState({ selection: { kind: "edge", id: edgeId } });
    render(<Canvas />, { wrapper });
    await waitFor(() => {
      expect(handle()).toHaveLength(20);
    });
    expect(screen.queryByRole("button", { name: /einfügen/ })).toBeNull();
  });

  it("Ziehen an der Linie fügt im nächsten Abschnitt einen Punkt ein, kleine Bewegung nicht (L-4, L-6)", async () => {
    await select(2);
    const line = document.querySelector<SVGElement>(".tiv-edge-grab");
    expect(line).not.toBeNull();
    const el = line as unknown as HTMLElement;
    el.setPointerCapture = () => undefined;
    const before = useTopology.getState().past.length;
    fireEvent.pointerDown(el, { clientX: 10, clientY: 10, pointerId: 1 });
    fireEvent.pointerMove(el, { clientX: 12, clientY: 11, pointerId: 1 });
    fireEvent.pointerUp(el, { pointerId: 1 });
    expect(waypoints()).toHaveLength(2);
    fireEvent.pointerDown(el, { clientX: 10, clientY: 10, pointerId: 1 });
    fireEvent.pointerMove(el, { clientX: 40, clientY: 50, pointerId: 1 });
    fireEvent.pointerUp(el, { pointerId: 1 });
    expect(waypoints()).toHaveLength(3);
    expect(useTopology.getState().past.length).toBe(before + 1);
  });

  it("Ziehen an der Linie ohne Gelenkpunkte legt den ersten Punkt an", async () => {
    await select(0);
    const el = document.querySelector(
      ".tiv-edge-grab",
    ) as unknown as HTMLElement;
    el.setPointerCapture = () => undefined;
    fireEvent.pointerDown(el, { clientX: 10, clientY: 10, pointerId: 1 });
    fireEvent.pointerMove(el, { clientX: 40, clientY: 50, pointerId: 1 });
    fireEvent.pointerUp(el, { pointerId: 1 });
    expect(waypoints()).toHaveLength(1);
  });
});
