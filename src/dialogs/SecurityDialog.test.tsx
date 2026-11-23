import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { runChecks } from "../engine/checks";
import { loadCatalog, type Topology } from "../schema";
import { useOpen, useSettings, useTopology, useUi } from "../store";
import { SecurityDialog } from "./SecurityDialog";

const catalog = loadCatalog();
const praxis = catalog.presets.find((p) => p.id === "praxis")?.topology;
if (!praxis) throw new Error("Preset praxis fehlt");

const load = (t: Topology) => {
  act(() => {
    useTopology.getState().replace(t);
    useUi.setState({ selection: undefined, dialog: "security" });
  });
};
const withNodeFault = (id: string): Topology => ({
  ...praxis,
  nodes: praxis.nodes.map((n) => (n.id === id ? { ...n, fault: true } : n)),
});
const withEdgeFault = (id: string): Topology => ({
  ...praxis,
  edges: praxis.edges.map((e) => (e.id === id ? { ...e, fault: true } : e)),
});

beforeEach(() => {
  useSettings.setState({ mode: "advanced" });
  useOpen.setState({ imported: undefined });
});

describe("SecurityDialog", () => {
  it("[P-1] Auswahl eines Befunds hebt das Gerät hervor, Schwere steht als Text", async () => {
    const id = praxis.nodes[0]?.id ?? "";
    load(withNodeFault(id));
    render(<SecurityDialog />);
    const dlg = screen.getByRole("dialog");
    expect(within(dlg).getAllByText(/^Fehler:/).length).toBeGreaterThan(0);
    const button = within(dlg).getAllByRole("button", {
      name: /^Auswählen: .*ausgefallen/,
    })[0];
    if (!button) throw new Error("Auswahl-Knopf fehlt");
    expect(button).toHaveTextContent(/^Auswählen$/);
    await userEvent.click(button);
    expect(useUi.getState().selection).toEqual({ kind: "node", id });
  });

  it("[P-2] Verbindungsbefund wählt ein Gerät am Ende der Verbindung", async () => {
    const e = praxis.edges[0];
    if (!e) throw new Error("Preset ohne Kante");
    load(withEdgeFault(e.id));
    render(<SecurityDialog />);
    const button = screen.getAllByRole("button", {
      name: /^Auswählen: .*unterbrochen/,
    })[0];
    if (!button) throw new Error("Auswahl-Knopf fehlt");
    expect(button).toHaveTextContent(/^Auswählen$/);
    expect(button.getAttribute("aria-label")).not.toContain(e.id);
    await userEvent.click(button);
    const sel = useUi.getState().selection;
    expect(sel?.kind).toBe("node");
    expect(e.ends.map((x) => x.node)).toContain(
      sel?.kind === "node" ? sel.id : "",
    );
  });

  it("[P-1] jede simulierte Geräte-Störung wird gefunden", () => {
    for (const n of praxis.nodes) {
      const hit = runChecks(withNodeFault(n.id), "advanced", catalog).find(
        (f) => f.id === "P-1" && f.nodes.includes(n.id),
      );
      expect(hit, n.id).toBeDefined();
    }
  });

  it("[P-2] jede simulierte Verbindungs-Störung wird gefunden", () => {
    for (const e of praxis.edges) {
      const hit = runChecks(withEdgeFault(e.id), "advanced", catalog).find(
        (f) => f.id === "P-2" && f.edges.includes(e.id),
      );
      expect(hit, e.id).toBeDefined();
    }
  });

  it("zeigt Importbefunde und Direktverbindungen nur im Modus Erweitert", () => {
    load(praxis);
    useOpen.setState({
      imported: {
        fileName: "alt.tiv.json",
        list: [
          { severity: "Warnung", code: "karte", message: "Karte entfernt" },
        ],
      },
    });
    const { rerender } = render(<SecurityDialog />);
    expect(screen.getByText(/Karte entfernt/)).toBeVisible();
    expect(screen.getByText("Vereinfachte Direktverbindungen")).toBeVisible();
    act(() => {
      useSettings.setState({ mode: "simple" });
    });
    rerender(<SecurityDialog />);
    expect(screen.queryByText("Vereinfachte Direktverbindungen")).toBeNull();
    expect(screen.getByText(/Karte entfernt/)).toBeVisible();
  });

  it("zeigt bei leerer Topologie keine Befunde", () => {
    load({ ...praxis, nodes: [], edges: [] });
    render(<SecurityDialog />);
    expect(screen.getByText("Keine Befunde.")).toBeVisible();
  });

  it("[P-1] gleiche Befunde an mehreren Geräten haben verschiedene Knopfnamen", () => {
    const [a, b] = praxis.nodes;
    if (!a || !b) throw new Error("Preset ohne zwei Geräte");
    load({
      ...praxis,
      nodes: praxis.nodes.map((n) =>
        n.id === a.id || n.id === b.id ? { ...n, fault: true } : n,
      ),
    });
    render(<SecurityDialog />);
    const names = screen
      .getAllByRole("button", { name: /^Auswählen: .*ausgefallen/ })
      .map((x) => x.getAttribute("aria-label"));
    expect(names.length).toBeGreaterThanOrEqual(2);
    expect(new Set(names).size).toBe(names.length);
  });

  it("Direktverbindung im Dialog wählt die Kante", async () => {
    load(praxis);
    render(<SecurityDialog />);
    const section = screen.getByRole("region", {
      name: "Vereinfachte Direktverbindungen",
    });
    const button = within(section).getAllByRole("button")[0];
    if (!button) throw new Error("Direktverbindung fehlt");
    await userEvent.click(button);
    expect(useUi.getState().selection?.kind).toBe("edge");
  });
});
