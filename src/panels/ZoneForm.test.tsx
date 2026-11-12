import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { IDLE } from "../engine/simulation";
import { emptyTopology, useSim, useTopology, useUi } from "../store";
import { DetailPanel } from "./DetailPanel";

const zones = () => useTopology.getState().topology.zones;

beforeEach(() => {
  useTopology.getState().reset(emptyTopology());
  useSim.setState({ sim: IDLE });
  const r = useTopology.getState().addZone({ x: 0, y: 0, w: 300, h: 200 });
  act(() => {
    useUi.getState().select({ kind: "zone", id: r.ok ? (r.id ?? "") : "" });
  });
});

describe("FR-15 Zone bearbeiten im Detailpanel", () => {
  it("benennt eine Zone, Text bleibt Text und Steuerzeichen fallen weg", async () => {
    const user = userEvent.setup();
    render(<DetailPanel />);
    await user.type(screen.getByLabelText("Name"), "<b>Praxis</b>‎{Enter}");
    expect(zones()[0]?.label).toBe("<b>Praxis</b>");
    expect(
      screen.getByRole("heading", { name: "<b>Praxis</b>" }),
    ).toBeInTheDocument();
    expect(document.querySelector("h3 b")).toBeNull();
  });

  it("zeigt zu lange Namen als Fehler und behält den alten Namen", async () => {
    const user = userEvent.setup();
    render(<DetailPanel />);
    await user.click(screen.getByLabelText("Name"));
    await user.paste("x".repeat(101));
    await user.tab();
    expect(await screen.findByRole("alert")).toHaveTextContent("höchstens 100");
    expect(zones()[0]).not.toHaveProperty("label");
  });

  it("färbt per Auswahl der festen Töne", async () => {
    const user = userEvent.setup();
    render(<DetailPanel />);
    expect(screen.getAllByRole("radio")).toHaveLength(7);
    await user.click(screen.getByRole("radio", { name: "Akzent" }));
    expect(zones()[0]?.tone).toBe("accent");
  });

  it("T-712e: jedes Farbfeld trägt Punkt und Namen (nie nur Farbe) und bleibt Radioknopf im Segment", () => {
    const { container } = render(<DetailPanel />);
    const options = container.querySelectorAll(".tiv-seg label[data-tone]");
    expect([...options].map((o) => o.textContent.trim())).toEqual([
      "Salbei",
      "Akzent",
      "Neutral",
    ]);
    expect(container.querySelectorAll(".tiv-seg .tiv-dot")).toHaveLength(3);
  });

  it("T-715: Form als Segment Rechteck/Ellipse, Standard Rechteck, keine Zahlenfelder", async () => {
    const user = userEvent.setup();
    render(<DetailPanel />);
    expect(screen.getByRole("radio", { name: "Rechteck" })).toBeChecked();
    expect(screen.queryByLabelText("Breite")).toBeNull();
    expect(screen.queryByLabelText("Höhe")).toBeNull();
    await user.click(screen.getByRole("radio", { name: "Ellipse" }));
    expect(zones()[0]?.shape).toBe("ellipse");
    expect(screen.getByRole("radio", { name: "Ellipse" })).toBeChecked();
  });

  it("T-715: Beim Verschieben ist ein Segment, Standard nur Zone, wählbar je Zone", async () => {
    const user = userEvent.setup();
    render(<DetailPanel />);
    const group = screen.getByRole("group", { name: "Beim Verschieben" });
    expect(screen.getByRole("radio", { name: "Nur Zone" })).toBeChecked();
    expect(group.querySelector(".tiv-seg")).not.toBeNull();
    await user.click(screen.getByRole("radio", { name: "Zone mit Elementen" }));
    expect(zones()[0]?.withContents).toBe(true);
    expect(
      screen.getByRole("radio", { name: "Zone mit Elementen" }),
    ).toBeChecked();
  });

  it("T-715: listet die Geräte in der Zone (Ellipse zählt das Rechteck), Klick wählt das Gerät", async () => {
    const user = userEvent.setup();
    useTopology.getState().setZone(zones()[0]?.id ?? "", { shape: "ellipse" });
    useTopology.getState().addNode("pc", { x: 20, y: 20 });
    useTopology.getState().addNode("pc", { x: 900, y: 20 });
    render(<DetailPanel />);
    const box = within(
      screen.getByRole("region", { name: "Geräte in der Zone" }),
    );
    expect(box.getAllByRole("button")).toHaveLength(1);
    await user.click(box.getByRole("button"));
    expect(useUi.getState().selection).toMatchObject({ kind: "node" });
  });

  it("T-715: eine leere Zone zeigt „keine“", () => {
    render(<DetailPanel />);
    expect(
      within(
        screen.getByRole("region", { name: "Geräte in der Zone" }),
      ).getByText("keine"),
    ).toBeInTheDocument();
  });

  it("entfernt die Zone, hebt die Auswahl auf und ist rückgängig machbar", async () => {
    const user = userEvent.setup();
    render(<DetailPanel />);
    await user.click(screen.getByRole("button", { name: "Zone entfernen" }));
    expect(zones()).toEqual([]);
    expect(useUi.getState().selection).toBeUndefined();
    act(() => {
      useTopology.getState().undo();
    });
    expect(zones()).toHaveLength(1);
  });

  it("sperrt die Eingaben während der Simulation", () => {
    useSim.setState({ sim: { ...IDLE, status: "running" } });
    render(<DetailPanel />);
    expect(screen.getByLabelText("Name")).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Zone entfernen" }),
    ).toBeDisabled();
  });
});
