import "fake-indexeddb/auto";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { clear, set } from "idb-keyval";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { loadCatalog } from "../schema";
import {
  emptyTopology,
  initAutosave,
  saveNow,
  useAutosave,
  useTopology,
} from "../store";
import { ToastProvider } from "../ui/Toast";
import { AutosaveDialog } from "./AutosaveDialog";

const praxis = loadCatalog().presets.find((p) => p.id === "praxis")?.topology;
if (!praxis) throw new Error("Preset praxis fehlt");

let off: (() => void) | undefined;
beforeEach(async () => {
  await clear();
  useAutosave.setState({ start: undefined, failed: false });
  useTopology.getState().reset(emptyTopology());
});
afterEach(() => {
  off?.();
});

const mount = async (onRestored = vi.fn()) => {
  off = await initAutosave();
  render(
    <ToastProvider>
      <AutosaveDialog onRestored={onRestored} />
    </ToastProvider>,
  );
  return onRestored;
};

it("fragt nach dem letzten Stand und stellt ihn wieder her", async () => {
  useTopology.getState().reset(praxis);
  await saveNow();
  useTopology.getState().reset(emptyTopology());
  const onRestored = await mount();
  await userEvent.click(
    await screen.findByRole("button", { name: "Wiederherstellen" }),
  );
  expect(useTopology.getState().topology).toEqual(praxis);
  expect(onRestored).toHaveBeenCalled();
});

it("zeigt die Ablehnung eines kaputten Stands", async () => {
  await set("autosave", "{kaputt");
  await mount();
  expect(await screen.findByText(/nicht übernommen/)).toBeVisible();
});
