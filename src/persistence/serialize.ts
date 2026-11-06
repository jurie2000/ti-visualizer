import type { Catalog, Settings, Topology } from "../schema";
import { SCHEMA_VERSION } from "./migrate";

export interface SerializeOptions {
  /** Nur mitgeben, wenn „Einstellungen mitspeichern“ gewählt ist (D23). */
  settings?: Settings;
  /** Zeitpunkt für `exportedAt` (Tests). */
  now?: Date;
}

/**
 * Schreibt die Topologie als `.tiv.json`-Text (eingerückt, mit Zeilenende).
 * `catalogVersion` stammt aus dem aktiven Katalog.
 */
export function serialize(
  topology: Topology,
  catalog: Catalog,
  { settings, now = new Date() }: SerializeOptions = {},
): string {
  const file = {
    format: "ti-visualizer",
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    catalogVersion: catalog.meta.version,
    ...(settings && { settings }),
    topology,
  };
  return `${JSON.stringify(file, null, 2)}\n`;
}
