import { catalogSchema, type Catalog } from "./catalog";

// Vite bündelt alle Katalogdateien beim Build ein, zur Laufzeit gibt es keinen
// Netzwerkzugriff (D1, D2). Als Funktion, damit Node (E2E-Tests importieren
// `src/`) das Modul laden kann, ohne `import.meta.glob` auszuführen.
const files = () =>
  import.meta.glob<unknown>(["/catalog/active.json", "/catalog/*/*.json"], {
    eager: true,
    import: "default",
  });

const camel = (name: string) =>
  name.replace(/-(\w)/g, (_, c: string) => c.toUpperCase());

/** Setzt den aktiven Katalog aus den gebündelten Dateien zusammen und prüft ihn gegen die Schemas. */
export function loadCatalog(
  bundle: Record<string, unknown> = files(),
): Catalog {
  const active = bundle["/catalog/active.json"] as { version: string };
  const raw: Record<string, unknown> = { active };
  const prefix = `/catalog/${active.version}/`;
  for (const [path, json] of Object.entries(bundle)) {
    if (path.startsWith(prefix))
      raw[camel(path.slice(prefix.length, -".json".length))] = json;
  }
  return catalogSchema.parse(raw);
}
