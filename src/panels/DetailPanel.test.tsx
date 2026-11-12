import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import type { Topology } from "../schema";
import {
  openTopology,
  resolveGuard,
  useCatalog,
  useSettings,
  useTopology,
  useUi,
} from "../store";
import { DetailPanel } from "./DetailPanel";

const topo: Topology = {
  name: "t",
  description: "",
  simDate: "2026-11-01",
  zones: [
    {
      id: "z1",
      label: "Praxis",
      area: { x: 0, y: 0, w: 10, h: 10 },
      tone: "sage",
    },
  ],
  nodes: [
    {
      id: "kt1",
      type: "kt",
      label: "<b>KT</b>",
      position: { x: 0, y: 0 },
      fault: false,
    },
    { id: "kon1", type: "kon", position: { x: 100, y: 0 }, fault: true },
    { id: "pvs1", type: "pvs", position: { x: 200, y: 0 }, fault: false },
  ],
  edges: [
    {
      id: "e1",
      fault: false,
      ends: [
        { node: "kt1", port: "lan0" },
        { node: "kon1", port: "lan" },
      ],
    },
    {
      id: "e2",
      fault: false,
      ends: [
        { node: "kt1", port: "lan0" },
        { node: "pvs1", port: "eth0" },
      ],
    },
  ],
};

const select = (kind: "node" | "edge" | "zone", id: string) => {
  act(() => {
    useUi.getState().select({ kind, id });
  });
};

beforeEach(() => {
  useTopology.getState().reset(topo);
  useUi.setState({ selection: undefined });
});

describe("T-406 Detailpanel (FR-11)", () => {
  it("zeigt ohne Auswahl einen Hinweis", () => {
    render(<DetailPanel />);
    expect(screen.getByText(/wählen, um Details/)).toBeInTheDocument();
  });

  it("zeigt für eine Kante Protokoll, Netzport, TLS und die Quelle mit Link", () => {
    render(<DetailPanel />);
    select("edge", "e1");
    const p = within(screen.getByRole("region", { name: "Protokoll SICCT" }));
    expect(p.getByText("SICCT, nach Pairing")).toBeInTheDocument();
    expect(p.getByText("4742 (plausibel)")).toBeInTheDocument();
    expect(p.getByText("ja")).toBeInTheDocument();
    const link = p.getByRole("link", { name: /gemSpec_KT/ });
    expect(link).toHaveAttribute("href", expect.stringMatching(/^https:\/\//));
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("nennt eine Kante ohne belegtes Protokoll", () => {
    render(<DetailPanel />);
    select("edge", "e2");
    expect(screen.getByText(/kein Protokoll belegt/)).toBeInTheDocument();
  });

  it("zeigt ein Gerät samt Quelle und gibt Namen nie als HTML aus", () => {
    render(<DetailPanel />);
    select("node", "kt1");
    expect(
      screen.getByRole("heading", { name: "<b>KT</b>" }),
    ).toBeInTheDocument();
    expect(document.querySelector("h3 b")).toBeNull();
    expect(screen.getByRole("list", { name: "Quellen" })).toBeInTheDocument();
    select("node", "kon1");
    expect(screen.getByText("Ausgefallen")).toBeInTheDocument();
  });

  it("zeigt eine Zone", () => {
    render(<DetailPanel />);
    select("zone", "z1");
    expect(screen.getByRole("heading", { name: "Praxis" })).toBeInTheDocument();
  });

  it("meldet eine gelöschte Auswahl", () => {
    render(<DetailPanel />);
    select("node", "weg");
    expect(screen.getByText(/gibt es nicht mehr/)).toBeInTheDocument();
  });

  it("sagt nur die Überschrift an, nicht den ganzen Inhalt (aria-live)", () => {
    const { container } = render(<DetailPanel />);
    const leer = screen.getByRole("heading", { level: 3 });
    select("node", "kt1");
    expect(screen.getByRole("heading", { level: 3 })).toBe(leer);
    expect(container.querySelector("#tiv-detail-body")).not.toHaveAttribute(
      "aria-live",
    );
    expect(screen.getByRole("heading", { name: "<b>KT</b>" })).toHaveAttribute(
      "aria-live",
      "polite",
    );
    // bleibt über Arten und Auswahl hinweg dasselbe Element (neue Live-Regionen werden oft nicht angesagt)
    const h = screen.getByRole("heading", { level: 3 });
    select("edge", "e1");
    select("zone", "z1");
    expect(screen.getByRole("heading", { level: 3 })).toBe(h);
  });

  it("löst die Auswahl beim Öffnen einer Datei", async () => {
    render(<DetailPanel />);
    select("node", "kt1");
    openTopology(topo);
    await act(() => resolveGuard("discard")); // ungespeicherter Stand fragt erst
    expect(useUi.getState().selection).toBeUndefined();
    expect(screen.queryByRole("heading", { name: "<b>KT</b>" })).toBeNull();
  });

  it("T-712a: Kopf zeigt Kicker und Titel, Auswahl aufheben leert die Auswahl", async () => {
    const user = userEvent.setup();
    const { container } = render(<DetailPanel />);
    const kicker = () =>
      container.querySelector(".tiv-dhead__kicker")?.textContent;
    expect(
      screen.queryByRole("button", { name: "Auswahl aufheben" }),
    ).toBeNull();
    select("node", "kt1");
    expect(kicker()).toBe("Kartenterminals");
    await user.click(screen.getByRole("button", { name: "Auswahl aufheben" }));
    expect(useUi.getState().selection).toBeUndefined();
    select("edge", "e1");
    expect(kicker()).toBe("Verbindung");
    select("zone", "z1");
    expect(kicker()).toBe("Zone");
  });

  it("T-712a: Regelverstoß erscheint nur bei einem Befund des Geräts", () => {
    render(<DetailPanel />);
    select("node", "kon1");
    const box = screen.getByRole("group", { name: "Regelverstoß" });
    expect(box).toHaveTextContent("Gerät ist ausgefallen");
    select("node", "pvs1");
    expect(screen.queryByRole("group", { name: "Regelverstoß" })).toBeNull();
  });

  it("T-712a: Beschreibung steht im Panel, Markup in Beschreibung und Namen bleibt Text (D10)", () => {
    const { container } = render(<DetailPanel />);
    select("node", "kon1");
    expect(screen.getByText(/Tor der Praxis zur TI/)).toBeInTheDocument();
    const t = useCatalog.getState().catalog;
    act(() => {
      useCatalog.setState({
        catalog: {
          ...t,
          deviceTypes: t.deviceTypes.map((d) =>
            d.id === "kon"
              ? { ...d, description: "<img src=x onerror=1>Text" }
              : d,
          ),
        },
      });
    });
    expect(screen.getByText("<img src=x onerror=1>Text")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });

  it("T-712b: Anschlüsse nur im Modus Erweitert, mit Zusammenfassung und Gegenstelle", () => {
    useSettings.getState().set({ mode: "simple" });
    render(<DetailPanel />);
    select("node", "kon1");
    expect(screen.queryByRole("region", { name: "Anschlüsse" })).toBeNull();
    act(() => {
      useSettings.getState().set({ mode: "advanced" });
    });
    const list = within(screen.getByRole("region", { name: "Anschlüsse" }));
    // LAN (mehrfach, eine Verbindung) zählt frei, WAN und VPN sind frei
    expect(list.getByText("3 von 3 frei")).toBeInTheDocument();
    expect(list.getByText("1 Verbindung")).toBeInTheDocument();
    expect(list.getAllByText("frei")).toHaveLength(2);
  });

  it("T-712b: Klick auf einen belegten Anschluss wählt die Kante", async () => {
    const user = userEvent.setup();
    useSettings.getState().set({ mode: "advanced" });
    useTopology.getState().reset({ ...topo, edges: topo.edges.slice(0, 1) });
    render(<DetailPanel />);
    select("node", "kt1");
    await user.click(screen.getByRole("button", { name: /Konnektor · / }));
    expect(useUi.getState().selection).toEqual({ kind: "edge", id: "e1" });
  });

  it("T-712b: Gegenstellen eines Mehrfachanschlusses stehen im Namen des Knopfs", () => {
    useSettings.getState().set({ mode: "advanced" });
    render(<DetailPanel />);
    select("node", "kon1");
    expect(
      screen.getByRole("button", {
        name: /^LAN: .*verbunden mit eHealth-KT · /,
      }),
    ).toBeInTheDocument();
  });

  it("T-712b: Klick auf einen freien Anschluss merkt den Anschluss und startet das Verbinden", async () => {
    const user = userEvent.setup();
    useSettings.getState().set({ mode: "advanced" });
    useUi.setState({ connectPort: undefined });
    render(<DetailPanel />);
    select("node", "kon1");
    await user.click(screen.getByRole("button", { name: /^WAN: / }));
    expect(useUi.getState().connectPort).toEqual({ node: "kon1", port: "wan" });
  });

  it("T-712c [K-2]: Karten stehen in beiden Modi im Panel, Stecken öffnet den Dialog, Ziehen entfernt die Karte", async () => {
    const user = userEvent.setup();
    for (const mode of ["simple", "advanced"] as const) {
      useSettings.getState().set({ mode });
      useTopology.getState().reset(topo);
      useUi.setState({ dialog: undefined });
      const { unmount } = render(<DetailPanel />);
      select("node", "kt1");
      const box = within(
        screen.getByRole("region", { name: "Gesteckte Karten" }),
      );
      expect(box.getByText("Noch keine Karte gesteckt.")).toBeInTheDocument();
      await user.click(box.getByRole("button", { name: "Karte stecken" }));
      expect(useUi.getState().dialog).toBe("plugCard:kt1");
      act(() => {
        useTopology.getState().plugCard("kt1", {
          kind: "smcb",
          expires: "2030-01-01",
          unlocked: true,
        });
      });
      await user.click(
        screen.getByRole("button", { name: /^SMC-B aus .+ ziehen$/ }),
      );
      expect(useTopology.getState().topology.nodes[0]?.cards).toEqual([]);
      unmount();
    }
  });

  it("T-712c [K-3]: abgelaufene Karte steht genau einmal im Kasten (beide Modi), Geräte ohne Steckplatz zeigen keine Karten", () => {
    for (const mode of ["simple", "advanced"] as const) {
      useSettings.getState().set({ mode });
      useTopology.getState().reset(topo);
      const { unmount } = render(<DetailPanel />);
      act(() => {
        useTopology.getState().plugCard("kt1", {
          kind: "egk",
          expires: "2020-01-01",
          pinActive: true,
        });
      });
      select("node", "kt1");
      const box = screen.getByRole("group", { name: "Regelverstoß" });
      expect(box.textContent.match(/abgelaufen/g)).toHaveLength(1);
      select("node", "pvs1");
      expect(
        screen.queryByRole("region", { name: "Gesteckte Karten" }),
      ).toBeNull();
      unmount();
    }
  });

  it("T-712c [K-2]: Karte stecken ist weg, solange kein Steckplatz frei ist, und kommt nach dem Ziehen zurück", async () => {
    const user = userEvent.setup();
    render(<DetailPanel />);
    for (const kind of ["egk", "hba", "smcb"] as const)
      act(() => {
        useTopology
          .getState()
          .plugCard("kt1", { kind, expires: "2030-01-01", unlocked: true });
      });
    select("node", "kt1");
    expect(screen.queryByRole("button", { name: "Karte stecken" })).toBeNull();
    await user.click(
      screen.getByRole("button", { name: /^HBA aus .+ ziehen$/ }),
    );
    expect(
      screen.getByRole("button", { name: "Karte stecken" }),
    ).toBeInTheDocument();
  });
});
