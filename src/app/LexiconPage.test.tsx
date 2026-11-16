import { act, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { loadCatalog } from "../schema";
import { App } from "./App";

const catalog = loadCatalog();

afterEach(() => {
  location.hash = "";
});

describe("Lexikon-Seite (#188)", () => {
  it("der Link in der Kopfleiste führt zur Seite mit allen Einträgen", async () => {
    render(<App />);
    const link = screen.getByRole("link", { name: "Lexikon" });
    expect(link).toHaveAttribute("href", "#/lexikon");
    expect(screen.queryByRole("heading", { name: "Lexikon" })).toBeNull();
    act(() => {
      location.hash = "#/lexikon";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    const heading = await screen.findByRole("heading", { name: "Lexikon" });
    const page = heading.closest("main");
    if (!page) throw new Error("main fehlt");
    expect(within(page).getAllByRole("article")).toHaveLength(
      catalog.deviceTypes.length,
    );
    expect(page).toHaveTextContent("Typische Störung");
    expect(page).toHaveFocus();
  });

  it("Zurück zum Baukasten blendet die Seite wieder aus", async () => {
    location.hash = "#/lexikon";
    render(<App />);
    await screen.findByRole("heading", { name: "Lexikon" });
    act(() => {
      location.hash = "";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    await screen.findByRole("heading", { name: /Womit/ });
    expect(screen.queryByRole("heading", { name: "Lexikon" })).toBeNull();
  });
});
