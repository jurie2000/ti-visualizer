import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ContextMenu, type MenuEntry } from "./ContextMenu";

const entry = (id: string, group?: string, disabledReason?: string) => ({
  id,
  label: id,
  ...(group && { group }),
  ...(disabledReason && { disabledReason }),
  onSelect: vi.fn(),
});

const open = (entries: MenuEntry[], x = 0, y = 0) =>
  render(
    <ContextMenu
      x={x}
      y={y}
      title="Gerät"
      entries={entries}
      onClose={vi.fn()}
    />,
  );

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ContextMenu: Gruppen (#217)", () => {
  it("führt Kategorien in Reihenfolge des ersten Auftretens zusammen, ungruppierte Einträge bleiben davor und danach", () => {
    open([
      entry("Details"),
      entry("A1", "A"),
      entry("B1", "B"),
      entry("A2", "A"),
      entry("Ausfall"),
    ]);
    const menu = screen.getByRole("menu");
    const groups = within(menu).getAllByRole("group");
    expect(groups.map((g) => g.getAttribute("aria-label"))).toEqual(["A", "B"]);
    expect(
      within(groups[0] as HTMLElement)
        .getAllByRole("menuitem")
        .map((i) => i.textContent),
    ).toEqual(["A1", "A2"]);
    expect(
      within(menu)
        .getAllByRole("menuitem")
        .map((i) => i.textContent),
    ).toEqual(["A1", "A2", "B1", "Ausfall"]);
  });

  it("verliert keinen ungruppierten Eintrag zwischen gruppierten", () => {
    open([entry("A1", "A"), entry("X"), entry("B1", "B")]);
    expect(
      within(screen.getByRole("menu"))
        .getAllByRole("menuitem")
        .map((i) => i.textContent),
    ).toEqual(["A1", "B1", "X"]);
  });

  it("ohne Gruppen: schmales Menü ohne Spalten", () => {
    open([entry("Details"), entry("Ausfall")]);
    expect(screen.queryByRole("group")).toBeNull();
    expect(screen.getByRole("menu")).not.toHaveClass("tiv-menu--wide");
  });

  it("gesperrter Eintrag in einer Gruppe: aria-disabled, ohne Wirkung", async () => {
    const gesperrt = entry("A1", "A", "Kein Zugang.");
    open([gesperrt]);
    const item = screen.getByRole("menuitem", { name: /A1/ });
    expect(item).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(item);
    expect(gesperrt.onSelect).not.toHaveBeenCalled();
  });

  it("Pfeiltaste springt über Gruppengrenzen", async () => {
    open([entry("A1", "A"), entry("B1", "B")]);
    expect(screen.getByRole("menuitem", { name: "A1" })).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "B1" })).toHaveFocus();
  });

  it("Menü mit Kategorien ist ein mittiges Fenster mit Titel, ohne Zeigerposition", () => {
    open([entry("A1", "A")], 50, 60);
    const menu = screen.getByRole("menu", { name: "Gerät" });
    expect(menu.style.left).toBe("");
    expect(menu.style.top).toBe("");
    expect(menu.querySelector(".tiv-menu__title")?.textContent).toBe(
      "Gerät1 von 1 Aktionen verfügbar",
    );
  });

  it("zählt verfügbare Aktionen und trennt Online- von lokalen Aktionen in Spalten", () => {
    open([
      entry("Details"),
      { ...entry("L1", "Notfalldaten"), section: "lokal" as const },
      entry("O1", "KIM", "KIM-Clientmodul fehlt."),
      entry("O2", "KIM"),
    ]);
    const menu = screen.getByRole("menu");
    expect(menu).toHaveTextContent("2 von 3 Aktionen verfügbar");
    const cols = menu.querySelectorAll<HTMLElement>(".tiv-menu__col");
    expect(
      Array.from(cols).map((c) => c.querySelector("div")?.textContent),
    ).toEqual(["Online · über TI", "Lokal · eGK & TI 2.0"]);
    expect(
      within(cols[0] as HTMLElement).getAllByRole("menuitem"),
    ).toHaveLength(2);
    expect(
      within(cols[1] as HTMLElement).getByRole("menuitem"),
    ).toHaveTextContent("L1");
  });

  it("Fenster hat ein Schließen-Kreuz statt des Details-Knopfs", async () => {
    const onClose = vi.fn();
    render(
      <ContextMenu
        x={0}
        y={0}
        title="Gerät"
        entries={[entry("Details"), entry("A1", "A")]}
        onClose={onClose}
      />,
    );
    expect(screen.queryByRole("menuitem", { name: "Details" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Schließen" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("hält das schmale Menü im Fenster", () => {
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(400);
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(300);
    open([entry("A1")], 5000, 5000);
    const menu = screen.getByRole("menu");
    expect(menu.style.left).toBe(`${String(window.innerWidth - 400)}px`);
    expect(menu.style.top).toBe(`${String(window.innerHeight - 300)}px`);
  });
});
