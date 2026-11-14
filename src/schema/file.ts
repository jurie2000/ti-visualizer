import { z } from "zod";
import { Topology } from "./topology";

export const Settings = z.object({
  // „system“ nur für Dateien aus früheren Ständen, beim Laden wird es Hell
  theme: z.enum(["hell", "dunkel", "system"]),
  mode: z.enum(["einfach", "erweitert"]),
  simSpeed: z.number().min(0.25).max(4),
  reducedMotion: z.boolean(),
  tutorialStep: z.number().int().min(0).max(1000),
  solvedChallenges: z.array(z.string().max(100)).max(200),
  pinnedPanels: z.array(z.string().max(100)).max(20).default([]),
  saveSettings: z.boolean().default(false),
});

// `settings` ist optional, `topology` Pflicht (D23)
export const TivFile = z.object({
  format: z.literal("ti-visualizer"),
  schemaVersion: z.literal(1),
  exportedAt: z.iso.datetime(),
  catalogVersion: z.string().max(20),
  settings: Settings.optional(),
  topology: Topology,
});

export type Settings = z.infer<typeof Settings>;
export type TivFile = z.infer<typeof TivFile>;
