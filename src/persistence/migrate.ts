import { TivFile } from "../schema";

/** Aktuelle `schemaVersion` der Dateien (einzige Quelle: `TivFile`). */
export const SCHEMA_VERSION: number = TivFile.shape.schemaVersion.value;

export type RawFile = Record<string, unknown>;
export type Migrations = Record<number, (file: RawFile) => RawFile>;

/**
 * Migrationskette: Eintrag `n` hebt eine Datei von Version `n` auf `n + 1`
 * und setzt `schemaVersion` nicht selbst. Schritte arbeiten auf JSON-Daten,
 * ändern die Eingabe nicht und prüfen nichts (das tut `parse` danach).
 * Bei einer neuen `schemaVersion` kommt hier der Schritt der alten Version dazu.
 */
export const MIGRATIONS: Migrations = {};

/**
 * Hebt eine Datei Schritt für Schritt auf `target`. Eine Datei auf `target`
 * bleibt unverändert (idempotent). `undefined`, wenn ein Schritt fehlt oder die
 * Datei neuer als `target` ist.
 */
export function migrate(
  file: RawFile,
  migrations: Migrations = MIGRATIONS,
  target: number = SCHEMA_VERSION,
): RawFile | undefined {
  let current = file;
  let version = current.schemaVersion;
  while (typeof version === "number" && version < target) {
    const step = Object.hasOwn(migrations, version)
      ? migrations[version]
      : undefined;
    if (!step) return undefined;
    current = { ...step(current), schemaVersion: version + 1 };
    version += 1;
  }
  return version === target ? current : undefined;
}
