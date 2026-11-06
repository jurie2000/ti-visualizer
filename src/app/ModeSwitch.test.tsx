import { ReactFlowProvider } from "@xyflow/react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { PalettePanel } from "../panels/PalettePanel";
import { useSettings } from "../store";
import { ToastProvider } from "../ui/Toast";
import { ModeSwitch } from "./ModeSwitch";

const wrapper = ({ children }: { children: ReactNode }) => (
  <ToastProvider>
    <ReactFlowProvider>{children}</ReactFlowProvider>
  </ToastProvider>
);

beforeEach(() => {
  useSettings.setState({ mode: "simple" });
});

describe("ModeSwitch", () => {
  it("wechselt den Modus in den Einstellungen und zeigt ihn nicht nur über Farbe", async () => {
    const user = userEvent.setup();
    render(<ModeSwitch />);
    const einfach = screen.getByRole("button", { name: "Einfach" });
    const erweitert = screen.getByRole("button", { name: "Erweitert" });
    expect(einfach).toHaveAttribute("aria-pressed", "true");
    await user.click(erweitert);
    expect(useSettings.getState().mode).toBe("advanced");
    expect(erweitert).toHaveAttribute("aria-pressed", "true");
    expect(einfach).toHaveAttribute("aria-pressed", "false");
  });

  it("Palette zeigt im Modus Einfach nur sichtbare Typen", async () => {
    render(<PalettePanel />, { wrapper });
    // der Switch ist im Modus Einfach ausgeblendet (Regelwerk 1), das PVS nicht
    expect(
      screen.queryByRole("button", { name: /^Switch .* hinzufügen$/ }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: /^PVS .* hinzufügen$/ }),
    ).toBeVisible();
    useSettings.setState({ mode: "advanced" });
    expect(
      await screen.findByRole("button", { name: /^Switch .* hinzufügen$/ }),
    ).toBeVisible();
  });
});
