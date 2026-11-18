import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { loadCatalog } from "../schema";
import { App } from "./App";

const catalog = loadCatalog();

const go = (hash: string) => {
  act(() => {
    location.hash = hash;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
};
const open = async (hash = "#/lexikon") => {
  render(<App />);
  go(hash);
  await screen.findByRole("heading", { name: "TI-Lexikon" });
};

afterEach(() => {
  location.hash = "";
});

describe("Lexikon-Seite (#188)", () => {
  it("der Link in der Kopfleiste führt zur Seite, Konnektor ist vorgewählt", async () => {
    render(<App />);
    expect(screen.getByRole("link", { name: "Lexikon" })).toHaveAttribute(
      "href",
      "#/lexikon",
    );
    expect(screen.queryByRole("heading", { name: "TI-Lexikon" })).toBeNull();
    go("#/lexikon");
    const heading = await screen.findByRole("heading", { name: "TI-Lexikon" });
    const page = heading.closest("main");
    expect(page).toHaveFocus();
    expect(screen.queryByRole("link", { name: "Lexikon" })).toBeNull();
    expect(screen.getByRole("link", { name: "Baukasten" })).toHaveAttribute(
      "href",
      "#/",
    );
    expect(
      screen.getByRole("heading", { level: 3, name: "Konnektor" }),
    ).toBeVisible();
    expect(
      within(screen.getByRole("region", { name: "Begriffe" })).getAllByRole(
        "button",
      ),
    ).toHaveLength(catalog.deviceTypes.length);
  });

  it("#/lexikon/<id> wählt den Eintrag, ein Verweis springt zum anderen", async () => {
    const user = userEvent.setup();
    await open("#/lexikon/kis");
    expect(
      screen.getByRole("heading", { level: 3, name: /Krankenhausinformation/ }),
    ).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: /→ Praxisverwaltung/ }),
    );
    expect(location.hash).toBe("#/lexikon/pvs");
  });

  it("Suche und Kategorien filtern die Liste samt Zähler", async () => {
    const user = userEvent.setup();
    await open();
    await user.type(screen.getByLabelText("Begriff suchen"), "smc-b");
    const list = screen.getByRole("region", { name: "Begriffe" });
    expect(within(list).getAllByRole("button").length).toBeGreaterThan(0);
    expect(within(list).queryByText("Server")).toBeNull();
    await user.clear(screen.getByLabelText("Begriff suchen"));
    await user.type(screen.getByLabelText("Begriff suchen"), "zzzz");
    expect(screen.getByText("Kein Begriff passt zu „zzzz“.")).toBeVisible();
    await user.clear(screen.getByLabelText("Begriff suchen"));
    await user.click(screen.getByRole("button", { name: /^Smartcards/ }));
    expect(
      within(screen.getByRole("region", { name: "Begriffe" })).getAllByRole(
        "button",
      ),
    ).toHaveLength(3);
  });

  it("zeigt das Abkürzungsglossar als Tabelle", async () => {
    const user = userEvent.setup();
    await open();
    await user.click(
      screen.getByRole("button", { name: /^Abkürzungsglossar/ }),
    );
    expect(screen.getAllByRole("row")).toHaveLength(
      catalog.glossary.length + 1,
    );
  });

  it("der Link „Baukasten“ blendet die Seite wieder aus und heißt wieder „Lexikon“", async () => {
    await open();
    go("");
    await screen.findByRole("heading", { name: /Womit/ });
    expect(screen.queryByRole("heading", { name: "TI-Lexikon" })).toBeNull();
    expect(screen.getByRole("link", { name: "Lexikon" })).toBeVisible();
  });
});
