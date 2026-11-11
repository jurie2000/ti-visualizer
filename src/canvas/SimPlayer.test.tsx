import { ReactFlowProvider } from "@xyflow/react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AnyCard, Topology } from "../schema";
import { useSettings, useSim, useTopology, useUi } from "../store";
import { PalettePanel } from "../panels/PalettePanel";
import { ToastProvider } from "../ui/Toast";
import { Canvas } from "./Canvas";

const wrapper = ({ children }: { children: ReactNode }) => (
  <ToastProvider>
    <ReactFlowProvider>{children}</ReactFlowProvider>
  </ToastProvider>
);

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

const start = (terminal?: string) => {
  act(() => {
    useUi.getState().startAction({
      nodeId: "pvs",
      actionId: "erezept-ausstellen",
      ...(terminal && { terminal }),
    });
  });
};
const live = () => {
  const e = document.querySelector(".tiv-sim__text");
  if (!e) throw new Error("Player fehlt");
  return e;
};

beforeEach(() => {
  useSettings.setState({ mode: "advanced", reduceMotion: false });
  useUi.setState({ selection: undefined, pendingAction: undefined });
  useSim.getState().send({ tempo: 1 });
  useSim.getState().close();
  useTopology.getState().reset(praxis(["kt"]));
});
afterEach(() => {
  vi.useRealTimers();
});

describe("SimPlayer (FR-9, FR-10, Regelwerk 7)", () => {
  it("übernimmt die gewählte Aktion, meldet den Schritt per aria-live und hebt ihn hervor", () => {
    render(<Canvas />, { wrapper });
    start();
    expect(
      screen.getByRole("group", { name: /E-Rezept ausstellen/ }),
    ).toHaveFocus();
    expect(live()).toHaveAttribute("aria-live", "polite");
    expect(live().textContent).toContain("Signaturauftrag");
    expect(screen.getByText(/Schritt 1 von 7/)).toBeInTheDocument();
    expect(useUi.getState().pendingAction).toBeUndefined();
    expect(node("pvs")).toHaveClass("is-sim");
    expect(node("kon")).toHaveClass("is-sim");
    expect(node("rt")).not.toHaveClass("is-sim");
    expect(node("pvs")).toHaveAccessibleName(/aktueller Schritt/);
  });

  it("zeigt je Schritt ein Paket, bei reduzierter Bewegung keins (FR-9, D6)", () => {
    const { unmount } = render(<Canvas />, { wrapper });
    start();
    expect(document.querySelector(".tiv-packet")).toHaveClass("is-moving");
    unmount();
    useSim.getState().close();
    useSettings.setState({ reduceMotion: true });
    render(<Canvas />, { wrapper });
    start();
    expect(document.querySelector(".tiv-packet")).toBeNull();
    expect(node("pvs")).toHaveClass("is-sim");
  });

  it("bedient sich per Tastatur: Pfeiltasten, Leertaste, Esc", async () => {
    const user = userEvent.setup();
    render(<Canvas />, { wrapper });
    start();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByText(/Schritt 2 von 7/)).toBeInTheDocument();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByText(/Schritt 1 von 7/)).toBeInTheDocument();
    await user.keyboard(" ");
    expect(useSim.getState().sim.status).toBe("paused");
    await user.keyboard(" ");
    expect(useSim.getState().sim.status).toBe("running");
    await user.keyboard("{Escape}");
    expect(useSim.getState().sim.status).toBe("cancelled");
    expect(live()).toHaveTextContent("abgebrochen");
    await user.click(screen.getByRole("button", { name: "Schließen" }));
    expect(screen.queryByRole("group", { name: /Simulation/ })).toBeNull();
    expect(node("pvs")).toHaveFocus();
  });

  it("spielt von selbst ab, Tempo verkürzt die Wartezeit, am Ende steht „beendet“", () => {
    vi.useFakeTimers();
    render(<Canvas />, { wrapper });
    start();
    act(() => {
      vi.advanceTimersByTime(1999);
    });
    expect(useSim.getState().sim.step).toBe(0);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(useSim.getState().sim.step).toBe(1);
    act(() => {
      useSim.getState().send({ tempo: 2 });
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(useSim.getState().sim.step).toBe(2);
    for (let i = 0; i < 7; i++)
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    expect(useSim.getState().sim.status).toBe("done");
    expect(live()).toHaveTextContent("Ablauf beendet");
  });

  it("stellt das Tempo per Regler ein", () => {
    render(<Canvas />, { wrapper });
    start();
    const slider = screen.getByRole("slider", { name: "Tempo" });
    expect(slider).toHaveAttribute("aria-valuetext", "1×");
    fireEvent.change(slider, { target: { value: "2" } });
    expect(useSim.getState().sim.tempo).toBe(2);
    expect(slider).toHaveAttribute("aria-valuetext", "2×");
  });

  it("Palette und Drop fügen während der Simulation nichts hinzu", async () => {
    const user = userEvent.setup();
    render(
      <>
        <PalettePanel />
        <Canvas />
      </>,
      { wrapper },
    );
    start();
    const before = useTopology.getState().topology.nodes.length;
    await user.click(
      screen.getByRole("button", {
        name: /PVS Praxisverwaltungssystem hinzufügen/,
      }),
    );
    expect(useTopology.getState().topology.nodes).toHaveLength(before);
    expect(useSim.getState().sim.status).toBe("running");
  });

  it("sperrt die Topologie während der Simulation und gibt sie danach frei", async () => {
    const user = userEvent.setup();
    render(<Canvas />, { wrapper });
    expect(node("pvs")).toHaveClass("draggable");
    start();
    expect(node("pvs")).not.toHaveClass("draggable");
    await user.keyboard("{Escape}");
    expect(node("pvs")).toHaveClass("draggable");
  });

  it.each([
    [
      "Störung",
      () => {
        useTopology.getState().toggleFault("rt");
      },
    ],
    [
      "Rückgängig",
      () => {
        useTopology.getState().undo();
      },
    ],
    [
      "Öffnen",
      () => {
        useTopology.getState().replace(praxis([]));
      },
    ],
    [
      "Moduswechsel",
      () => {
        useSettings.setState({ mode: "simple" });
      },
    ],
  ])("%s bricht die laufende Simulation ab", (_, act_) => {
    useTopology.getState().toggleFault("sw-pvs");
    render(<Canvas />, { wrapper });
    start();
    act(act_);
    expect(useSim.getState().sim.status).toBe("cancelled");
  });

  it("Änderung nach dem Ende bricht ab, „Zurück“ setzt nichts Veraltetes fort", () => {
    render(<Canvas />, { wrapper });
    start();
    for (let i = 0; i < 7; i++)
      act(() => {
        useSim.getState().send("next");
      });
    expect(useSim.getState().sim.status).toBe("done");
    act(() => {
      useTopology.getState().toggleFault("rt");
    });
    expect(useSim.getState().sim.status).toBe("cancelled");
    act(() => {
      useSim.getState().send("prev");
    });
    expect(useSim.getState().sim.status).toBe("cancelled");
  });

  it("zeigt „Terminal wählen“, wenn mehrere Terminals passen und keines gewählt ist", async () => {
    const user = userEvent.setup();
    useTopology.getState().reset(praxis(["kt", "kt2"]));
    render(<Canvas />, { wrapper });
    start();
    await user.keyboard("{ArrowRight}");
    expect(live()).toHaveTextContent("Terminal wählen");
  });

  it("bindet mit gewähltem Terminal ohne Problem", async () => {
    const user = userEvent.setup();
    useTopology.getState().reset(praxis(["kt", "kt2"]));
    render(<Canvas />, { wrapper });
    start("kt2");
    await user.keyboard("{ArrowRight}");
    expect(live()).not.toHaveTextContent("Terminal wählen");
    expect(node("kt2")).toHaveClass("is-sim");
  });

  it("nennt den Ausfall auf dem Weg", () => {
    useTopology.getState().toggleFault("sw");
    render(<Canvas />, { wrapper });
    start();
    expect(live().textContent).toContain("ausgefallen");
  });

  it("setzt die Einstellung „Bewegung reduzieren“ auf die Canvas um", () => {
    useSettings.setState({ reduceMotion: true });
    const { container } = render(<Canvas />, { wrapper });
    expect(container.querySelector(".is-reduced-motion")).not.toBeNull();
  });
});
