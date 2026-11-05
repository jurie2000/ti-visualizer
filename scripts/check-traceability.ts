// T-109 (D30): Jede Regel abgehakter Tasks braucht einen Test mit der ID im
// Namen, z. B. it("[K-3] …"). Schreibt außerdem den Bericht
// „Regel → Test“ und „FR → Tasks → Tests“ nach reports/traceability.md.
// Aufruf: pnpm check:rueckverfolgbarkeit
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ID, IDS_FREI, regelwerkIds } from "./regelwerk.ts";

export type Task = {
  id: string;
  erledigt: boolean;
  fr: string[];
  regeln: string[];
  /** einzeln genannte Regel-IDs (keine Bereiche), für die Tippfehlerprüfung */
  einzeln: string[];
};
export type Testdatei = { datei: string; text: string };

const FR_ANZAHL = 22; // plan.md: „Das Skript prüft FR-1 bis FR-22“
const RANGE = /^([A-Z]+)-(\d+) bis \1-(\d+)$/;
const IDFORM = new RegExp(`^(FR-\\d+|${ID.source})$`);

/** „V-4 bis V-6, V-12“ wird zu V-4, V-5, V-6, V-12. Fließtext fällt weg. */
function aufzaehlen(feld: string): { alle: string[]; einzeln: string[] } {
  const alle: string[] = [];
  const einzeln: string[] = [];
  for (const t of feld.split(", ")) {
    const r = RANGE.exec(t);
    if (r) {
      const [, p = "", von = "0", bis = "0"] = r;
      for (let n = +von; n <= +bis; n++) alle.push(`${p}-${String(n)}`);
    } else if (IDFORM.test(t)) {
      alle.push(t);
      einzeln.push(t);
    }
  }
  return { alle, einzeln };
}

/** Task-Zeilen `- [x] **T-104 Titel** … · FR: … · Regeln: … · nach:`. */
export function leseTasks(text: string): Task[] {
  return text.split("\n").flatMap((zeile) => {
    const kopf = /^- \[( |x)\] \*\*(T-\d+[a-z]?)[ *]/.exec(zeile);
    const felder = /· FR: (.*?) · Regeln: (.*?)(?: · nach:|$)/.exec(zeile);
    if (!kopf || !felder) return [];
    const regeln = aufzaehlen(felder[2] ?? "");
    return [
      {
        id: kopf[2] ?? "",
        erledigt: kopf[1] === "x",
        fr: aufzaehlen(felder[1] ?? "").alle,
        regeln: regeln.alle,
        einzeln: regeln.einzeln,
      },
    ];
  });
}

/** Regel-IDs aus Testnamen: it("[K-3] …"), test(…), it.skip(…), it.only(…). */
export function testIds(dateien: Testdatei[]): Map<string, string[]> {
  const treffer = new Map<string, string[]>();
  const titel = /\b(?:it|test)(?:\.\w+)*\(\s*(["'`])((?:\\.|(?!\1).)*)\1/g;
  for (const { datei, text } of dateien)
    for (const t of text.matchAll(titel))
      for (const m of (t[2] ?? "").matchAll(
        new RegExp(`\\[(${ID.source})\\]`, "g"),
      )) {
        const id = m[1] ?? "";
        const liste = treffer.get(id) ?? [];
        if (!liste.includes(datei)) treffer.set(id, [...liste, datei]);
      }
  return treffer;
}

export function pruefeRueckverfolgbarkeit(
  regelwerk: string,
  tasksText: string,
  tests: Testdatei[],
): { fehler: string[]; bericht: string } {
  const bekannt = new Set(regelwerkIds(regelwerk));
  const frei = new Set(IDS_FREI);
  const tasks = leseTasks(tasksText);
  const mitTest = testIds(tests);
  const fehler: string[] = [];

  // je Regel: Tasks, die sie nennen (Bereiche nur auf bekannte IDs)
  const tasksJeRegel = new Map<string, Task[]>();
  for (const t of tasks) {
    for (const id of t.einzeln)
      if (!bekannt.has(id) && !frei.has(id))
        fehler.push(`${t.id}: nennt unbekannte Regel ${id}`);
    for (const id of t.regeln.filter((r) => bekannt.has(r)))
      tasksJeRegel.set(id, [...(tasksJeRegel.get(id) ?? []), t]);
  }

  const zeilen = [...bekannt].map((id) => {
    const ts = tasksJeRegel.get(id) ?? [];
    const dateien = mitTest.get(id) ?? [];
    const abgehakt = ts.some((t) => t.erledigt);
    let ergebnis = "offen";
    if (frei.has(id)) ergebnis = "frei (ausgenommen)";
    else if (!ts.length) ergebnis = "ohne Task";
    else if (abgehakt && dateien.length) ergebnis = "ok";
    else if (abgehakt) {
      ergebnis = "**FEHLT**";
      fehler.push(
        `${id}: Task ${ts
          .filter((t) => t.erledigt)
          .map((t) => t.id)
          .join(", ")} abgehakt, aber kein Test mit [${id}] im Namen`,
      );
    }
    return { id, ts, dateien, ergebnis };
  });

  const stand = (t: Task) => `${t.id}${t.erledigt ? " (erledigt)" : ""}`;
  const bericht = [
    "# Rückverfolgbarkeit",
    "",
    "Erzeugt von `scripts/check-traceability.ts`. Geprüft werden nur Regeln",
    "abgehakter Tasks.",
    "",
    "## Regel → Test",
    "",
    "| Regel | Tasks | Tests | Ergebnis |",
    "|---|---|---|---|",
    ...zeilen.map(
      (z) =>
        `| ${z.id} | ${z.ts.map(stand).join(", ") || "–"} | ${z.dateien.join(", ") || "–"} | ${z.ergebnis} |`,
    ),
    "",
    "## FR → Tasks → Tests",
    "",
    "| FR | Tasks | Regeln mit Test |",
    "|---|---|---|",
    ...Array.from({ length: FR_ANZAHL }, (_, i) => {
      const fr = `FR-${String(i + 1)}`;
      const ts = tasks.filter((t) => t.fr.includes(fr));
      const regeln = [...new Set(ts.flatMap((t) => t.regeln))].filter((r) =>
        bekannt.has(r),
      );
      const belegt = regeln.filter((r) => mitTest.has(r));
      return `| ${fr} | ${ts.map(stand).join(", ") || "**kein Task**"} | ${String(belegt.length)} von ${String(regeln.length)}${belegt.length ? ": " + belegt.join(", ") : ""} |`;
    }),
    "",
  ].join("\n");
  return { fehler, bericht };
}

function dateien(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? dateien(join(dir, e.name))
      : /\.(test|spec)\.tsx?$/.test(e.name)
        ? [join(dir, e.name)]
        : [],
  );
}

if (import.meta.main) {
  const spec = "specs/001-ti-visualizer-baukasten";
  const { fehler, bericht } = pruefeRueckverfolgbarkeit(
    readFileSync(`${spec}/regelwerk.md`, "utf8"),
    readFileSync(`${spec}/tasks.md`, "utf8"),
    ["src", "tests"]
      .flatMap(dateien)
      .map((datei) => ({ datei, text: readFileSync(datei, "utf8") })),
  );
  mkdirSync("reports", { recursive: true });
  writeFileSync("reports/traceability.md", bericht);
  for (const f of fehler) console.error(`FEHLER ${f}`);
  console.log(
    fehler.length
      ? `${String(fehler.length)} Rückverfolgbarkeits-Fehler, Bericht: reports/traceability.md`
      : "Rückverfolgbarkeit ok, Bericht: reports/traceability.md",
  );
  process.exit(fehler.length ? 1 : 0);
}
