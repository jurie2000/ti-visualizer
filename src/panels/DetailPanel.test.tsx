import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import type { Topology } from "../schema";
import { openTopology, resolveGuard, useTopology, useUi } from "../store";
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

  it("blendet per Tastatur aus und ein", async () => {
    const user = userEvent.setup();
    render(<DetailPanel />);
    const b = screen.getByRole("button", { name: "Details ausblenden" });
    b.focus();
    await user.keyboard("{Enter}");
    expect(b).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText(/wählen, um Details/)).not.toBeVisible();
    await user.keyboard("{Enter}");
    expect(screen.getByText(/wählen, um Details/)).toBeVisible();
  });

  it("hält angepinnten Inhalt trotz neuer Auswahl und meldet den Zustand per aria-pressed", async () => {
    const user = userEvent.setup();
    render(<DetailPanel />);
    select("node", "kt1");
    await user.click(screen.getByRole("button", { name: "Anpinnen" }));
    expect(screen.getByRole("button", { name: "Anpinnen" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    select("node", "kon1");
    expect(
      screen.getByRole("heading", { name: "<b>KT</b>" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Anpinnen" }));
    expect(screen.queryByRole("heading", { name: "<b>KT</b>" })).toBeNull();
  });

  it("meldet eine gelöschte Auswahl", () => {
    render(<DetailPanel />);
    select("node", "weg");
    expect(screen.getByText(/gibt es nicht mehr/)).toBeInTheDocument();
  });

  it("sagt nur die Überschrift an, nicht den ganzen Inhalt (aria-live)", () => {
    const { container } = render(<DetailPanel />);
    select("node", "kt1");
    expect(container.querySelector("#tiv-detail-body")).not.toHaveAttribute(
      "aria-live",
    );
    expect(screen.getByRole("heading", { name: "<b>KT</b>" })).toHaveAttribute(
      "aria-live",
      "polite",
    );
  });

  it("löst Anheftung und Auswahl beim Öffnen einer Datei", async () => {
    const user = userEvent.setup();
    render(<DetailPanel />);
    select("node", "kt1");
    await user.click(screen.getByRole("button", { name: "Anpinnen" }));
    openTopology(topo);
    await act(() => resolveGuard("discard")); // ungespeicherter Stand fragt erst
    // Auswahl und Anheftung der alten Datei sind weg
    expect(useUi.getState().selection).toBeUndefined();
    select("node", "kon1");
    expect(screen.queryByRole("heading", { name: "<b>KT</b>" })).toBeNull();
    expect(screen.getByRole("button", { name: "Anpinnen" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
