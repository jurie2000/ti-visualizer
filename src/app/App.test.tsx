import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useTopology } from "../store";
import { App } from "./App";

describe("App-Shell", () => {
  it("zeigt Überschrift, Bereiche und Impressum-Link", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Leerer Start/ }));
    expect(
      screen.getByRole("heading", { level: 1, name: "TI Visualizer" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Palette")).toBeInTheDocument();
    expect(screen.getByLabelText("Canvas")).toBeInTheDocument();
    expect(screen.getByLabelText("Detailpanel")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Impressum" }),
    ).toBeInTheDocument();
  });

  it("zeigt die Startansicht mit vier Presets, öffnet eines und führt zurück", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    await user.click(screen.getByRole("button", { name: /Arztpraxis/ }));
    expect(useTopology.getState().topology.nodes.length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Canvas")).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Startansicht" }));
    expect(screen.getByRole("main")).toHaveFocus();
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    // Leerer Start ersetzt die Topologie
    await user.click(screen.getByRole("button", { name: /Leerer Start/ }));
    expect(useTopology.getState().topology.nodes).toHaveLength(0);
  });

  it("fragt in der Startansicht bei ungespeichertem Stand, bevor ein Preset ersetzt", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Leerer Start/ }));
    act(() => {
      useTopology.getState().addNode("switch", { x: 0, y: 0 });
    });
    await user.click(screen.getByRole("button", { name: "Startansicht" }));
    await user.click(screen.getByRole("button", { name: /Arztpraxis/ }));
    expect(await screen.findByText(/erst speichern\?/)).toBeVisible();
    expect(useTopology.getState().topology.nodes).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Verwerfen" }));
    expect(useTopology.getState().topology.nodes.length).toBeGreaterThan(1);
    expect(screen.getByLabelText("Canvas")).toBeInTheDocument();
  });

  it("öffnet das Impressum, schließt es mit Esc und gibt den Fokus zurück", async () => {
    const user = userEvent.setup();
    render(<App />);
    const link = screen.getByRole("button", { name: "Impressum" });
    await user.click(link);
    expect(
      screen.getByRole("dialog", { name: /Impressum/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Katalogversion/)).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(link).toHaveFocus();
  });

  it("setzt data-theme über den Theme-Schalter", async () => {
    const user = userEvent.setup();
    render(<App />);
    const root = document.documentElement;
    expect(root).not.toHaveAttribute("data-theme");
    await user.click(screen.getByRole("button", { name: "Dunkel" }));
    expect(root).toHaveAttribute("data-theme", "dark");
    await user.click(screen.getByRole("button", { name: "Hell" }));
    expect(root).toHaveAttribute("data-theme", "light");
    await user.click(screen.getByRole("button", { name: "System" }));
    expect(root).not.toHaveAttribute("data-theme");
  });
});
