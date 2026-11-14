import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useTopology } from "../store";
import { App } from "./App";

describe("App-Shell", () => {
  it("zeigt Überschrift, Bereiche und Impressum-Link", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Leer starten/ }));
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
    await user.click(screen.getByRole("button", { name: /^Arztpraxis Dr/ }));
    expect(useTopology.getState().topology.nodes.length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Canvas")).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveFocus();
    await user.click(
      screen.getByRole("button", { name: "TI Visualizer, zur Startansicht" }),
    );
    expect(screen.getByRole("main")).toHaveFocus();
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    // Leer starten ersetzt die Topologie
    await user.click(screen.getByRole("button", { name: /Leer starten/ }));
    expect(useTopology.getState().topology.nodes).toHaveLength(0);
  });

  it("Issue #151: Startfelder in der Reihenfolge Öffnen, Tutorial, Fortgeschritten; Öffnen-Feld öffnet den Dialog; keine Herausforderungen", async () => {
    const user = userEvent.setup();
    render(<App />);
    const modes = [...document.querySelectorAll(".tiv-mode__kicker")].map(
      (e) => e.textContent,
    );
    expect(modes).toEqual([
      "Datei · Öffnen",
      "Tutorial · Einsteiger",
      "Tutorial · Fortgeschritten",
    ]);
    expect(screen.queryByText(/Herausforderungen/)).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /Topologie aus Datei öffnen/ }),
    );
    expect(screen.getByLabelText("Datei auswählen")).toBeInTheDocument();
    await user.keyboard("{Escape}");
  });

  it("fragt in der Startansicht bei ungespeichertem Stand, bevor ein Preset ersetzt", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Leer starten/ }));
    act(() => {
      useTopology.getState().addNode("switch", { x: 0, y: 0 });
    });
    await user.click(
      screen.getByRole("button", { name: "TI Visualizer, zur Startansicht" }),
    );
    await user.click(screen.getByRole("button", { name: /^Arztpraxis Dr/ }));
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
    expect(screen.queryByRole("button", { name: "System" })).toBeNull();
    expect(root).toHaveAttribute("data-theme", "light");
    await user.click(screen.getByRole("button", { name: "Dunkel" }));
    expect(root).toHaveAttribute("data-theme", "dark");
    await user.click(screen.getByRole("button", { name: "Hell" }));
    expect(root).toHaveAttribute("data-theme", "light");
  });

  it("T-703 Überlagerungen: Knöpfe öffnen, Fokus, Escape schließt nur aus der Überlagerung", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Leer starten/ }));
    const palette = screen.getByLabelText("Palette");
    const knopf = screen.getByRole("button", { name: "Palette" });
    expect(palette).toHaveAttribute("data-open", "false");
    await user.click(knopf);
    expect(knopf).toHaveAttribute("aria-expanded", "true");
    expect(palette).toHaveAttribute("data-open", "true");
    expect(palette).toHaveFocus();
    // Escape von außerhalb (z. B. Canvas, Dialog) lässt sie offen
    screen
      .getByLabelText("Canvas")
      .dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    expect(palette).toHaveAttribute("data-open", "true");
    await user.keyboard("{Escape}");
    expect(palette).toHaveAttribute("data-open", "false");
    expect(knopf).toHaveFocus();
    // Details und Umschalten
    const details = screen.getByRole("button", { name: "Details" });
    await user.click(details);
    expect(screen.getByLabelText("Detailpanel")).toHaveAttribute(
      "data-open",
      "true",
    );
    await user.click(details);
    expect(screen.getByLabelText("Detailpanel")).toHaveAttribute(
      "data-open",
      "false",
    );
  });

  it("T-703 Hinzufügen aus der Palette schließt die Überlagerung", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Leer starten/ }));
    await user.click(screen.getByRole("button", { name: "Palette" }));
    await user.click(
      screen.getAllByRole("button", { name: / hinzufügen$/ })[0] as HTMLElement,
    );
    expect(screen.getByLabelText("Palette")).toHaveAttribute(
      "data-open",
      "false",
    );
  });

  it("T-703 Hinweis für kleine Bildschirme ist als Notiz vorhanden", () => {
    render(<App />);
    expect(screen.getByRole("note")).toHaveTextContent(
      "für größere Bildschirme gedacht",
    );
  });
});
