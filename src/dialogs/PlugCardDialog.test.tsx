import { ReactFlowProvider } from "@xyflow/react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { Canvas } from "../canvas/Canvas";
import { loadCatalog } from "../schema";
import { useSettings, useTopology, useUi } from "../store";
import { ToastProvider } from "../ui/Toast";
import { PlugCardDialog } from "./PlugCardDialog";

const praxis = (() => {
  const preset = loadCatalog().presets.find((p) => p.id === "praxis");
  if (!preset) throw new Error("Preset praxis fehlt");
  return preset.topology;
})();
const kt = praxis.nodes.find((n) => n.type === "kt");
if (!kt) throw new Error("Kartenterminal fehlt im Preset");

const plugButton = () => {
  const el = document.querySelector<HTMLElement>(`[data-id="${kt.id}"]`);
  if (!el) throw new Error("Kartenterminal nicht gerendert");
  return within(el).getByRole("button", { name: /^Karte stecken/ });
};
const app = (
  <ToastProvider>
    <ReactFlowProvider>
      <Canvas />
    </ReactFlowProvider>
    <PlugCardDialog />
  </ToastProvider>
);
const cardsOf = () =>
  useTopology.getState().topology.nodes.find((n) => n.id === kt.id)?.cards ??
  [];

beforeEach(() => {
  useSettings.setState({ mode: "advanced" });
  useUi.setState({ selection: undefined, dialog: undefined });
  useTopology.getState().reset({
    ...praxis,
    simDate: "2026-11-01",
    nodes: praxis.nodes.map((n) => (n.id === kt.id ? { ...n, cards: [] } : n)),
  });
});

describe("Karten stecken und ziehen", () => {
  it("[K-2] steckt eine Karte über den Dialog und zieht sie wieder", async () => {
    const user = userEvent.setup();
    render(app);
    await user.click(plugButton());
    const dlg = await screen.findByRole("dialog", { name: "Karte stecken" });
    await user.selectOptions(within(dlg).getByLabelText("Kartenart"), "hba");
    await user.click(within(dlg).getByRole("button", { name: "Stecken" }));
    expect(cardsOf().map((c) => c.kind)).toEqual(["hba"]);
    expect(screen.getByText(/HBA · gesteckt · ISO 7816/)).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /^HBA aus .+ ziehen$/ }),
    );
    expect(cardsOf()).toEqual([]);
  });

  it("[K-2] bietet nur fehlende Kartenarten an", async () => {
    const user = userEvent.setup();
    useTopology
      .getState()
      .plugCard(kt.id, { kind: "egk", expires: "2030-01-01" });
    render(app);
    await user.click(plugButton());
    const dlg = await screen.findByRole("dialog", { name: "Karte stecken" });
    const options = within(
      within(dlg).getByLabelText("Kartenart"),
    ).getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["HBA", "SMC-B"]);
  });

  it("[K-2] meldet bei voller Kartenbelegung, dass alle Arten stecken", async () => {
    const user = userEvent.setup();
    for (const kind of ["egk", "hba", "smcb"] as const)
      useTopology.getState().plugCard(kt.id, { kind, expires: "2030-01-01" });
    render(app);
    await user.click(plugButton());
    const dlg = await screen.findByRole("dialog", { name: "Karte stecken" });
    await user.click(within(dlg).getByRole("button", { name: "Stecken" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Alle Kartenarten stecken bereits in diesem Terminal.",
    );
    expect(cardsOf()).toHaveLength(3);
  });

  it("[K-3] kennzeichnet abgelaufene Karten im Text", () => {
    useTopology
      .getState()
      .plugCard(kt.id, { kind: "egk", expires: "2026-01-01" });
    render(app);
    expect(screen.getByText(/eGK \(abgelaufen\)/)).toBeInTheDocument();
  });

  it("[K-4] kennzeichnet nicht freigeschaltete HBA im Text", () => {
    useTopology
      .getState()
      .plugCard(kt.id, { kind: "hba", expires: "2030-01-01", unlocked: false });
    render(app);
    expect(
      screen.getByText(/HBA \(nicht freigeschaltet\)/),
    ).toBeInTheDocument();
  });

  it("[K-6] NFC-Gerät: nur eGK, keine PIN-Auswahl, pinActive bleibt ungesetzt", async () => {
    const user = userEvent.setup();
    const added = useTopology.getState().addNode("erpapp", { x: 0, y: 0 });
    if (!added.ok || !added.id) throw new Error("E-Rezept-App nicht angelegt");
    const target = { id: added.id };
    useUi.getState().openDialog(`plugCard:${target.id}`);
    render(app);
    const dlg = await screen.findByRole("dialog", { name: "Karte stecken" });
    const options = within(
      within(dlg).getByLabelText("Kartenart"),
    ).getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["eGK"]);
    expect(within(dlg).queryByRole("checkbox")).toBeNull();
    await user.click(within(dlg).getByRole("button", { name: "Stecken" }));
    const card = useTopology
      .getState()
      .topology.nodes.find((n) => n.id === target.id)?.cards?.[0];
    expect(card?.kind).toBe("egk");
    expect(card).not.toHaveProperty("pinActive");
  });
});
