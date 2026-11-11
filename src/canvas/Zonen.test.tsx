import { ReactFlowProvider } from "@xyflow/react";
import { act, render, screen } from "@testing-library/react";
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
});
