import { ReactFlowProvider } from "@xyflow/react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Info } from "lucide-react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSettings } from "../store";
import { SidePanel } from "./SidePanel";

const onClick = vi.fn();
const view = (autoOpen?: unknown) => (
  <ReactFlowProvider>
    <SidePanel
      side="right"
      id="detail"
      label="Detailpanel"
      overlayOpen={false}
      autoOpen={autoOpen}
      rail={[{ label: "Details", icon: Info, onClick }]}
    >
      <button type="button">Inhalt</button>
    </SidePanel>
  </ReactFlowProvider>
);
const wrap = () => document.querySelector(".tiv-side") as HTMLElement;
const wait = (ms: number) => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};

beforeEach(() => {
  vi.useFakeTimers();
  useSettings.setState({ pinnedPanels: [] });
});
afterEach(() => {
  vi.useRealTimers();
  onClick.mockClear();
});

describe("T-711 Seitenleiste (FR-22)", () => {
  it("öffnet bei Hover nach 150 ms und schließt nach 280 ms", () => {
    render(view());
    expect(wrap()).toHaveAttribute("data-open", "false");
    fireEvent.mouseEnter(wrap());
    wait(149);
    expect(wrap()).toHaveAttribute("data-open", "false");
    wait(1);
    expect(wrap()).toHaveAttribute("data-open", "true");
    fireEvent.mouseLeave(wrap());
    wait(279);
    expect(wrap()).toHaveAttribute("data-open", "true");
    wait(1);
    expect(wrap()).toHaveAttribute("data-open", "false");
  });

  it("öffnet nicht, solange die Maustaste gedrückt ist (Ziehen, Verbinden)", () => {
    render(view());
    fireEvent.pointerDown(document.body);
    fireEvent.mouseEnter(wrap());
    wait(500);
    expect(wrap()).toHaveAttribute("data-open", "false");
    fireEvent.pointerUp(document.body);
    fireEvent.mouseLeave(wrap());
    fireEvent.mouseEnter(wrap());
    wait(150);
    expect(wrap()).toHaveAttribute("data-open", "true");
  });

  it("Fokus auf die Schiene öffnet, Escape schließt und der Fokus bleibt auf dem Symbol", () => {
    render(view());
    const symbol = screen.getByRole("button", { name: "Details" });
    act(() => {
      symbol.focus();
    });
    expect(wrap()).toHaveAttribute("data-open", "true");
    act(() => {
      screen.getByRole("button", { name: "Inhalt" }).focus();
    });
    fireEvent.keyDown(screen.getByRole("button", { name: "Inhalt" }), {
      key: "Escape",
    });
    expect(wrap()).toHaveAttribute("data-open", "false");
    expect(symbol).toHaveFocus();
  });

  it("Klick auf ein Schienen-Symbol öffnet das Panel und ruft die Aktion", () => {
    render(view());
    fireEvent.click(screen.getByRole("button", { name: "Details" }));
    expect(onClick).toHaveBeenCalledOnce();
    expect(wrap()).toHaveAttribute("data-open", "true");
    expect(screen.getByLabelText("Detailpanel")).toHaveFocus();
  });

  it("Anheften hält das Panel offen und steht in pinnedPanels", () => {
    render(view());
    fireEvent.click(screen.getByRole("button", { name: /anheften$/ }));
    expect(useSettings.getState().pinnedPanels).toEqual(["detail"]);
    expect(wrap()).toHaveAttribute("data-open", "true");
    fireEvent.mouseLeave(wrap());
    wait(1000);
    expect(wrap()).toHaveAttribute("data-open", "true");
    fireEvent.keyDown(screen.getByRole("button", { name: "Inhalt" }), {
      key: "Escape",
    });
    expect(wrap()).toHaveAttribute("data-open", "true");
    fireEvent.click(screen.getByRole("button", { name: /anheften$/ }));
    expect(useSettings.getState().pinnedPanels).toEqual([]);
    expect(wrap()).toHaveAttribute("data-open", "false");
  });

  it("Anheften kommt aus den Einstellungen zurück", () => {
    useSettings.setState({ pinnedPanels: ["detail"] });
    render(view());
    expect(wrap()).toHaveAttribute("data-open", "true");
    expect(wrap()).toHaveAttribute("data-pinned", "true");
    expect(screen.getByRole("button", { name: /anheften$/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("öffnet bei neuer Auswahl und klappt von selbst wieder ein", () => {
    const { rerender } = render(view());
    rerender(view({ kind: "node", id: "n1" }));
    wait(150);
    expect(wrap()).toHaveAttribute("data-open", "true");
    wait(3000);
    expect(wrap()).toHaveAttribute("data-open", "false");
  });

  it("klappt bei Auswahl nicht ein, solange der Mauszeiger darauf steht", () => {
    const { rerender } = render(view());
    rerender(view({ kind: "node", id: "n1" }));
    wait(150);
    fireEvent.mouseEnter(wrap());
    wait(5000);
    expect(wrap()).toHaveAttribute("data-open", "true");
  });

  it("Escape ohne vorherigen Schienen-Fokus setzt den Fokus auf das erste Symbol", () => {
    render(view());
    const inhalt = screen.getByRole("button", { name: "Inhalt" });
    act(() => {
      inhalt.focus();
    });
    fireEvent.keyDown(inhalt, { key: "Escape" });
    expect(wrap()).toHaveAttribute("data-open", "false");
    expect(screen.getByRole("button", { name: "Details" })).toHaveFocus();
  });

  it("Klick auf die Fläche fährt das Panel sofort ein, auch bei Fokus darin; angeheftet bleibt es", () => {
    render(
      <>
        {view()}
        <div className="react-flow__pane">Fläche</div>
      </>,
    );
    const pane = screen.getByText("Fläche");
    fireEvent.mouseEnter(wrap());
    wait(150);
    act(() => {
      screen.getByRole("button", { name: "Inhalt" }).focus();
    });
    expect(wrap()).toHaveAttribute("data-open", "true");
    fireEvent.pointerDown(pane);
    expect(wrap()).toHaveAttribute("data-open", "false");
    useSettings.setState({ pinnedPanels: ["detail"] });
    fireEvent.pointerDown(pane);
    expect(wrap()).toHaveAttribute("data-open", "true");
  });
});
