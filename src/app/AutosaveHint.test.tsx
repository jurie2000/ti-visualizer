import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { useAutosave } from "../store";
import { AutosaveHint } from "./AutosaveHint";

it("zeigt den Hinweis auf die Grenzen und blendet ihn nach Bestätigung aus", async () => {
  useAutosave.setState({ start: { kind: "hinweis" } });
  render(<AutosaveHint />);
  expect(screen.getByText(/nur in diesem Browser/)).toBeVisible();
  expect(
    screen.getByText(/ersetzt nicht das Speichern als Datei/),
  ).toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: "Verstanden" }));
  expect(screen.queryByText(/nur in diesem Browser/)).toBeNull();
});
