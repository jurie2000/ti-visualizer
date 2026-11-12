import { ReactFlowProvider } from "@xyflow/react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { IDLE } from "../engine/simulation";
import {
  emptyTopology,
  useSettings,
  useSim,
  useTopology,
  useUi,
} from "../store";
import { ToastProvider } from "../ui/Toast";
import { Canvas } from "./Canvas";
import { MIN_ZONE } from "./ZoneTools";

const wrapper = ({ children }: { children: ReactNode }) => (
  <ToastProvider>
    <ReactFlowProvider>{children}</ReactFlowProvider>
  </ToastProvider>
);
const s = () => useTopology.getState();

beforeEach(() => {
  useSettings.setState({ mode: "advanced" });
  useUi.setState({ selection: undefined });
  useSim.setState({ sim: IDLE });
  s().reset(emptyTopology());
  s().addNode("pc", { x: 40, y: 60 });
  s().addZone({ x: 0, y: 0, w: 300, h: 200 });
  s().setZone("zone-1", { label: "<i>Empfang</i>", withContents: true });
});

describe("FR-15 Zonen auf der Canvas", () => {
  it("zeigt die Zone als Text mit Rolle und Farbe im Namen, nicht als HTML", () => {
    render(<Canvas />, { wrapper });
    const zone = screen.getByRole("group", { name: /^Zone: <i>Empfang<\/i>/ });
    expect(zone).toHaveAttribute("aria-roledescription", "Zone");
    expect(zone).toHaveAccessibleName("Zone: <i>Empfang</i>, Salbei, 1 Geräte");
    expect(document.querySelector(".tiv-zone i")).toBeNull();
  });

  it("wählt die Zone per Enter und verschiebt sie samt Geräten per Pfeiltaste", async () => {
    const user = userEvent.setup();
    render(<Canvas />, { wrapper });
    screen.getByRole("group", { name: /^Zone: / }).focus();
    await user.keyboard("{Enter}");
    expect(useUi.getState().selection).toEqual({ kind: "zone", id: "zone-1" });
    expect(
      screen.getByRole("group", { name: /^Zone: .*, ausgewählt$/ }),
    ).toBeInTheDocument();
    await act(async () => {
      await user.keyboard("{ArrowRight}");
    });
    const { zones, nodes } = s().topology;
    expect(zones[0]?.area.x).toBeGreaterThan(0);
    expect(nodes[0]?.position.x).toBe(40 + (zones[0]?.area.x ?? 0));
  });

  it("T-715: es gibt keinen zweiten Weg „Zone anlegen“, nur die Zeichenleiste", () => {
    render(<Canvas />, { wrapper });
    expect(screen.queryByRole("button", { name: "Zone anlegen" })).toBeNull();
    expect(
      screen.getByRole("group", { name: "Zone zeichnen" }),
    ).toBeInTheDocument();
  });

  describe("T-715 Zonen-Werkzeug", () => {
    const flaeche = () => {
      const el = document.querySelector(".tiv-zonedraw");
      if (!el) throw new Error("Zeichenfläche fehlt");
      return el;
    };
    const ziehe = (to: { x: number; y: number }) => {
      fireEvent.pointerDown(flaeche(), { button: 0, clientX: 10, clientY: 10 });
      fireEvent.pointerMove(flaeche(), { clientX: to.x, clientY: to.y });
      fireEvent.pointerUp(flaeche(), { clientX: to.x, clientY: to.y });
    };
    beforeEach(() => {
      // jsdom kennt `setPointerCapture` nicht
      Element.prototype.setPointerCapture = () => undefined;
      s().reset(emptyTopology());
      useUi.setState({ zoneTool: undefined, selection: undefined });
    });

    it("zieht ein Rechteck auf, wählt die Zone und schaltet das Werkzeug ab", async () => {
      const user = userEvent.setup();
      render(<Canvas />, { wrapper });
      const knopf = screen.getByRole("button", { name: /^Rechteck/ });
      await user.click(knopf);
      expect(knopf).toHaveAttribute("aria-pressed", "true");
      ziehe({ x: 210, y: 130 });
      const zone = s().topology.zones[0];
      expect(zone?.area).toEqual({ x: 10, y: 10, w: 200, h: 120 });
      expect(zone?.shape).toBe("rect");
      expect(useUi.getState().selection).toEqual({
        kind: "zone",
        id: "zone-1",
      });
      expect(useUi.getState().zoneTool).toBeUndefined();
      expect(document.querySelector(".tiv-zonedraw")).toBeNull();
    });

    it("zieht eine Ellipse auf und rückwärts (Start rechts unten)", async () => {
      const user = userEvent.setup();
      render(<Canvas />, { wrapper });
      await user.click(screen.getByRole("button", { name: /^Ellipse/ }));
      fireEvent.pointerDown(flaeche(), {
        button: 0,
        clientX: 300,
        clientY: 200,
      });
      fireEvent.pointerMove(flaeche(), { clientX: 100, clientY: 50 });
      fireEvent.pointerUp(flaeche(), { clientX: 100, clientY: 50 });
      const zone = s().topology.zones[0];
      expect(zone?.shape).toBe("ellipse");
      expect(zone?.area).toEqual({ x: 100, y: 50, w: 200, h: 150 });
    });

    it("legt unter der Mindestgröße keine Zone an, das Werkzeug bleibt", async () => {
      const user = userEvent.setup();
      render(<Canvas />, { wrapper });
      await user.click(screen.getByRole("button", { name: /^Rechteck/ }));
      ziehe({ x: 30, y: 25 });
      expect(s().topology.zones).toHaveLength(0);
      expect(useUi.getState().zoneTool).toBe("rect");
    });

    it("Esc und der gleiche Knopf brechen ab", async () => {
      const user = userEvent.setup();
      render(<Canvas />, { wrapper });
      await user.click(screen.getByRole("button", { name: /^Rechteck/ }));
      await user.keyboard("{Escape}");
      expect(useUi.getState().zoneTool).toBeUndefined();
      await user.click(screen.getByRole("button", { name: /^Ellipse/ }));
      await user.click(screen.getByRole("button", { name: /^Ellipse/ }));
      expect(useUi.getState().zoneTool).toBeUndefined();
    });

    it("setzt ein gewähltes Werkzeug zurück, sobald die Simulation startet", () => {
      useUi.setState({ zoneTool: "ellipse" });
      render(<Canvas />, { wrapper });
      expect(screen.getByRole("button", { name: /^Ellipse/ })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      act(() => {
        useSim.setState({ sim: { ...IDLE, status: "running" } });
      });
      expect(useUi.getState().zoneTool).toBeUndefined();
      expect(document.querySelector(".tiv-zonedraw")).toBeNull();
    });

    it("nennt die gewählte Form im Hinweis (nicht nur Farbe)", () => {
      useUi.setState({ zoneTool: "ellipse" });
      render(<Canvas />, { wrapper });
      expect(
        screen.getByText("Ellipse auf der Fläche aufziehen · Esc bricht ab"),
      ).toBeInTheDocument();
    });

    it("sperrt die Werkzeuge während der Simulation", () => {
      useSim.setState({ sim: { ...IDLE, status: "running" } });
      render(<Canvas />, { wrapper });
      expect(screen.getByRole("button", { name: /^Rechteck/ })).toBeDisabled();
    });

    it("zeigt eine Ellipse mit Klasse und Namen der Form", () => {
      s().addZone({ x: 0, y: 0, w: 200, h: 100 }, undefined, "ellipse");
      render(<Canvas />, { wrapper });
      expect(document.querySelector(".tiv-zone.is-ellipse")).not.toBeNull();
      expect(
        screen.getByRole("group", { name: /Ellipse, 0 Geräte/ }),
      ).toBeInTheDocument();
    });
  });

  it("Regression: eine gewählte Zone liegt hinter ihren Geräten, sonst fängt sie deren Mausereignisse ab", () => {
    act(() => {
      useUi.getState().select({ kind: "zone", id: "zone-1" });
    });
    render(<Canvas />, { wrapper });
    const z = (el: Element | null) =>
      Number((el as HTMLElement).style.zIndex || 0);
    const zone = document.querySelector(".react-flow__node-zone");
    const device = document.querySelector(".react-flow__node-device");
    expect(z(zone)).toBeLessThan(z(device));
  });

  describe("T-716 Zone in der Größe ziehen", () => {
    const eckeRechtsUnten = () => {
      const el = document.querySelector<HTMLElement>(
        ".react-flow__resize-control.handle.bottom.right",
      );
      if (!el) throw new Error("Anfasser fehlt");
      return el;
    };
    // d3-drag liest `event.view`; jsdom lässt es im Konstruktor nicht zu
    const maus = (type: string, target: EventTarget, x: number, y: number) => {
      const e = new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        button: 0,
      });
      Object.defineProperty(e, "view", { value: window });
      act(() => {
        target.dispatchEvent(e);
      });
    };
    const ziehe = (dx: number, dy: number) => {
      maus("mousedown", eckeRechtsUnten(), 300, 200);
      maus("mousemove", window, 300 + dx, 200 + dy);
      maus("mouseup", window, 300 + dx, 200 + dy);
    };
    beforeEach(() => {
      s().reset(emptyTopology());
      s().addZone({ x: 0, y: 0, w: 300, h: 200 }, undefined, "ellipse");
      act(() => {
        useUi.getState().select({ kind: "zone", id: "zone-1" });
      });
    });

    it("Anfasser nur bei gewählter, nicht gesperrter Zone", () => {
      render(<Canvas />, { wrapper });
      expect(eckeRechtsUnten()).toBeInTheDocument();
      act(() => {
        useUi.getState().select(undefined);
      });
      expect(document.querySelector(".react-flow__resize-control")).toBeNull();
      act(() => {
        useUi.getState().select({ kind: "zone", id: "zone-1" });
        useSim.setState({ sim: { ...IDLE, status: "running" } });
      });
      expect(document.querySelector(".react-flow__resize-control")).toBeNull();
    });

    it("zieht an der Ecke: neue Größe in einem Schritt, Form bleibt, Geräte bleiben", () => {
      s().addNode("pc", { x: 20, y: 20 });
      render(<Canvas />, { wrapper });
      const vorher = s().past.length;
      ziehe(80, 50);
      const z = s().topology.zones[0];
      expect(z?.area).toEqual({ x: 0, y: 0, w: 380, h: 250 });
      expect(z?.shape).toBe("ellipse");
      expect(s().topology.nodes[0]?.position).toEqual({ x: 20, y: 20 });
      expect(s().past.length).toBe(vorher + 1);
    });

    it("unterschreitet nie die Mindestgröße", () => {
      render(<Canvas />, { wrapper });
      ziehe(-1000, -1000);
      const a = s().topology.zones[0]?.area;
      expect(a?.w).toBe(MIN_ZONE.w);
      expect(a?.h).toBe(MIN_ZONE.h);
    });
  });
});
