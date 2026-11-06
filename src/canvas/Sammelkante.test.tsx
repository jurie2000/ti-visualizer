import { ReactFlowProvider } from "@xyflow/react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { loadCatalog } from "../schema";
import { useSettings, useTopology, useUi } from "../store";
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

beforeEach(() => {
  useSettings.setState({ mode: "simple" });
  useUi.setState({ selection: undefined });
  useTopology.getState().reset(praxis);
});

describe("Canvas im Modus Einfach (Regelwerk 11)", () => {
  it("blendet Geräte aus und zeigt Sammelkanten statt ihrer Verbindungen", async () => {
    render(<Canvas />, { wrapper });
    const hidden = loadCatalog()
      .deviceTypes.filter((d) => !d.visibleSimple)
      .map((d) => d.id);
    const shown = praxis.nodes.filter((n) => !hidden.includes(n.type));
    expect(document.querySelectorAll(".react-flow__node")).toHaveLength(
      shown.length,
    );
    expect(shown.length).toBeLessThan(praxis.nodes.length);
    await waitFor(() => {
      expect(
        screen.getAllByRole("button", { name: /^Sammelkante .* über / }).length,
      ).toBeGreaterThan(0);
    });
  });

  it("Klick auf die Sammelkante zeigt die ausgeblendeten Geräte, der Modus ändert die Topologie nicht", async () => {
    const user = userEvent.setup();
    const before = JSON.stringify(useTopology.getState().topology);
    render(<Canvas />, { wrapper });
    const buttons = await screen.findAllByRole("button", {
      name: /^Sammelkante .* über /,
    });
    const first = buttons[0];
    if (!first) throw new Error("Knopf fehlt");
    expect(first).toHaveAttribute("aria-expanded", "false");
    await user.click(first);
    expect(first).toHaveAttribute("aria-expanded", "true");
    const list = screen.getByRole("list", { name: "Ausgeblendete Geräte" });
    expect(within(list).getAllByRole("listitem").length).toBeGreaterThan(0);
    await user.click(first);
    expect(first).toHaveAttribute("aria-expanded", "false");
    expect(JSON.stringify(useTopology.getState().topology)).toBe(before);
  });

  it("im Modus Erweitert gibt es keine Sammelkanten", () => {
    useSettings.setState({ mode: "advanced" });
    render(<Canvas />, { wrapper });
    expect(document.querySelectorAll(".react-flow__node")).toHaveLength(
      praxis.nodes.length,
    );
    expect(screen.queryByRole("button", { name: /^Sammelkante/ })).toBeNull();
  });
});
