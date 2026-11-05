import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider, useToast } from "./Toast";

function Trigger() {
  const { show } = useToast();
  return (
    <button
      onClick={() => {
        show("Hallo");
      }}
    >
      los
    </button>
  );
}

it("zeigt eine Meldung in einer Live-Region", async () => {
  const user = userEvent.setup();
  render(
    <ToastProvider>
      <Trigger />
    </ToastProvider>,
  );
  await user.click(screen.getByRole("button", { name: "los" }));
  expect(screen.getByRole("status")).toHaveTextContent("Hallo");
});
