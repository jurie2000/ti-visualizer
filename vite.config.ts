import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: process.env["BASE_PATH"] ?? "/ti-visualizer/",
  plugins: [react()],
});
