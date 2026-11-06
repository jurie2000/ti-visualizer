import { expect, test } from "@playwright/test";
import fc from "fast-check";
import { parse } from "../../src/persistence";
import { Topology } from "../../src/schema";
import { datei, katalog, knoten, PAYLOADS } from "./helpers";

/**
 * Fuzzing von `parse` mit Texten aus dem Injection-Korpus und Unicode-Tricks.
 * Der allgemeine Fuzz (zufälliger Text, verfälschte Dateien) steht in
 * `src/persistence/persistence.test.ts`; hier geht es um die Texte der Datei.
 */
const VERBORGEN = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u;
const trick = fc.constantFrom("‮", "​", "\u0000", " ", "﻿");
const text = fc
  .array(
    fc.oneof(
      fc.constantFrom(...PAYLOADS),
      trick,
      fc.string({ maxLength: 20, unit: "binary" }),
    ),
    { maxLength: 6 },
  )
  .map((a) => a.join("").slice(0, 90));

test.describe("fuzz", { tag: "@security" }, () => {
  test("parse wirft nie; Texte der Topologie ohne verborgene Zeichen; Object.prototype bleibt", async () => {
    const cat = await katalog();
    const vorher = Object.getOwnPropertyNames(Object.prototype).sort().join();
    fc.assert(
      fc.property(
        text,
        text,
        text,
        text,
        fc.constantFrom("__proto__", "constructor", "prototype", "x"),
        (name, beschreibung, bezeichnung, zone, schluessel) => {
          const roh = datei({
            name,
            description: beschreibung,
            nodes: [
              knoten("a", "kt", {
                label: bezeichnung,
                config: { workplace: bezeichnung },
              }),
            ],
            zones: [
              {
                id: "z",
                label: zone,
                tone: "sage",
                area: { x: 0, y: 0, w: 1, h: 1 },
              },
            ],
          }).replace('{"format"', `{"${schluessel}":{"polluted":1},"format"`);
          const r = parse(roh, cat);
          if (!r.ok) return; // Ablehnung mit Meldung ist erlaubt
          expect(Topology.safeParse(r.topology).success).toBe(true);
          const t = r.topology;
          const texte = [
            t.name,
            t.description.replaceAll("\n", ""),
            ...t.nodes.flatMap((n) => [
              n.label ?? "",
              n.config?.workplace ?? "",
            ]),
            ...t.zones.map((z) => z.label ?? ""),
          ];
          for (const s of texte) expect(VERBORGEN.test(s)).toBe(false);
          expect(Object.hasOwn(Object.prototype, "polluted")).toBe(false);
          expect(
            Object.getOwnPropertyNames(Object.prototype).sort().join(),
          ).toBe(vorher);
        },
      ),
      { numRuns: 300 },
    );
  });
});
