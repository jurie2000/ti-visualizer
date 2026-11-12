import { ReactFlowProvider } from "@xyflow/react";
import { act, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { loadCatalog } from "../schema";
import { DEFAULT_VIEW, useSettings, useTopology, useUi } from "../store";
import { ToastProvider } from "../ui/Toast";
import { Canvas } from "./Canvas";

const praxis = (() => {
  const preset = loadCatalog().presets.find((p) => p.id === "praxis");
  if (!preset) throw new Error("Preset praxis fehlt");
  return preset.topology;
})();

const wrapper = ({ children }: { children: ReactNode }) => (
  <ToastProvider>
    <ReactFlowProvider>{children}</ReactFlowProvider>
  </ToastProvider>
);
const setView = (
  patch: Parameters<ReturnType<typeof useUi.getState>["setView"]>[0],
) => {
  act(() => {
    useUi.getState().setView(patch);
  });
};

beforeEach(() => {
  useSettings.setState({ mode: "advanced" });
  useUi.setState({
    selection: undefined,
    view: DEFAULT_VIEW,
  });
  useTopology.getState().reset(praxis);
});

describe("T-713a Ansicht-Schalter wirken auf die Fläche", () => {
  it("Verbindungen: aus blendet die Kanten aus", async () => {
    render(<Canvas />, { wrapper });
    await waitFor(() => {
      expect(
        document.querySelectorAll(".react-flow__edge").length,
      ).toBeGreaterThan(0);
    });
    setView({ edges: false });
    await waitFor(() => {
      expect(document.querySelectorAll(".react-flow__edge")).toHaveLength(0);
    });
  });

  it("Zonen: aus blendet die Zonen aus", async () => {
    useTopology.getState().addZone({ x: 0, y: 0, w: 300, h: 200 });
    render(<Canvas />, { wrapper });
    expect(
      document.querySelectorAll(".react-flow__node-zone").length,
    ).toBeGreaterThan(0);
    setView({ zones: false });
    await waitFor(() => {
      expect(document.querySelectorAll(".react-flow__node-zone")).toHaveLength(
        0,
      );
    });
    expect(
      document.querySelectorAll(".react-flow__node-device").length,
    ).toBeGreaterThan(0);
  });

  it("Anschlusspunkte: aus setzt die Klasse, die sie unsichtbar macht", () => {
    render(<Canvas />, { wrapper });
    const flow = document.querySelector(".react-flow");
    expect(flow).not.toHaveClass("is-no-handles");
    setView({ handles: false });
    expect(flow).toHaveClass("is-no-handles");
  });

  it("Minimap: aus entfernt die Übersichtskarte", () => {
    render(<Canvas />, { wrapper });
    expect(screen.getByLabelText("Übersichtskarte")).toBeInTheDocument();
    setView({ minimap: false });
    expect(screen.queryByLabelText("Übersichtskarte")).toBeNull();
  });

  it("T-713b Kantenführung: Kurven zeichnen Bézier, Gebündelt rechtwinklige Wege", async () => {
    render(<Canvas />, { wrapper });
    const ds = () =>
      [...document.querySelectorAll(".react-flow__edge-path")].map(
        (p) => p.getAttribute("d") ?? "",
      );
    await waitFor(() => {
      expect(ds().length).toBeGreaterThan(0);
    });
    expect(ds().every((d) => d.includes(" C "))).toBe(true);
    setView({ route: "ortho" });
    await waitFor(() => {
      expect(
        ds().every((d) => !d.includes(" C ") && d.split(" L ").length === 4),
      ).toBe(true);
    });
  });

  it("T-713b Protokoll-Labels: Alle, Wichtige (ohne einfache Kabel und WLAN), Keine", async () => {
    render(<Canvas />, { wrapper });
    const count = () => document.querySelectorAll(".tiv-edge-label").length;
    await waitFor(() => {
      expect(count()).toBeGreaterThan(0);
    });
    const all = count();
    setView({ labels: "key" });
    await waitFor(() => {
      expect(count()).toBeLessThan(all);
    });
    expect(count()).toBeGreaterThan(0);
    setView({ labels: "none" });
    await waitFor(() => {
      expect(count()).toBe(0);
    });
  });
});
