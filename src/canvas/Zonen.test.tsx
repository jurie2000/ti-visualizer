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
  s().setZone("zone-1", { label: "<i>Empfang</i>" });
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

  it("legt per Knopf eine Zone an und wählt sie", async () => {
    const user = userEvent.setup();
    s().reset(emptyTopology());
    render(<Canvas />, { wrapper });
    await user.click(screen.getByRole("button", { name: "Zone anlegen" }));
    expect(s().topology.zones).toHaveLength(1);
    expect(useUi.getState().selection).toEqual({ kind: "zone", id: "zone-1" });
  });

  it("legt die Zone um das gewählte Gerät", async () => {
    const user = userEvent.setup();
    s().reset(emptyTopology());
    s().addNode("pc", { x: 100, y: 100 });
    render(<Canvas />, { wrapper });
    screen.getByRole("group", { name: /^PC/ }).focus();
    await user.keyboard("{Enter}");
    await user.click(screen.getByRole("button", { name: "Zone anlegen" }));
    const area = s().topology.zones[0]?.area;
    expect(area?.x).toBeLessThan(100);
    expect(area?.y).toBeLessThan(100);
    expect((area?.x ?? 0) + (area?.w ?? 0)).toBeGreaterThan(100 + 148);
  });

  it("sperrt den Knopf während der Simulation", () => {
    useSim.setState({ sim: { ...IDLE, status: "running" } });
    render(<Canvas />, { wrapper });
    expect(screen.getByRole("button", { name: "Zone anlegen" })).toBeDisabled();
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
});
