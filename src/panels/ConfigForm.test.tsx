import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import regelwerk from "../../specs/001-ti-visualizer-baukasten/regelwerk.md?raw";
import { IDLE } from "../engine/simulation";
import { loadCatalog, type Node } from "../schema";
import { useSettings, useSim, useTopology, useUi } from "../store";
import { DetailPanel } from "./DetailPanel";

const catalog = loadCatalog();
const section = regelwerk.slice(
  regelwerk.indexOf("## 8. Konfiguration"),
  regelwerk.indexOf("## 9. "),
);
const regelwerkFields = section
  .split("\n")
  .filter((l) => l.startsWith("| ") && !l.startsWith("| Einstellung"))
  .flatMap((l) =>
    [...(l.split("|")[2] ?? "").matchAll(/`(\w+)`/g)].map((m) => m[1] ?? ""),
  );

const ADD = (type: string, id: string, label?: string): Node => ({
  id,
  type,
  position: { x: 0, y: 0 },
  fault: false,
  ...(label && { label }),
});
const nodeOf = (id: string) =>
  useTopology.getState().topology.nodes.find((n) => n.id === id);
const open = (id: string) => {
  act(() => {
    useUi.getState().select({ kind: "node", id });
  });
};

beforeEach(() => {
  useSettings.setState({ mode: "advanced" });
  useSim.setState({ sim: IDLE });
  useTopology.getState().reset({
    name: "",
    description: "",
    simDate: "2026-11-01",
    zones: [],
    edges: [],
    nodes: [
      ADD("kon", "kon-1", "<i>Zugang</i>"),
      ADD("kt", "kt-1"),
      ADD("pvs", "pvs-1"),
      ADD("router", "router-1"),
      ADD("switch", "switch-1"),
    ],
  });
  for (const [i, id] of [
    "kon-1",
    "kt-1",
    "pvs-1",
    "router-1",
    "switch-1",
  ].entries())
    useTopology.getState().setConfig(id, { ip: `192.168.10.${String(i + 1)}` });
});

describe("T-502b Formular Geräteeinstellungen (Regelwerk 8)", () => {
  it("[Regelwerk 8] jedes Feld kommt im Formular einer Variante vor, mit Standard-Hinweis", () => {
    const found = new Set<string>();
    render(<DetailPanel />);
    for (const id of ["kon-1", "kt-1", "pvs-1", "router-1", "switch-1"]) {
      open(id);
      for (const e of catalog.configDefaults)
        if (document.querySelector(`[id^="cfg-${id}-${e.field}"]`))
          found.add(e.field);
    }
    expect(regelwerkFields.length).toBeGreaterThan(15);
    for (const f of regelwerkFields) expect([...found], f).toContain(f);
  });

  it("[Regelwerk 8] zeigt bei abgeleiteten Feldern die Standard-Beschreibung", () => {
    render(<DetailPanel />);
    open("pvs-1");
    expect(
      screen.getByText("Standard: Reihe: Zugang. Parallel: Router"),
    ).toBeInTheDocument();
  });

  it("[Regelwerk 8] im Modus Einfach gibt es kein Formular", () => {
    useSettings.setState({ mode: "simple" });
    render(<DetailPanel />);
    open("kon-1");
    expect(screen.queryByText("Geräteeinstellungen")).toBeNull();
  });

  it("[Regelwerk 8] gültige IP wird beim Verlassen übernommen", async () => {
    const user = userEvent.setup();
    render(<DetailPanel />);
    open("pvs-1");
    const f = screen.getByLabelText("IP-Adresse");
    await user.clear(f);
    await user.type(f, "192.168.10.50");
    await user.tab();
    expect(nodeOf("pvs-1")?.config?.ip).toBe("192.168.10.50");
  });

  it("[Regelwerk 8] ungültige IP wird abgelehnt, Meldung nicht nur über Farbe, Eingabe bleibt", async () => {
    const user = userEvent.setup();
    render(<DetailPanel />);
    open("pvs-1");
    const before = nodeOf("pvs-1")?.config?.ip;
    const f = screen.getByLabelText("IP-Adresse");
    await user.clear(f);
    await user.type(f, "999.1.1.1");
    await user.tab();
    expect(nodeOf("pvs-1")?.config?.ip).toBe(before);
    expect(screen.getByRole("alert")).toHaveTextContent(/^Fehler: IP-Adresse/);
    expect(f).toHaveAttribute("aria-invalid", "true");
    expect(f).toHaveValue("999.1.1.1");
  });

  it("[Regelwerk 8] ungültige Zahl und ungültiges Datum werden abgelehnt", async () => {
    const user = userEvent.setup();
    render(<DetailPanel />);
    open("kon-1");
    const n = screen.getByLabelText("Zeitabweichung");
    await user.clear(n);
    await user.type(n, "abc");
    await user.tab();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    await user.clear(n);
    await user.type(n, "99999999999");
    await user.tab();
    expect(nodeOf("kon-1")?.config?.timeOffset).toBeUndefined();
    await user.clear(n);
    await user.type(n, "120");
    await user.tab();
    expect(nodeOf("kon-1")?.config).toMatchObject({ timeOffset: 120 });
    const r = useTopology
      .getState()
      .setConfig("kon-1", { certExpires: "2029-02-30" });
    expect(r.ok).toBe(false);
  });

  it("[Regelwerk 8] Datum, Checkbox und Radio ändern die Einstellung", async () => {
    const user = userEvent.setup();
    render(<DetailPanel />);
    open("kon-1");
    await user.click(screen.getByLabelText("SIS"));
    expect(nodeOf("kon-1")?.config).toMatchObject({ sis: true });
    await user.click(screen.getByLabelText("Parallel"));
    expect(nodeOf("kon-1")?.config).toMatchObject({ mode: "parallel" });
    const d = screen.getByLabelText("Zertifikat gSMC-K");
    fireEvent.change(d, { target: { value: "2030-01-15" } });
    fireEvent.blur(d);
    expect(nodeOf("kon-1")?.config).toMatchObject({
      certExpires: "2030-01-15",
    });
  });

  it("[Regelwerk 8] Pairing wählt nur einen vorhandenen Zugang, Namen nie als HTML", async () => {
    const user = userEvent.setup();
    render(<DetailPanel />);
    open("kt-1");
    await user.click(screen.getByLabelText("<i>Zugang</i>"));
    expect(nodeOf("kt-1")?.config).toMatchObject({ pairedWith: "kon-1" });
    expect(document.querySelector("label i")).toBeNull();
    const r = useTopology.getState().setConfig("kt-1", { pairedWith: "weg" });
    expect(r.ok).toBe(false);
  });

  it("[Regelwerk 8] setConfig lehnt fremde Felder und Geräte ohne Einstellungen ab", () => {
    const s = useTopology.getState();
    expect(s.setConfig("pvs-1", { sis: true }).ok).toBe(false);
    expect(s.setConfig("gibt-es-nicht", { ip: "10.0.0.1" }).ok).toBe(false);
    expect(nodeOf("pvs-1")?.config).not.toHaveProperty("sis");
  });

  it("[Regelwerk 8] ein Rückgängig-Schritt je Änderung, Formular folgt Rückgängig", async () => {
    const user = userEvent.setup();
    render(<DetailPanel />);
    open("pvs-1");
    const before = nodeOf("pvs-1")?.config?.vlan;
    const f = screen.getByLabelText("VLAN");
    await user.clear(f);
    await user.type(f, "Praxis");
    await user.tab();
    const steps = useTopology.getState().past.length;
    act(() => {
      useTopology.getState().undo();
    });
    expect(useTopology.getState().past.length).toBe(steps - 1);
    expect(nodeOf("pvs-1")?.config?.vlan).toBe(before);
    expect(screen.getByLabelText("VLAN")).toHaveValue(before ?? "");
  });

  it("[Regelwerk 7] während der Simulation ist das Formular gesperrt", () => {
    useSim.setState({ sim: { ...IDLE, status: "running" } });
    render(<DetailPanel />);
    open("pvs-1");
    expect(screen.getByLabelText("IP-Adresse")).toBeDisabled();
    expect(screen.getByText(/Simulation gesperrt/)).toBeInTheDocument();
  });
});
