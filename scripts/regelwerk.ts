// Gemeinsamer Leser für regelwerk.md (T-109). Liest nur Regel-IDs, Status und
// Quelle aus den Tabellen, keine Inhalte wie Gerätelisten.

export const ID = /[A-Z]-\d+[a-z]?/;
export const IDS_FREI = ["V-1", "V-2", "V-3", "V-11", "V-13", "G-5"];

export type Row = {
  id: string;
  cells: string[];
  status: string;
  source: string[];
};

// Kürzel im Regelwerk -> Quellen-ID im Katalog.
const alias: Record<string, string[]> = {
  "keine (Editorregel)": ["editor"],
  "FP Konnektor/TI-Gateway": ["FP_Konnektor"],
  "keine (Simulation)": ["editor"],
  keine: ["editor"],
  "gemF_Laufzeitverlängerung_gSMC-K": ["gemF_Laufzeitverlaengerung_gSMC-K"],
};

const quellen = (cell: string): string[] =>
  cell.startsWith("keine")
    ? (alias[cell] ?? [])
    : cell.split(", ").flatMap((q) => alias[q] ?? [q]);

/** Zeilen `| ID | … | Status | Quelle |` aller Regel-Tabellen. */
export function regelwerkRows(text: string): Row[] {
  const rows = text
    .split("\n")
    .filter((l) => new RegExp(`^\\| ${ID.source} \\|`).test(l))
    .map((l) =>
      l
        .split("|")
        .slice(1, -1)
        .map((c) => c.trim()),
    )
    .map((cells) => ({
      id: cells[0] ?? "",
      cells,
      status:
        /^(bestätigt|plausibel|Vereinfachung|offen)/.exec(
          cells[cells.length - 2] ?? "",
        )?.[1] ?? "?",
      source: quellen(cells[cells.length - 1] ?? ""),
    }));
  // „siehe X-1“ (V-10) und „X-1“ (P-32) übernehmen die Quellen von X-1
  const x1 = rows.find((r) => r.id === "X-1")?.source ?? [];
  return rows.map((r) => ({
    ...r,
    source: r.source.flatMap((q) =>
      q === "siehe X-1" || q === "X-1" ? x1 : [q],
    ),
  }));
}

/** Alle Regel-IDs: Tabellenzeilen und Aufzählung `- **A-1** …` (2.3). */
export function regelwerkIds(text: string): string[] {
  const ids = [
    ...regelwerkRows(text).map((r) => r.id),
    ...[
      ...text.matchAll(new RegExp(`^- \\*\\*(${ID.source})\\*\\*`, "gm")),
    ].map((m) => m[1] ?? ""),
  ];
  return [...new Set(ids)];
}
