import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "./App";

describe("App-Shell", () => {
  it("zeigt Überschrift, Bereiche und Impressum-Link", () => {
    render(<App />);
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
