import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShortcutsDialog } from "./ShortcutsDialog";

const ui = () =>
  render(
    <>
      <ShortcutsDialog />
      <input aria-label="Feld" />
    </>,
  );

describe("Tastaturkürzel (FR-22, D10, T-702)", () => {
  it("FR-22 der Button öffnet die Übersicht mit den Kürzeln aus T-508, Esc schließt", async () => {
    const user = userEvent.setup();
    ui();
    await user.click(screen.getByRole("button", { name: "Tastaturkürzel" }));
    const dialog = screen.getByRole("dialog", { name: "Tastaturkürzel" });
    for (const was of ["Gerät kopieren", "Kopie einfügen"])
      expect(dialog).toHaveTextContent(was);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Tastaturkürzel" })).toBeNull();
  });

  it("FR-22 ? öffnet die Übersicht, im Eingabefeld bleibt es ein Zeichen", async () => {
    const user = userEvent.setup();
    ui();
    await user.click(screen.getByLabelText("Feld"));
    await user.keyboard("?");
    expect(screen.getByLabelText("Feld")).toHaveValue("?");
    expect(screen.queryByRole("dialog", { name: "Tastaturkürzel" })).toBeNull();
    await user.click(document.body);
    await user.keyboard("?");
    expect(
      screen.getByRole("dialog", { name: "Tastaturkürzel" }),
    ).toBeInTheDocument();
  });
});
