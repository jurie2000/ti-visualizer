import { ReactFlowProvider } from "@xyflow/react";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { Canvas } from "../canvas/Canvas";
import { DetailPanel } from "../panels/DetailPanel";
import { loadCatalog } from "../schema";
import { useSettings, useTopology, useUi } from "../store";
import { ToastProvider } from "../ui/Toast";

const praxis = (() => {
  const preset = loadCatalog().presets.find((p) => p.id === "praxis");
  if (!preset) throw new Error("Preset praxis fehlt");
  return preset.topology;
})();

const app = (
  <ToastProvider>
    <ReactFlowProvider>
      <Canvas />
    </ReactFlowProvider>
  </ToastProvider>
);

const add = (type: string) => {
  const r = useTopology.getState().addNode(type, { x: 0, y: 0 });
  return r.ok ? (r.id ?? "") : "";
};
const node = (id: string) => {
  const el = document.querySelector<HTMLElement>(`[data-id="${id}"]`);
  if (!el) throw new Error(`Gerät ${id} fehlt`);
  return el;
};

let sw2 = "";
beforeEach(() => {
  useSettings.setState({ mode: "advanced" });
  useUi.setState({ selection: undefined, dialog: undefined });
  useTopology.getState().reset(praxis);
  sw2 = add("switch");
});

/** Verbinden per Tastatur: V an der Quelle, V am Ziel. */
async function verbinden(user: ReturnType<typeof userEvent.setup>) {
  node("sw1").focus();
  await user.keyboard("v");
  node(sw2).focus();
  await user.keyboard("v");
}

describe("PortPicker", () => {
  it("[A-3] Erweitert: der Nutzer wählt den Anschluss, vorbelegt ist der erste freie", async () => {
    const user = userEvent.setup();
    render(app);
    await verbinden(user);
    const dialog = screen.getByRole("dialog", { name: "Anschlüsse wählen" });
    const [first] = within(dialog).getAllByRole("radio", { name: /^Port 5/ });
    expect(first).toBeChecked();
    const [p7] = within(dialog).getAllByRole("radio", { name: /^Port 7/ });
    if (!p7) throw new Error("Port 7 fehlt");
    await user.click(p7);
    await user.click(within(dialog).getByRole("button", { name: "Verbinden" }));
    const edge = useTopology.getState().topology.edges.at(-1);
    expect(edge?.ends[0]).toEqual({ node: "sw1", port: "p7" });
  });

  it("[A-3] Klick auf einen freien Anschluss im Detailpanel startet das Verbinden, der Anschluss ist vorgewählt", async () => {
    const user = userEvent.setup();
    render(
      <>
        {app}
        <ReactFlowProvider>
          <DetailPanel />
        </ReactFlowProvider>
      </>,
    );
    act(() => {
      useUi.getState().select({ kind: "node", id: "sw1" });
    });
    await user.click(
      screen.getByRole("button", { name: /^Port 7: Verbindung/ }),
    );
    const target = node(sw2).querySelector(".react-flow__handle.target");
    if (!target) throw new Error("Zielpunkt fehlt");
    // jsdom kennt `elementFromPoint` nicht; React Flow sucht damit den Zielpunkt
    document.elementFromPoint = () => target;
    await user.click(target);
    const dialog = screen.getByRole("dialog", { name: "Anschlüsse wählen" });
    const [p7] = within(dialog).getAllByRole("radio", { name: /^Port 7/ });
    expect(p7).toBeChecked();
    Reflect.deleteProperty(document, "elementFromPoint");
  });

  it("[A-3] Einfach: kein PortPicker, das System wählt das erste freie Paar", async () => {
    useSettings.setState({ mode: "simple" });
    const kt3 = add("kt");
    const user = userEvent.setup();
    render(app);
    node(kt3).focus();
    await user.keyboard("v");
    node("kon1").focus();
    await user.keyboard("v");
    expect(
      screen.queryByRole("dialog", { name: "Anschlüsse wählen" }),
    ).toBeNull();
    expect(useTopology.getState().topology.edges.at(-1)?.ends).toEqual([
      { node: kt3, port: "lan0" },
      { node: "kon1", port: "lan" },
    ]);
  });

  it("[G-3] ein belegter Anschluss ist als belegt gekennzeichnet und liefert die Meldung", async () => {
    const user = userEvent.setup();
    render(app);
    await verbinden(user);
    const dialog = screen.getByRole("dialog", { name: "Anschlüsse wählen" });
    await user.click(
      within(dialog).getByRole("radio", { name: "Port 1 (belegt)" }),
    );
    await user.click(within(dialog).getByRole("button", { name: "Verbinden" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      /keinen freien passenden Anschluss/,
    );
    expect(useTopology.getState().topology.edges).toHaveLength(
      praxis.edges.length,
    );
  });

  it("[A-3] Anschluss-Punkte nur im Modus Erweitert, belegt nicht nur über Farbe", () => {
    const { unmount } = render(app);
    const list = within(node("sw1")).getByRole("list", { name: "Anschlüsse" });
    expect(
      within(list).getByRole("listitem", { name: "Port 1: belegt" }),
    ).toHaveTextContent("●");
    expect(
      within(list).getByRole("listitem", { name: "Port 8: frei" }),
    ).toHaveTextContent("○");
    unmount();
    useSettings.setState({ mode: "simple" });
    render(app);
    expect(
      within(node("kt1")).queryByRole("list", { name: "Anschlüsse" }),
    ).toBeNull();
  });
});
