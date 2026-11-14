import { describe, expect, it } from "vitest";
import { pruefeRegelwerkKatalog } from "../../scripts/check-regelwerk-katalog.ts";

const regelwerk = `
| ID | Regel | Meldung | Status | Quelle |
|---|---|---|---|---|
| K-1 | Regel eins | m | bestätigt | gemSpec_KT |
| K-2 | Regel zwei | m | plausibel (Hinweis) | DVO |
| V-3 | frei gewordene ID | m | offen | DVO |
`;

describe("check-regelwerk-katalog", () => {
  it("abweichender Status, Quelle, fehlende und zusätzliche ID", () => {
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
    // ganze Familie V fehlt im Katalog
    expect(pruefeRegelwerkKatalog(regelwerk, [])).toEqual([
      expect.stringContaining("V-3"),
    ]);
  });
});
