import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadCatalog } from "../schema";
import { useSettings, useTopology, useUi } from "../store";
import { ReactFlowProvider } from "@xyflow/react";
import type { ReactNode } from "react";
import { ToastProvider } from "../ui/Toast";
import { Canvas } from "./Canvas";

const wrapper = ({ children }: { children: ReactNode }) => (
  <ToastProvider>
    <ReactFlowProvider>{children}</ReactFlowProvider>
  </ToastProvider>
);

const catalog = loadCatalog();
const praxis = (() => {
  const preset = catalog.presets.find((p) => p.id === "praxis");
  if (!preset) throw new Error("Preset praxis fehlt");
  return preset.topology;
})();

beforeEach(() => {
  useSettings.setState({ mode: "advanced" });
  useUi.setState({ selection: undefined });
  useTopology.getState().reset(praxis);
});

const node = (id: string) => {
  const el = document.querySelector<HTMLElement>(
    `.react-flow__node[data-id="${id}"]`,
  );
  if (!el) throw new Error(`Gerät ${id} fehlt`);
  return el;
};

/** Verbinden per Tastatur: V an der Quelle, V am Ziel. */
async function verbinden(a: string, b: string) {
  const user = userEvent.setup();
  node(a).focus();
  await user.keyboard("v");
  node(b).focus();
  await user.keyboard("v");
}

describe("Verbinden per Tastatur", () => {
  it("verbindet gültige Geräte und sagt es an", async () => {
    render(<Canvas />, { wrapper });
    const before = useTopology.getState().topology.edges.length;
    await verbinden("sw1", "rt1");
    expect(useTopology.getState().topology.edges).toHaveLength(before + 1);
    expect(screen.getByRole("status")).toHaveTextContent(/Verbunden: /);
  });

  it("[V-12] lehnt ungültige Paare ab und nennt den Grund", async () => {
    render(<Canvas />, { wrapper });
    const before = useTopology.getState().topology.edges.length;
    await verbinden("pvs1", "vpn1");
    expect(useTopology.getState().topology.edges).toHaveLength(before);
    expect(screen.getByRole("status")).toHaveTextContent(/VPN-Tunnel/);
  });

  it("[X-1] erklärt im ExclusionDialog, warum Konnektor und TI-Gateway sich ausschließen", async () => {
    useTopology.getState().addNode("gateway", { x: 0, y: 0 });
    render(<Canvas />, { wrapper });
    const before = useTopology.getState().topology.edges.length;
    await verbinden("pvs1", "kon1");
    expect(useTopology.getState().topology.edges).toHaveLength(before);
    expect(
      screen.getByRole("dialog", {
        name: "Konnektor und TI-Gateway schließen sich aus",
      }),
    ).toBeInTheDocument();
  });

  it("[V-10] erklärt auch den direkten Weg Konnektor an TI-Gateway im Dialog", async () => {
    useTopology.getState().addNode("gateway", { x: 0, y: 0 });
    const gw = useTopology.getState().topology.nodes.at(-1)?.id ?? "";
    render(<Canvas />, { wrapper });
    await verbinden("kon1", gw);
    expect(screen.getByRole("dialog")).toHaveTextContent(/Regel X-1/);
  });

  it("ignoriert Strg+V und bricht mit Esc auch außerhalb eines Geräts ab", async () => {
    const user = userEvent.setup();
    render(<Canvas />, { wrapper });
    node("sw1").focus();
    await user.keyboard("{Control>}v{/Control}");
    expect(screen.queryByRole("status")).toBeEmptyDOMElement();
    await user.keyboard("v");
    screen.getByRole("button", { name: "Vergrößern" }).focus();
    await user.keyboard("{Escape}");
    expect(screen.getByRole("status")).toHaveTextContent(/abgebrochen/);
  });

  it("Esc bricht die Quellenwahl ab", async () => {
    const user = userEvent.setup();
    render(<Canvas />, { wrapper });
    node("sw1").focus();
    await user.keyboard("v");
    await user.keyboard("{Escape}");
    node("rt1").focus();
    await user.keyboard("v");
    expect(useTopology.getState().topology.edges).toHaveLength(
      praxis.edges.length,
    );
  });
});

describe("Verbinden per Klick: Punkt, dann Zielgerät", () => {
  const punkt = (id: string) => {
    const el = node(id).querySelector<HTMLElement>(".tiv-handle--source");
    if (!el) throw new Error(`Punkt an ${id} fehlt`);
    return el;
  };
  const ziel = (id: string) => {
    const el = node(id).querySelector<HTMLElement>(".tiv-handle--target");
    if (!el) throw new Error(`Zielfläche an ${id} fehlt`);
    return el;
  };

  /** jsdom kennt `elementFromPoint` nicht; React Flow sucht damit das Ziel unter dem Zeiger. */
  const klickZiel = async (
    user: ReturnType<typeof userEvent.setup>,
    id: string,
  ) => {
    const el = ziel(id);
    document.elementFromPoint = () => el;
    await user.click(el);
  };
  afterEach(() => {
    Reflect.deleteProperty(document, "elementFromPoint");
  });

  it("verbindet gültige Geräte und gibt nach dem ersten Klick einen Hinweis", async () => {
    const user = userEvent.setup();
    render(<Canvas />, { wrapper });
    const before = useTopology.getState().topology.edges.length;
    await user.click(punkt("sw1"));
    expect(screen.getByRole("status")).toHaveTextContent(
      /Jetzt das Zielgerät anklicken/,
    );
    expect(ziel("rt1")).toHaveClass("is-active");
    await klickZiel(user, "rt1");
    expect(useTopology.getState().topology.edges).toHaveLength(before + 1);
    expect(screen.getByRole("status")).toHaveTextContent(/Verbunden: /);
  });

  it("[V-12] nennt bei ungültigem Ziel den Grund", async () => {
    const user = userEvent.setup();
    render(<Canvas />, { wrapper });
    const before = useTopology.getState().topology.edges.length;
    await user.click(punkt("pvs1"));
    await klickZiel(user, "vpn1");
    expect(useTopology.getState().topology.edges).toHaveLength(before);
    expect(screen.getByRole("status")).toHaveTextContent(/VPN-Tunnel/);
  });

  it("Esc bricht ab, danach nimmt keine Zielfläche mehr Klicks an", async () => {
    const user = userEvent.setup();
    render(<Canvas />, { wrapper });
    await user.click(punkt("sw1"));
    await user.keyboard("{Escape}");
    expect(screen.getByRole("status")).toHaveTextContent(
      /Verbinden abgebrochen/,
    );
    expect(ziel("rt1")).not.toHaveClass("is-active");
  });

  it("Klick auf die freie Fläche bricht ab", async () => {
    const user = userEvent.setup();
    render(<Canvas />, { wrapper });
    await user.click(punkt("sw1"));
    expect(ziel("rt1")).toHaveClass("is-active");
    const pane = document.querySelector<HTMLElement>(".react-flow__pane");
    if (!pane) throw new Error("Fläche fehlt");
    // nur `click`: das `mousedown` von user.click scheitert in jsdom an d3-zoom
    fireEvent.click(pane);
    expect(ziel("rt1")).not.toHaveClass("is-active");
  });
});
