import { act, render, screen } from "@testing-library/react";
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
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    await user.click(screen.getByRole("radio", { name: "Akzent" }));
    expect(zones()[0]?.tone).toBe("accent");
  });

  it("ändert die Größe und lehnt Unsinn ab", async () => {
    const user = userEvent.setup();
    render(<DetailPanel />);
    const w = screen.getByLabelText("Breite");
    await user.clear(w);
    await user.type(w, "500{Enter}");
    expect(zones()[0]?.area.w).toBe(500);
    await user.clear(w);
    await user.type(w, "abc{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent("ganze Zahl");
    expect(zones()[0]?.area.w).toBe(500);
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
