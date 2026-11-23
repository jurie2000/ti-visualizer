import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { ToastProvider, useToast } from "./Toast";

function Trigger() {
  const { show } = useToast();
  return (
    <>
      <button
        onClick={() => {
          show("Hallo");
        }}
      >
        los
      </button>
      <button
        onClick={() => {
          show("Kaputt", "error");
        }}
      >
        fehler
      </button>
    </>
  );
}

function setup() {
  render(
    <ToastProvider>
      <Trigger />
    </ToastProvider>,
  );
}

describe("Toast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("zeigt eine Meldung in einer Live-Region", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "los" }));
    expect(screen.getByRole("status")).toHaveTextContent("Hallo");
  });

  it("Info verschwindet nach 5 s", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "los" }));
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.queryByText("Hallo")).toBeNull();
  });

  it("Fehler bleibt nach 5 s und verschwindet nach 10 s", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "fehler" }));
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText("Kaputt")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.queryByText("Kaputt")).toBeNull();
  });

  it("Knopf „Meldung ausblenden“ entfernt die Meldung", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "fehler" }));
    fireEvent.click(screen.getByRole("button", { name: "Meldung ausblenden" }));
    expect(screen.queryByText("Kaputt")).toBeNull();
  });

  it("Schließen lässt andere Meldungen bis zu ihrer eigenen Zeit stehen", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "fehler" }));
    fireEvent.click(screen.getByRole("button", { name: "Meldung ausblenden" }));
    fireEvent.click(screen.getByRole("button", { name: "fehler" }));
    act(() => {
      vi.advanceTimersByTime(9000);
    });
    expect(screen.getByText("Kaputt")).toBeInTheDocument();
  });
});
