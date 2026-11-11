import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { loadCatalog, type Topology } from "../schema";
import { useFile, useSettings, useSim, useTopology, useUi } from "../store";
import { ToastProvider } from "../ui/Toast";
import { TopologyList } from "./TopologyList";

const topology: Topology = {
  name: "t",
  description: "",
  simDate: "2026-11-01",
  zones: [],
  nodes: [
    { id: "pvs1", type: "pvs", position: { x: 0, y: 0 }, fault: false },
    { id: "ris1", type: "ris", position: { x: 0, y: 0 }, fault: true },
    {
      id: "kt1",
      type: "kt",
      position: { x: 0, y: 0 },
      fault: false,
      cards: [{ kind: "egk", expires: "2020-01-01", pinActive: true }],
    },
  ],
  edges: [
    {
      id: "e1",
      fault: false,
      ends: [
        { node: "pvs1", port: "lan" },
        { node: "ris1", port: "lan" },
      ],
    },
  ],
};

const renderList = () =>
  render(
    <ToastProvider>
      <TopologyList />
    </ToastProvider>,
  );
const row = (name: RegExp) => {
  const r = screen.getByRole("rowheader", { name }).closest("tr");
  if (!r) throw new Error("Zeile fehlt");
  return within(r);
};

beforeEach(() => {
  useSettings.setState({ mode: "advanced" });
  useUi.setState({ listView: false, dialog: undefined });
  useSim.getState().close();
  useTopology.getState().reset(topology);
  // Ohne Datei und ohne Änderung gilt der Stand als gespeichert (keine Rückfrage)
  useFile.getState().markSaved(useTopology.getState().topology, null);
});

describe("Listenansicht (FR-22)", () => {
  it("zeigt Geräte mit Kategorie, Karten, Zustand und Verbindungen als Tabelle", () => {
    renderList();
    expect(
      screen.getByRole("table", { name: /Geräte und Verbindungen/ }),
    ).toBeInTheDocument();
    const pvs = row(/^Praxisverwaltungssystem/);
    expect(pvs.getAllByRole("cell")[0]).toHaveTextContent("Primärsystem");
    expect(pvs.getByText(/Verbindung .* zu .*/)).toBeInTheDocument();
    expect(
      screen.getByRole("rowheader", { name: /\(gestört\)/ }),
    ).toBeInTheDocument();
    expect(row(/Kartenterminal/).getByText("eGK (abgelaufen)")).toBeVisible();
  });

  it("zeigt leere Topologie als Hinweis statt als leere Tabelle", () => {
    useTopology.getState().reset({ ...topology, nodes: [], edges: [] });
    renderList();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByText(/noch keine Geräte/)).toBeInTheDocument();
  });

  it("zeigt im Modus Einfach nur sichtbare Geräte", () => {
    useSettings.setState({ mode: "simple" });
    renderList();
    expect(screen.queryByRole("rowheader", { name: /gestört/ })).toBeNull();
    expect(screen.getAllByRole("rowheader")).toHaveLength(2);
  });

  it("nennt im Modus Einfach Sackgassen- und Inselgeräte (Regelwerk 11)", () => {
    useSettings.setState({ mode: "simple" });
    useTopology.getState().reset({
      ...topology,
      nodes: [
        ...topology.nodes,
        { id: "lis1", type: "lis", position: { x: 0, y: 0 }, fault: false },
      ],
    });
    renderList();
    // ris1 hängt als Sackgasse am PVS, lis1 hat keinen sichtbaren Nachbarn
    expect(
      row(/^Praxisverwaltungssystem/).getByText(/^Ausgeblendet: Radiologie/),
    ).toBeVisible();
    expect(
      screen.getByText(/Nur im Modus Erweitert sichtbar: Labor/),
    ).toBeVisible();
  });

  it("startet eine Aktion über das Menü und gibt den Fokus an den Knopf zurück", async () => {
    const user = userEvent.setup();
    const praxis = loadCatalog().presets.find((p) => p.id === "praxis");
    if (!praxis) throw new Error("Preset fehlt");
    useTopology.getState().reset(praxis.topology);
    renderList();
    const button = screen.getByRole("button", {
      name: "Aktionen: Praxisverwaltungssystem",
    });
    await user.click(button);
    const menu = screen.getByRole("menu");
    await user.click(
      within(menu).getByRole("menuitem", { name: /^E-Rezept ausstellen/ }),
    );
    const player = screen.getByRole("group", { name: /^Simulation/ });
    expect(player).toBeVisible();
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Schließen" }));
    expect(button).toHaveFocus();
  });

  it("trennt eine Verbindung über ihr Menü", async () => {
    const user = userEvent.setup();
    renderList();
    await user.click(
      row(/^Praxisverwaltungssystem/).getByRole("button", {
        name: /^Aktionen: Verbindung/,
      }),
    );
    await user.click(
      screen.getByRole("menuitem", { name: "Verbindung trennen" }),
    );
    expect(useTopology.getState().topology.edges[0]?.fault).toBe(true);
  });

  it("öffnet die Sicherheitsprüfung", async () => {
    const user = userEvent.setup();
    renderList();
    await user.click(
      screen.getByRole("button", { name: "Sicherheitsprüfung" }),
    );
    expect(useUi.getState().dialog).toBe("security");
  });
});
