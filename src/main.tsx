import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { useCatalog, useTopology } from "./store";
import "./styles/global.css";

// Vorläufig, bis T-206 die Startansicht liefert: das Preset Arztpraxis laden.
const praxis = useCatalog
  .getState()
  .catalog.presets.find((p) => p.id === "praxis");
if (praxis) useTopology.getState().reset(praxis.topology);

const root = document.getElementById("root");
if (!root) throw new Error("Wurzelelement #root fehlt");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
