// Gegentest T-008: harmlose Kommentarzeile, wird nicht gemergt.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import "./styles/global.css";

const root = document.getElementById("root");
if (!root) throw new Error("Wurzelelement #root fehlt");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
