import { ReactFlowProvider } from "@xyflow/react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { APOTHEKEN_ZONE } from "../engine/tutorialChecks";
import { IDLE } from "../engine/simulation";
import {
  emptyTopology,
  openTopology,
  startTutorial,
  useCatalog,
  useOpen,
  useSettings,
  useSim,
  useTopology,
  useUi,
} from "../store";
import { TutorialCard } from "./TutorialCard";

const { steps, personas } = useCatalog.getState().catalog.tutorial;
const progress = () => useSettings.getState().tutorialProgress;
const card = (
  <ReactFlowProvider>
    <TutorialCard />
  </ReactFlowProvider>
);
const apoZones = () =>
  useTopology
    .getState()
    .topology.zones.filter((z) => z.label === APOTHEKEN_ZONE);

beforeEach(() => {
  useTopology.getState().reset(emptyTopology());
  useSim.setState({ sim: IDLE, steps: [], name: "" });
  useSettings.setState({ tutorialProgress: 0 });
  useUi.getState().setTutorial(true);
});

describe("FR-20 Tutorial-Karte", () => {
  it("zeigt Schritt x von y und die Persona mit Alt-Text", () => {
    render(card);
    expect(
      screen.getByText(new RegExp(`Schritt 1 von ${String(steps.length)}`)),
    ).toBeInTheDocument();
    const persona = personas.find((p) => p.id === steps[0]?.persona);
    expect(
      screen.getByRole("img", { name: persona?.alt ?? "" }),
    ).toBeInTheDocument();
  });

  it("zeigt Katalogtext nur als Text, nie als HTML", () => {
    const text = useCatalog.getState().catalog.tutorial;
    useCatalog.setState({
      catalog: {
        ...useCatalog.getState().catalog,
        tutorial: {
          ...text,
          steps: text.steps.map((s) => ({ ...s, text: "<b>fett</b>" })),
        },
      },
    });
    render(card);
    expect(screen.getByText("<b>fett</b>")).toBeInTheDocument();
    expect(document.querySelector(".tiv-tutorial b")).toBeNull();
    useCatalog.setState({
      catalog: { ...useCatalog.getState().catalog, tutorial: text },
    });
  });

  it("geht vor und zurück, speichert den Fortschritt, Zurück am Anfang gesperrt", async () => {
    const user = userEvent.setup();
    render(card);
    const back = screen.getByRole("button", { name: "Zurück" });
    expect(back).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Weiter" }));
    expect(progress()).toBe(1);
    expect(
      screen.getByRole("heading", { name: steps[1]?.title ?? "" }),
    ).toBeVisible();
    await user.click(back);
    expect(progress()).toBe(0);
  });

  it("meldet die Aufgabe als erledigt, sobald die Topologie passt", () => {
    useSettings.setState({ tutorialProgress: 1 });
    render(card);
    expect(screen.getByText("Aufgabe:")).toBeInTheDocument();
    act(() => {
      useTopology.getState().addNode("pvs", { x: 0, y: 0 });
    });
    expect(screen.getByText("Erledigt:")).toBeInTheDocument();
  });

  it("legt für Teil 2 genau einmal den Bereich der Apotheke an", () => {
    useSettings.setState({
      tutorialProgress: steps.findIndex((s) => s.part === "apotheke"),
    });
    const { rerender } = render(card);
    expect(apoZones()).toHaveLength(1);
    rerender(card);
    expect(apoZones()).toHaveLength(1);
  });

  it("beendet am letzten Schritt: Karte weg, Fortschritt zurück auf Anfang", async () => {
    const user = userEvent.setup();
    useSettings.setState({ tutorialProgress: steps.length - 1 });
    render(card);
    await user.click(screen.getByRole("button", { name: "Tutorial beenden" }));
    expect(useUi.getState().tutorial).toBe(false);
    expect(progress()).toBe(0);
  });

  it("Schließen behält den Fortschritt", async () => {
    const user = userEvent.setup();
    useSettings.setState({ tutorialProgress: 4 });
    render(card);
    await user.click(
      screen.getByRole("button", { name: "Tutorial schließen" }),
    );
    expect(useUi.getState().tutorial).toBe(false);
    expect(progress()).toBe(4);
  });

  it("merkt eine bis zum Ende gespielte Aktion, nicht eine mit Problem", () => {
    render(card);
    const action = useCatalog.getState().catalog.actions[0];
    if (!action) throw new Error("keine Aktion");
    const done = { status: "done", step: 0, tempo: 1 } as const;
    act(() => {
      useSim.setState({
        name: action.name,
        steps: [
          {
            label: "",
            text: "",
            nodes: [],
            edges: [],
            problem: { kind: "fehlt" },
          },
        ],
        sim: done,
      });
    });
    expect(useUi.getState().played).toEqual([]);
    act(() => {
      useSim.setState({ sim: IDLE });
      useSim.setState({
        steps: [{ label: "", text: "", nodes: [], edges: [] }],
        sim: done,
      });
    });
    expect(useUi.getState().played).toEqual([action.id]);
  });

  it("Tutorial starten: leere Fläche, Modus Erweitert, Schritt 1; ein anderes Öffnen beendet es", () => {
    useSettings.setState({ tutorialProgress: 7, mode: "simple" });
    useUi.getState().setTutorial(false);
    startTutorial();
    expect(useOpen.getState().guard).toBeUndefined();
    expect(useSettings.getState().mode).toBe("advanced");
    expect(progress()).toBe(0);
    expect(useUi.getState().tutorial).toBe(true);
    useSettings.setState({ tutorialProgress: 3 });
    openTopology(emptyTopology());
    expect(useUi.getState().tutorial).toBe(false);
    expect(progress()).toBe(3);
  });
});
