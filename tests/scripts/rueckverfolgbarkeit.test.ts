import { describe, expect, it } from "vitest";
import { pruefeRegelwerkKatalog } from "../../scripts/check-regelwerk-katalog.ts";
import { pruefeRueckverfolgbarkeit } from "../../scripts/check-traceability.ts";

const regelwerk = `
| ID | Regel | Meldung | Status | Quelle |
|---|---|---|---|---|
| K-1 | Regel eins | m | bestätigt | gemSpec_KT |
| K-2 | Regel zwei | m | plausibel (Hinweis) | DVO |
| V-3 | frei gewordene ID | m | offen | DVO |
`;
const tasks = (haken: string) =>
  `- [${haken}] **T-1 Karten** · FR: FR-1 · Regeln: K-1 bis K-2, V-3 · nach: –`;
const test = (titel: string) => [
  { datei: "a.test.ts", text: `it("${titel}", () => {});` },
];

describe("Rückverfolgbarkeits-Skripte (T-109)", () => {
  it("check-traceability: abgehakte Regel ohne Test ist ein Fehler, V-3 ist ausgenommen", () => {
    const ohne = pruefeRueckverfolgbarkeit(
      regelwerk,
      tasks("x"),
      test("[K-1] eins"),
    );
    expect(ohne.fehler).toEqual([expect.stringContaining("K-2")]);
    expect(ohne.bericht).toContain("**FEHLT**");
    expect(
      pruefeRueckverfolgbarkeit(regelwerk, tasks("x"), test("[K-1][K-2] x"))
        .fehler,
    ).toEqual([]);
    // Task offen: keine Pflicht
    expect(pruefeRueckverfolgbarkeit(regelwerk, tasks(" "), []).fehler).toEqual(
      [],
    );
  });

  it("check-regelwerk-katalog: abweichender Status, Quelle, fehlende und zusätzliche ID", () => {
    const k = (id: string, status: string, source: string[]) => ({
      id,
      status,
      source,
    });
    expect(
      pruefeRegelwerkKatalog(regelwerk, [
        k("K-1", "bestätigt", ["gemSpec_KT"]),
        k("K-2", "plausibel", ["DVO"]),
        k("V-3", "offen", ["DVO"]),
      ]),
    ).toEqual([]);
    const fehler = pruefeRegelwerkKatalog(regelwerk, [
      k("K-1", "plausibel", ["gemSpec_KT"]),
      k("V-3", "offen", []),
      k("K-9", "offen", []),
    ]);
    expect(fehler).toHaveLength(4);
  });
});
