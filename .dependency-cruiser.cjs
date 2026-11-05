// Architekturregeln (D32, plan.md „Statische Qualität“). Aufruf: pnpm check:architektur
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "engine-ohne-npm-pakete",
      comment:
        "engine/ ist reine Logik: weder React noch andere Pakete (Tests ausgenommen).",
      severity: "error",
      from: { path: "^src/engine/", pathNot: "\\.test\\.ts$" },
      to: { dependencyTypes: ["npm", "npm-dev", "npm-peer", "npm-optional"] },
    },
    {
      name: "engine-ohne-store-persistence",
      comment: "engine/ kennt weder store/ noch persistence/ noch Oberfläche.",
      severity: "error",
      from: { path: "^src/engine/" },
      to: { path: "^src/(store|persistence|ui|canvas|panels|dialogs|app)/" },
    },
    {
      name: "engine-ohne-node-kern",
      comment: "Keine Node-Kernmodule in engine/.",
      severity: "error",
      from: { path: "^src/engine/", pathNot: "\\.test\\.ts$" },
      to: { dependencyTypes: ["core"] },
    },
    {
      name: "ui-nicht-direkt-persistence",
      comment: "Oberfläche greift nur über Stores auf persistence/ zu.",
      severity: "error",
      from: { path: "^src/(ui|canvas|panels|dialogs)/" },
      to: { path: "^src/persistence/" },
    },
    {
      name: "no-circular",
      comment: "Keine zirkulären Abhängigkeiten.",
      severity: "error",
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
    tsPreCompilationDeps: true,
  },
};
