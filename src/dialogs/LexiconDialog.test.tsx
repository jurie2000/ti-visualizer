import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { loadCatalog } from "../schema";
import { useUi } from "../store";
import { LexiconDialog } from "./LexiconDialog";

const catalog = loadCatalog();

describe("Lexikon (#188)", () => {
  it("zeigt zu jedem Gerätetyp einen Eintrag samt Quelle, Esc schließt", async () => {
    const user = userEvent.setup();
    render(<LexiconDialog />);
    expect(screen.queryByRole("dialog", { name: "Lexikon" })).toBeNull();
    act(() => {
      useUi.getState().openDialog("lexicon");
    });
    const dialog = screen.getByRole("dialog", { name: "Lexikon" });
    expect(within(dialog).getAllByRole("article")).toHaveLength(
      catalog.deviceTypes.length,
    );
    expect(dialog).toHaveTextContent("Typische Störung");
    expect(
      within(dialog).getAllByRole("link", { name: /gematik/i }).length,
    ).toBeGreaterThan(0);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Lexikon" })).toBeNull();
  });
});
