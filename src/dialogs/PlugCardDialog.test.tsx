import { ReactFlowProvider } from "@xyflow/react";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { Canvas } from "../canvas/Canvas";
import { DetailPanel } from "../panels/DetailPanel";
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

// Stecken und Ziehen laufen im Detailpanel (T-718), nicht am Gerät.
const plugButton = () => {
  act(() => {
    useUi.getState().select({ kind: "node", id: kt.id });
  });
  return screen.getByRole("button", { name: "Karte stecken" });
};
const nodeEl = () => {
  const el = document.querySelector<HTMLElement>(`[data-id="${kt.id}"]`);
  if (!el) throw new Error("Kartenterminal nicht gerendert");
  return within(el);
};
const app = (
  <ToastProvider>
    <ReactFlowProvider>
      <Canvas />
      <DetailPanel />
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
    await user.click(within(dlg).getByRole("radio", { name: /^HBA/ }));
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
    const arten = within(
      within(dlg).getByRole("group", { name: "Kartenart" }),
    ).getAllByRole<HTMLInputElement>("radio");
    expect(arten.map((r) => r.value)).toEqual(["hba", "smcb"]);
  });

  it("[K-2] meldet bei voller Kartenbelegung, dass alle Arten stecken", async () => {
    const user = userEvent.setup();
    for (const kind of ["egk", "hba", "smcb"] as const)
      useTopology.getState().plugCard(kt.id, { kind, expires: "2030-01-01" });
    useUi.getState().openDialog(`plugCard:${kt.id}`);
    render(app);
    const dlg = await screen.findByRole("dialog", { name: "Karte stecken" });
    await user.click(within(dlg).getByRole("button", { name: "Stecken" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Alle Kartenarten stecken bereits in diesem Terminal.",
    );
    expect(cardsOf()).toHaveLength(3);
  });

  it("[K-3] T-718 kennzeichnet abgelaufene Karten im Text", () => {
    useTopology
      .getState()
      .plugCard(kt.id, { kind: "egk", expires: "2026-01-01" });
    render(app);
    expect(nodeEl().getByText("eGK abgelaufen")).toBeInTheDocument();
  });

  it("[K-4] T-718 kennzeichnet nicht freigeschaltete HBA im Text", () => {
    useTopology
      .getState()
      .plugCard(kt.id, { kind: "hba", expires: "2030-01-01", unlocked: false });
    render(app);
    expect(nodeEl().getByText("HBA nicht freigeschaltet")).toBeInTheDocument();
  });

  it("T-718: Marke am Gerät zeigt nur den Kurznamen, keinen Weg und keinen Knopf", () => {
    useTopology
      .getState()
      .plugCard(kt.id, { kind: "egk", expires: "2030-01-01" });
    render(app);
    const node = nodeEl();
    expect(node.getByText("eGK")).toBeInTheDocument();
    expect(node.queryByText(/ISO 7816/)).toBeNull();
    expect(
      node.queryByRole("button", { name: /Karte stecken|ziehen/ }),
    ).toBeNull();
  });

  it("[K-6] NFC-Gerät: nur eGK, keine PIN-Auswahl, Karte ohne PIN", async () => {
    const user = userEvent.setup();
    const added = useTopology.getState().addNode("erpapp", { x: 0, y: 0 });
    if (!added.ok || !added.id) throw new Error("E-Rezept-App nicht angelegt");
    const target = { id: added.id };
    useUi.getState().openDialog(`plugCard:${target.id}`);
    render(app);
    const dlg = await screen.findByRole("dialog", { name: "Karte stecken" });
    const arten = within(
      within(dlg).getByRole("group", { name: "Kartenart" }),
    ).getAllByRole<HTMLInputElement>("radio");
    expect(arten.map((r) => r.value)).toEqual(["egk"]);
    expect(within(dlg).queryByRole("checkbox")).toBeNull();
    await user.click(within(dlg).getByRole("button", { name: "Stecken" }));
    const card = useTopology
      .getState()
      .topology.nodes.find((n) => n.id === target.id)?.cards?.[0];
    expect(card?.kind).toBe("egk");
    expect(card).toMatchObject({ pinActive: false });
  });

  // Leere Topologie mit TI-Gateway und den genannten Software-Knoten
  const gatewayMit = (...types: string[]) => {
    useTopology
      .getState()
      .reset({ ...praxis, nodes: [], edges: [], zones: [] });
    const ids = types.map((t) => {
      const r = useTopology.getState().addNode(t, { x: 0, y: 0 });
      if (!r.ok || !r.id) throw new Error("nicht angelegt");
      return r.id;
    });
    const gw = useTopology.getState().addNode("gateway", { x: 0, y: 0 });
    if (!gw.ok || !gw.id) throw new Error("Gateway nicht angelegt");
    return { software: ids, gateway: gw.id };
  };
  const cardOf = (id: string) =>
    useTopology.getState().topology.nodes.find((n) => n.id === id)?.cards?.[0];

  it("[K-10] TI-Gateway: nur HSM-B, Software-Auswahl statt PIN, Karte trägt die Software", async () => {
    const user = userEvent.setup();
    const { software, gateway } = gatewayMit("pvs", "kis");
    useUi.getState().openDialog(`plugCard:${gateway}`);
    render(app);
    const dlg = await screen.findByRole("dialog", { name: "Karte stecken" });
    const arten = within(
      within(dlg).getByRole("group", { name: "Kartenart" }),
    ).getAllByRole<HTMLInputElement>("radio");
    expect(arten.map((r) => r.value)).toEqual(["hsmb"]);
    expect(within(dlg).queryByRole("checkbox")).toBeNull();
    await user.click(within(dlg).getByRole("button", { name: "Stecken" }));
    expect(cardOf(gateway)).toMatchObject({
      kind: "hsmb",
      software: software[0],
    });
  });

  it("[K-10] die Auswahl nimmt eine andere Software, eine Option „keine“ gibt es nicht", async () => {
    const user = userEvent.setup();
    const { software, gateway } = gatewayMit("pvs", "kis");
    useUi.getState().openDialog(`plugCard:${gateway}`);
    render(app);
    const dlg = await screen.findByRole("dialog", { name: "Karte stecken" });
    await user.click(within(dlg).getByRole("combobox"));
    expect(screen.queryByRole("option", { name: "keine" })).toBeNull();
    await user.click(
      screen.getByRole("option", { name: /Krankenhausinformationssystem/ }),
    );
    await user.click(within(dlg).getByRole("button", { name: "Stecken" }));
    expect(cardOf(gateway)).toMatchObject({ software: software[1] });
  });

  it("[K-10] ohne Software im Netz ist Stecken nicht möglich", async () => {
    const { gateway } = gatewayMit();
    useUi.getState().openDialog(`plugCard:${gateway}`);
    render(app);
    const dlg = await screen.findByRole("dialog", { name: "Karte stecken" });
    expect(within(dlg).getByRole("alert")).toHaveTextContent(
      "Lege zuerst eine Software an",
    );
    expect(within(dlg).getByRole("button", { name: "Stecken" })).toBeDisabled();
  });

  it("[K-10] das Detailpanel zeigt das HSM-B mit Software, Ziehen entfernt es", async () => {
    const user = userEvent.setup();
    const { software, gateway } = gatewayMit("pvs");
    useTopology.getState().plugCard(gateway, {
      kind: "hsmb",
      expires: "2029-11-23",
      software: software[0] ?? "",
    });
    render(app);
    act(() => {
      useUi.getState().select({ kind: "node", id: gateway });
    });
    expect(
      screen.getByText(/im TI-Gateway · für Praxisverwaltungssystem/),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /HSM-B aus .* ziehen/ }),
    );
    expect(cardOf(gateway)).toBeUndefined();
  });
});
