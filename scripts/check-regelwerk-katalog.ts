// T-109: Regel-ID, Status und Quelle müssen in regelwerk.md und im Katalog
// übereinstimmen (plan.md, „Rückverfolgbarkeit“). Aufruf: pnpm check:katalog
import { readdirSync, readFileSync } from "node:fs";
import { ID, regelwerkRows } from "./regelwerk.ts";

// Familien, die der Katalog immer führt (T-104). Weitere kommen über die Katalogdaten dazu.
const KATALOG_FAMILIEN = ["G", "V", "X"];

export type KatalogRegel = { id: string; status?: string; source?: string[] };

/**
 * Vergleicht je Regel-Familie (Buchstabe), die im Katalog vorkommt. Familien
 * ohne Katalogeinträge (K …) liegen noch in der Engine und werden nicht
 * verlangt. P-8 bis P-15 (T-504) dürfen bis dahin im Katalog fehlen.
 */
export function pruefeRegelwerkKatalog(
  regelwerk: string,
  katalog: KatalogRegel[],
): string[] {
  const fehler: string[] = [];
  const soll = regelwerkRows(regelwerk);
  const familien = new Set([
    ...KATALOG_FAMILIEN,
    ...katalog.map((r) => r.id[0]),
  ]);
  const sortiert = (q: string[]) => [...q].sort().join(", ");
  for (const r of soll.filter((s) => familien.has(s.id[0]))) {
    const k = katalog.find((x) => x.id === r.id);
    if (!k) {
      fehler.push(`${r.id}: fehlt im Katalog`);
    } else {
      if (r.status === "?")
        fehler.push(`${r.id}: Status im Regelwerk unlesbar`);
      else if (k.status !== r.status)
        fehler.push(
          `${r.id}: Status ${k.status ?? "–"} im Katalog, ${r.status} im Regelwerk`,
        );
      if (sortiert(k.source ?? []) !== sortiert(r.source))
        fehler.push(
          `${r.id}: Quelle [${sortiert(k.source ?? [])}] im Katalog, [${sortiert(r.source)}] im Regelwerk`,
        );
    }
  }
  for (const k of katalog)
    if (!soll.some((s) => s.id === k.id))
      fehler.push(`${k.id}: steht im Katalog, aber nicht im Regelwerk`);
  return fehler;
}

/** Alle Objekte mit Regel-ID als `id` in den JSON-Dateien des aktiven Katalogs. */
export function katalogRegeln(wurzel = "catalog"): KatalogRegel[] {
  const aktiv = JSON.parse(readFileSync(`${wurzel}/active.json`, "utf8")) as {
    version: string;
  };
  const dir = `${wurzel}/${aktiv.version}`;
  const idForm = new RegExp(`^${ID.source}$`);
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .flatMap((f) => {
      const daten: unknown = JSON.parse(readFileSync(`${dir}/${f}`, "utf8"));
      return (Array.isArray(daten) ? (daten as unknown[]) : []).filter(
        (e): e is KatalogRegel =>
          typeof e === "object" &&
          e !== null &&
          "id" in e &&
          typeof e.id === "string" &&
          idForm.test(e.id),
      );
    });
}

if (import.meta.main) {
  const fehler = pruefeRegelwerkKatalog(
    readFileSync("docu/001-ti-visualizer-baukasten/regelwerk.md", "utf8"),
    katalogRegeln(),
  );
  for (const f of fehler) console.error(`FEHLER ${f}`);
  console.log(
    fehler.length
      ? `${String(fehler.length)} Abweichung(en) zwischen Regelwerk und Katalog`
      : "Regelwerk und Katalog stimmen überein",
  );
  process.exit(fehler.length ? 1 : 0);
}
