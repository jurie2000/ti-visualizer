import { ReactFlowProvider } from "@xyflow/react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { IDLE } from "../engine/simulation";
import { emptyTopology, useSim, useTopology } from "../store";
import { ToastProvider } from "../ui/Toast";
import { Canvas } from "./Canvas";

const wrapper = ({ children }: { children: ReactNode }) => (
  <ToastProvider>
    <ReactFlowProvider>{children}</ReactFlowProvider>
  </ToastProvider>
);
const s = () => useTopology.getState();
const zurueck = () =>
  screen.getByRole("button", { name: "Einen Schritt zurück" });
const vor = () => screen.getByRole("button", { name: "Einen Schritt vor" });

describe("#173 Rückgängig-Leiste", () => {
  beforeEach(() => {
    useSim.setState({ sim: IDLE });
    s().reset(emptyTopology());
  });

  it("U-2: ohne Schritte sind beide Knöpfe deaktiviert", () => {
    render(<Canvas />, { wrapper });
    expect(zurueck()).toBeDisabled();
    expect(vor()).toBeDisabled();
  });

  it("U-1/U-2: zurück und vor gehen Schritt für Schritt", async () => {
    const user = userEvent.setup();
    render(<Canvas />, { wrapper });
    s().addNode("pc", { x: 40, y: 60 });
    s().addNode("pc", { x: 200, y: 60 });
    expect(
      await screen.findByRole("button", { name: "Einen Schritt zurück" }),
    ).toBeEnabled();
    await user.click(zurueck());
    expect(s().topology.nodes).toHaveLength(1);
    expect(vor()).toBeEnabled();
    await user.click(zurueck());
    expect(s().topology.nodes).toHaveLength(0);
    expect(zurueck()).toBeDisabled();
    await user.click(vor());
    expect(s().topology.nodes).toHaveLength(1);
  });

  it("U-1: der Titel klappt die Knöpfe per Klick auf und zu", async () => {
    const user = userEvent.setup();
    render(<Canvas />, { wrapper });
    const titel = screen.getByRole("button", { name: "Rückgängig" });
    expect(titel).toHaveAttribute("aria-expanded", "false");
    await user.click(titel);
    expect(titel).toHaveAttribute("aria-expanded", "true");
  });
});
