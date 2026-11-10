import { ReactFlowProvider } from "@xyflow/react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import type { AnyCard, Topology } from "../schema";
import { useSettings, useTopology, useUi } from "../store";
import { ToastProvider } from "../ui/Toast";
import { Canvas } from "./Canvas";

const wrapper = ({ children }: { children: ReactNode }) => (
  <ToastProvider>
    <ReactFlowProvider>{children}</ReactFlowProvider>
  </ToastProvider>
);

const AKTION = "E-Rezept ausstellen";
const cards: AnyCard[] = [
  { kind: "egk", expires: "2027-01-01", pinActive: true },
  { kind: "hba", expires: "2027-01-01", unlocked: true },
  { kind: "smcb", expires: "2027-01-01", unlocked: true },
];
const TYPE: Record<string, string> = {
  sw: "switch",
  rt: "router",
  net: "internet",
  zn: "zentral",
};

// Praxis mit zwei Terminals: das Ausstellen verlangt dann die Terminalwahl.
function praxis(terminals: string[]): Topology {
  const ids = [
    "pvs",
    "sw",
    "kon",
    "rt",
    "net",
    "vpn",
    "zn",
    "vsdm",
    "erp",
    "idp",
    "idpsek",
    ...terminals,
  ];
  const links: [string, string][] = [
    ["sw", "pvs"],
    ["sw", "kon"],
    ["kon", "rt"],
    ["rt", "net"],
    ["net", "vpn"],
    ["vpn", "zn"],
    ["net", "erp"],
    ["net", "idp"],
    ["net", "idpsek"],
    ["zn", "vsdm"],
    ["zn", "erp"],
    ["zn", "idp"],
    ["zn", "idpsek"],
    ...terminals.map((t): [string, string] => ["sw", t]),
  ];
  return {
    name: "t",
    description: "",
    simDate: "2026-11-01",
    zones: [],
    nodes: ids.map((id, i) => ({
      id,
      type: TYPE[id] ?? id.replace(/\d$/, ""),
      position: { x: 200 * (i % 5), y: 120 * Math.floor(i / 5) },
      fault: false,
      ...(id.startsWith("kt") ? { cards } : {}),
    })),
    edges: links.map(([a, b]) => ({
      id: `${a}-${b}`,
      fault: false,
      ends: [
        { node: a, port: "p" },
        { node: b, port: "p" },
      ],
    })),
  };
}

const el = (sel: string, id: string) => {
  const e = document.querySelector<HTMLElement>(`${sel}[data-id="${id}"]`);
  if (!e) throw new Error(`${id} fehlt`);
  return e;
};
const node = (id: string) => el(".react-flow__node", id);

beforeEach(() => {
  useSettings.setState({ mode: "advanced" });
  useUi.setState({ selection: undefined, pendingAction: undefined });
  useTopology.getState().reset(praxis(["kt"]));
});

describe("Kontextmenü (FR-6, FR-7, FR-18)", () => {
  it("öffnet per Umschalt+F10 und Menütaste, Esc gibt den Fokus zurück", async () => {
    const user = userEvent.setup();
    render(<Canvas />, { wrapper });
    node("pvs").focus();
    await user.keyboard("{Shift>}{F10}{/Shift}");
    const menu = screen.getByRole("menu");
    expect(within(menu).getAllByRole("menuitem")[0]).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(node("pvs")).toHaveFocus();
    await user.keyboard("{ContextMenu}");
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("öffnet per Rechtsklick und bedient sich mit Pfeiltasten, Home und Ende", async () => {
    const user = userEvent.setup();
    render(<Canvas />, { wrapper });
    await user.pointer({ keys: "[MouseRight]", target: node("pvs") });
    const items = within(screen.getByRole("menu")).getAllByRole("menuitem");
    expect(items[0]).toHaveTextContent("Details");
    await user.keyboard("{ArrowDown}");
    expect(items[1]).toHaveFocus();
    await user.keyboard("{End}");
    expect(items.at(-1)).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(items[0]).toHaveFocus();
    await user.keyboard("{Home}{ArrowUp}");
    expect(items.at(-1)).toHaveFocus();
  });

  it("zeigt ausgegraute Einträge mit Schloss, Begründung und aria-disabled, ohne Wirkung", async () => {
    const user = userEvent.setup();
    useTopology.getState().reset(praxis([]));
    render(<Canvas />, { wrapper });
    node("pvs").focus();
    await user.keyboard("{ContextMenu}");
    const item = screen.getByRole("menuitem", { name: new RegExp(AKTION) });
    expect(item).toHaveAttribute("aria-disabled", "true");
    expect(item.querySelector("svg")).not.toBeNull();
    expect(item.textContent.length).toBeGreaterThan(AKTION.length);
    item.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(useUi.getState().pendingAction).toBeUndefined();
  });

  it("merkt eine ausführbare Aktion vor und schließt das Menü", async () => {
    const user = userEvent.setup();
    render(<Canvas />, { wrapper });
    node("pvs").focus();
    await user.keyboard("{ContextMenu}");
    const item = screen.getByRole("menuitem", { name: AKTION });
    expect(item).not.toHaveAttribute("aria-disabled");
    await user.click(item);
    expect(useUi.getState().pendingAction).toEqual({
      nodeId: "pvs",
      actionId: expect.any(String) as string,
    });
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("fragt bei mehreren Terminals „Welches Terminal?“", async () => {
    const user = userEvent.setup();
    useTopology.getState().reset(praxis(["kt", "kt2"]));
    render(<Canvas />, { wrapper });
    node("pvs").focus();
    await user.keyboard("{ContextMenu}");
    await user.click(screen.getByRole("menuitem", { name: AKTION }));
    const dialog = await screen.findByRole("dialog", {
      name: "Welches Terminal?",
    });
    expect(useUi.getState().pendingAction).toBeUndefined();
    await user.click(within(dialog).getAllByRole("radio")[1] as HTMLElement);
    await user.click(within(dialog).getByRole("button", { name: "Weiter" }));
    expect(useUi.getState().pendingAction?.terminal).toBe("kt2");
    expect(screen.getByRole("status")).toHaveTextContent("gewählt");
  });

  it("schaltet Ausfall und Verbindung um (FR-18)", async () => {
    const user = userEvent.setup();
    render(<Canvas />, { wrapper });
    node("pvs").focus();
    await user.keyboard("{ContextMenu}");
    await user.click(
      screen.getByRole("menuitem", { name: "Ausfall simulieren" }),
    );
    expect(
      useTopology.getState().topology.nodes.find((n) => n.id === "pvs")?.fault,
    ).toBe(true);
    await user.keyboard("{ContextMenu}");
    expect(
      screen.getByRole("menuitem", { name: "Wieder in Betrieb nehmen" }),
    ).toBeInTheDocument();
    await user.keyboard("{Escape}");

    el(".react-flow__edge", "sw-pvs").focus();
    await user.keyboard("{ContextMenu}");
    await user.click(
      screen.getByRole("menuitem", { name: "Verbindung trennen" }),
    );
    expect(
      useTopology.getState().topology.edges.find((e) => e.id === "sw-pvs")
        ?.fault,
    ).toBe(true);
  });
});
