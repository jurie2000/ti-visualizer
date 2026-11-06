import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { plugCard } from "../engine/cards";
import { autoPorts, validateConnection } from "../engine/rules";
import { loadCatalog, TivFile, type Topology } from "../schema";
import {
  fromFileSettings,
  MAX_FILE_BYTES,
  MESSAGES,
  migrate,
  parse,
  parseData,
  SCHEMA_VERSION,
  serialize,
  toFileSettings,
  type Migrations,
} from ".";

const catalog = loadCatalog();
const placeable = catalog.deviceTypes.filter((t) => t.placeable);

const base = (): Topology => ({
  name: "Test",
  description: "",
  simDate: "2026-11-01",
  nodes: [],
  edges: [],
  zones: [],
});
const node = (id: string, type: string) => ({
  id,
  type,
  fault: false,
  position: { x: 0, y: 0 },
});

/** Datei als Objekt, Topologie frei änderbar. */
const file = (t: unknown, extra: Record<string, unknown> = {}) => ({
  format: "ti-visualizer",
  schemaVersion: SCHEMA_VERSION,
  exportedAt: "2026-11-05T10:00:00.000Z",
  catalogVersion: catalog.meta.version,
  topology: t,
  ...extra,
});

function ok(data: unknown) {
  const r = parseData(data, catalog);
  if (!r.ok) throw new Error(r.reason);
  return r;
}

// Zufällige gültige Topologien aus den Engine-Funktionen
const opArb = fc.oneof(
  fc.record({
    op: fc.constant("node" as const),
    type: fc.constantFrom(...placeable.map((t) => t.id)),
    x: fc.integer({ min: -1000, max: 1000 }),
    fault: fc.boolean(),
    label: fc.option(fc.string({ maxLength: 20 }), { nil: undefined }),
  }),
  fc.record({
    op: fc.constant("edge" as const),
    a: fc.nat(30),
    b: fc.nat(30),
  }),
  fc.record({
    op: fc.constant("card" as const),
    n: fc.nat(30),
    kind: fc.constantFrom("egk", "hba", "smcb"),
  }),
);

type Op = typeof opArb extends fc.Arbitrary<infer T> ? T : never;

function build(ops: Op[], name: string): Topology {
  let t: Topology = { ...base(), name, description: `${name}!` };
  let n = 0;
  for (const o of ops) {
    if (o.op === "node") {
      const id = `${o.type}-${String(++n)}`;
      t = {
        ...t,
        nodes: [
          ...t.nodes,
          {
            ...node(id, o.type),
            position: { x: o.x, y: 5 },
            fault: o.fault,
            ...(o.label !== undefined && { label: o.label }),
          },
        ],
      };
    } else if (t.nodes.length > 0 && o.op === "edge") {
      const a = t.nodes[o.a % t.nodes.length];
      const b = t.nodes[o.b % t.nodes.length];
      const ports = a && b && autoPorts(t, a.id, b.id, catalog);
      if (a && b && ports) {
        const v = validateConnection(t, a.id, ports.a, b.id, ports.b, catalog);
        if (v.ok)
          t = {
            ...t,
            edges: [
              ...t.edges,
              {
                id: `e-${String(t.edges.length + 1)}`,
                fault: false,
                ends: [
                  { node: a.id, port: ports.a },
                  { node: b.id, port: ports.b },
                ],
              },
            ],
          };
      }
    } else if (t.nodes.length > 0 && o.op === "card") {
      const target = t.nodes[o.n % t.nodes.length];
      const card = { kind: o.kind, expires: "2030-01-01" };
      const r = target && plugCard(t, target.id, card, catalog);
      if (r?.ok) t = r.topology;
    }
  }
  return t;
}

describe("Speichern und Öffnen", () => {
  it("Speichern → Öffnen ergibt dieselbe Topologie (Property)", () => {
    fc.assert(
      fc.property(
        fc.array(opArb, { maxLength: 60 }),
        fc.string({ maxLength: 50 }),
        (ops, name) => {
          const t = build(ops, name);
          const r = ok(JSON.parse(serialize(t, catalog)));
          expect(r.topology).toEqual(t);
          expect(r.findings).toEqual([]);
          expect(r.settings).toBeUndefined();
          // auch über den Textweg
          const viaText = parse(serialize(t, catalog), catalog);
          expect(viaText).toMatchObject({ ok: true, topology: t });
        },
      ),
      { numRuns: 200 },
    );
  });

  it("serialize erzeugt eine Datei, die das Schema TivFile erfüllt, Einstellungen nur auf Wunsch", () => {
    const t = base();
    const plain = JSON.parse(serialize(t, catalog)) as Record<string, unknown>;
    expect(TivFile.safeParse(plain).success).toBe(true);
    expect(plain).not.toHaveProperty("settings");
    expect(plain.catalogVersion).toBe(catalog.meta.version);

    const settings = toFileSettings({
      theme: "dark",
      mode: "advanced",
      simSpeed: 9,
      pinnedPanels: [],
      reduceMotion: true,
      tutorialProgress: 3,
      solvedChallenges: ["a"],
      saveSettingsWithFile: true,
    });
    expect(settings).toMatchObject({ theme: "dunkel", simSpeed: 4 });
    const r = ok(JSON.parse(serialize(t, catalog, { settings })));
    expect(r.settings).toEqual(settings);
    expect(fromFileSettings(settings)).toMatchObject({
      theme: "dark",
      mode: "advanced",
      reduceMotion: true,
    });
  });

  it("Presets bestehen den Rundlauf ohne Befunde", () => {
    for (const p of catalog.presets) {
      const r = ok(JSON.parse(serialize(p.topology, catalog)));
      expect(r.topology, p.id).toEqual(p.topology);
      expect(r.findings, p.id).toEqual([]);
    }
  });
});

describe("Migration", () => {
  const chain: Migrations = {
    1: (f) => ({ ...f, a: 1 }),
    2: (f) => ({ ...f, b: (f.a as number) + 1 }),
  };
  it("Migration ist idempotent (Property)", () => {
    fc.assert(
      fc.property(
        fc.dictionary(fc.string({ maxLength: 6 }), fc.jsonValue(), {
          maxKeys: 5,
        }),
        fc.integer({ min: 1, max: 3 }),
        (rest, version) => {
          const input = { ...rest, schemaVersion: version };
          const once = migrate(input, chain, 3);
          expect(once?.schemaVersion).toBe(3);
          expect(migrate(once ?? {}, chain, 3)).toEqual(once);
          // Eingabe bleibt unverändert
          expect(input.schemaVersion).toBe(version);
        },
      ),
    );
  });

  it("läuft die Kette in Reihenfolge und meldet fehlende Schritte", () => {
    expect(migrate({ schemaVersion: 1 }, chain, 3)).toEqual({
      schemaVersion: 3,
      a: 1,
      b: 2,
    });
    expect(migrate({ schemaVersion: 1 }, {}, 2)).toBeUndefined();
    expect(migrate({ schemaVersion: 4 }, chain, 3)).toBeUndefined();
  });

  it("die aktuelle Version läuft unverändert durch", () => {
    const f = file(base());
    expect(migrate(f)).toEqual(f);
  });
});

describe("Ablehnung", () => {
  it("lehnt eine neuere schemaVersion mit Meldung ab", () => {
    const r = parseData(
      { ...file(base()), schemaVersion: SCHEMA_VERSION + 1 },
      catalog,
    );
    expect(r).toEqual({ ok: false, reason: MESSAGES.newer });
  });

  it.each([
    ["kein Objekt", "[]", MESSAGES.foreign],
    ["kein JSON", "{", MESSAGES.json],
    ["fremdes Format", '{"format":"x"}', MESSAGES.foreign],
    [
      "Version 0",
      JSON.stringify({ ...file(base()), schemaVersion: 0 }),
      MESSAGES.version,
    ],
    [
      "ohne Topologie",
      JSON.stringify({ ...file(base()), topology: undefined }),
      MESSAGES.noTopology,
    ],
    [
      "nur Einstellungen",
      JSON.stringify({ ...file(undefined), settings: {} }),
      MESSAGES.noTopology,
    ],
  ])("%s", (_n, text, reason) => {
    expect(parse(text, catalog)).toEqual({ ok: false, reason });
  });

  it("lehnt zu große Dateien und zu viele Elemente ab", () => {
    expect(parse(" ".repeat(MAX_FILE_BYTES + 1), catalog)).toEqual({
      ok: false,
      reason: MESSAGES.tooBig,
    });
    const nodes = Array.from({ length: 501 }, (_, i) =>
      node(`k${String(i)}`, "kt"),
    );
    expect(parseData(file({ ...base(), nodes }), catalog).ok).toBe(false);
  });

  it("fängt tief verschachteltes JSON ab", () => {
    const deep = "[".repeat(200_000) + "]".repeat(200_000);
    expect(parse(deep, catalog).ok).toBe(false);
  });

  it("lehnt ungültigen Namen ab (zu lang)", () => {
    expect(
      parseData(file({ ...base(), name: "x".repeat(101) }), catalog).ok,
    ).toBe(false);
  });
});

describe("Importbefunde", () => {
  const codes = (data: unknown) =>
    ok(data).findings.map((f) => `${f.code}:${f.ref ?? ""}`);
  const port = (type: string) =>
    catalog.deviceTypes.find((t) => t.id === type)?.ports ?? [];

  it("unbekannter Gerätetyp: Gerät und seine Kanten fehlen, Befunde nennen sie", () => {
    const r = ok(
      file({
        ...base(),
        nodes: [node("a", "kt"), node("x", "gibt-es-nicht")],
        edges: [
          {
            id: "e1",
            fault: false,
            ends: [
              { node: "a", port: port("kt")[0]?.id },
              { node: "x", port: "p" },
            ],
          },
        ],
      }),
    );
    expect(r.topology.nodes.map((n) => n.id)).toEqual(["a"]);
    expect(r.topology.edges).toEqual([]);
    expect(r.findings.map((f) => f.code)).toEqual([
      "unbekannterTyp",
      "verweis",
    ]);
    expect(r.findings[0]?.message).toContain("gibt-es-nicht");
  });

  it("Karten sind keine Geräte", () => {
    const card = catalog.deviceTypes.find((t) => !t.placeable);
    if (!card) return;
    const r = ok(file({ ...base(), nodes: [node("c", card.id)] }));
    expect(r.topology.nodes).toEqual([]);
  });

  it("doppelte ID, ungültiges Element, unbekanntes Feld", () => {
    const r = ok(
      file({
        ...base(),
        nodes: [
          node("a", "kt"),
          node("a", "kt"),
          { ...node("b", "kt"), extra: 1 },
          { id: "c" },
        ],
      }),
    );
    expect(r.topology.nodes.map((n) => n.id)).toEqual(["a", "b"]);
    expect(r.findings.map((f) => f.code).sort()).toEqual([
      "doppelteId",
      "unbekanntesFeld",
      "ungueltig",
    ]);
  });

  it("Anschluss fehlt, Einzelanschluss doppelt belegt, multi erlaubt mehrere", () => {
    const withMulti = placeable.flatMap((t) =>
      t.ports.filter((p) => p.multi).map((p) => ({ t, p })),
    )[0];
    const single = placeable.flatMap((t) =>
      t.ports.filter((p) => !p.multi).map((p) => ({ t, p })),
    )[0];
    expect(single).toBeDefined();
    if (!single) return;
    const edge = (
      id: string,
      a: string,
      pa: string,
      b: string,
      pb: string,
    ) => ({
      id,
      fault: false,
      ends: [
        { node: a, port: pa },
        { node: b, port: pb },
      ],
    });
    const free = (type: string) => port(type)[0]?.id ?? "p";
    const nodes = [
      node("a", single.t.id),
      node("b", single.t.id),
      node("c", single.t.id),
    ];
    const t = {
      ...base(),
      nodes,
      edges: [
        edge("e1", "a", single.p.id, "b", single.p.id),
        edge("e2", "a", single.p.id, "c", single.p.id),
        edge("e3", "a", "gibtsnicht", "c", free(single.t.id)),
      ],
    };
    const r = ok(file(t));
    expect(r.topology.edges.map((e) => e.id)).toEqual(["e1"]);
    expect(r.findings.map((f) => f.code)).toEqual(["anschluss", "anschluss"]);

    if (withMulti) {
      const m = withMulti;
      const mt = {
        ...base(),
        nodes: [node("a", m.t.id), node("b", m.t.id), node("c", m.t.id)],
        edges: [
          edge("e1", "a", m.p.id, "b", m.p.id),
          edge("e2", "a", m.p.id, "c", m.p.id),
        ],
      };
      expect(ok(file(mt)).topology.edges).toHaveLength(2);
    }
  });

  it("dasselbe Kantenende zweimal am Einzelanschluss wird abgelehnt", () => {
    const single = placeable.flatMap((t) =>
      t.ports.filter((p) => !p.multi).map((p) => ({ t, p })),
    )[0];
    if (!single) return;
    const r = ok(
      file({
        ...base(),
        nodes: [node("a", single.t.id)],
        edges: [
          {
            id: "e1",
            fault: false,
            ends: [
              { node: "a", port: single.p.id },
              { node: "a", port: single.p.id },
            ],
          },
        ],
      }),
    );
    expect(r.topology.edges).toEqual([]);
  });

  it("Karten: nur wo der Katalog Steckplätze kennt, sonst Befund", () => {
    const noSlot = placeable.find(
      (t) =>
        !t.capabilities.includes("cardSlots") &&
        !t.capabilities.includes("nfcCard"),
    );
    const slot = placeable.find((t) => t.capabilities.includes("cardSlots"));
    if (!noSlot || !slot) throw new Error("Katalog ohne passende Typen");
    const egk = { kind: "egk", expires: "2030-01-01" };
    const r = ok(
      file({
        ...base(),
        nodes: [
          { ...node("a", noSlot.id), cards: [egk] },
          { ...node("b", slot.id), cards: [egk, egk] },
          { ...node("c", slot.id), cards: [{ ...egk, id: "k1" }] },
          { ...node("d", slot.id), cards: [{ ...egk, id: "k1" }] },
        ],
      }),
    );
    expect(r.topology.nodes.map((n) => n.cards?.length ?? 0)).toEqual([
      0, 1, 1, 0,
    ]);
    expect(r.findings.map((f) => f.ref)).toEqual(["a", "b", "d"]);
  });

  it("eGK per NFC: PIN-Einwilligung wird zurückgenommen und gemeldet, ohne Einwilligung nicht", () => {
    const nfc = placeable.find((t) => t.capabilities.includes("nfcCard"));
    if (!nfc) throw new Error("Katalog ohne NFC-Gerät");
    const egk = { kind: "egk", expires: "2030-01-01" };
    const run = (c: object) =>
      ok(file({ ...base(), nodes: [{ ...node("a", nfc.id), cards: [c] }] }));
    const asked = run({ ...egk, pinActive: true });
    expect(asked.findings.map((f) => f.severity)).toEqual(["Hinweis"]);
    expect(asked.topology.nodes[0]?.cards?.[0]).toMatchObject({
      pinActive: false,
    });
    expect(run(egk).findings).toEqual([]);
  });

  it("Konfiguration nur bei passender Fähigkeit", () => {
    const withCfg = placeable.find((t) =>
      t.capabilities.some((c) => c.startsWith("netConfig:")),
    );
    const without = placeable.find(
      (t) => !t.capabilities.some((c) => c.startsWith("netConfig:")),
    );
    if (!withCfg || !without) throw new Error("Katalog ohne passende Typen");
    const r = ok(
      file({
        ...base(),
        nodes: [
          { ...node("a", withCfg.id), config: { ip: "10.0.0.1" } },
          { ...node("b", without.id), config: { ip: "10.0.0.2" } },
        ],
      }),
    );
    expect(r.topology.nodes[0]?.config).toEqual({ ip: "10.0.0.1" });
    expect(r.topology.nodes[1]?.config).toBeUndefined();
    expect(r.findings.map((f) => f.code)).toEqual(["konfiguration"]);
  });

  it("abweichende catalogVersion: Hinweis und Regelprüfung der Verbindungen", () => {
    // Zwei Geräte, deren Paar der Katalog nicht erlaubt
    const pairs = placeable.flatMap((a) =>
      placeable.map((b) => [a, b] as const),
    );
    const bad = pairs.find(([a, b]) => {
      const t: Topology = {
        ...base(),
        nodes: [node("a", a.id), node("b", b.id)],
      };
      const pa = a.ports[0];
      const pb = b.ports[0];
      return (
        pa &&
        pb &&
        a.id !== b.id &&
        !validateConnection(t, "a", pa.id, "b", pb.id, catalog).ok
      );
    });
    if (!bad) throw new Error("kein unerlaubtes Paar gefunden");
    const [a, b] = bad;
    const t = {
      ...base(),
      nodes: [node("a", a.id), node("b", b.id)],
      edges: [
        {
          id: "e1",
          fault: false,
          ends: [
            { node: "a", port: a.ports[0]?.id },
            { node: "b", port: b.ports[0]?.id },
          ],
        },
      ],
    };
    const same = ok(file(t));
    expect(same.findings).toEqual([]);
    const other = ok(file(t, { catalogVersion: "0-alt" }));
    expect(other.topology.edges).toHaveLength(1);
    expect(other.findings.map((f) => f.code)).toEqual([
      "katalogversion",
      "regel",
    ]);
    expect(other.catalogVersion).toBe("0-alt");
    expect(other.findings[1]?.ref).toBe("e1");
  });

  it("Einstellungen: übernommen, wenn gültig, sonst Befund", () => {
    const s = toFileSettings({
      theme: "system",
      mode: "simple",
      simSpeed: 1,
      pinnedPanels: [],
      reduceMotion: false,
      tutorialProgress: 0,
      solvedChallenges: [],
      saveSettingsWithFile: false,
    });
    expect(ok(file(base(), { settings: s })).settings).toEqual(s);
    expect(codes(file(base(), { settings: { theme: "<b>" } }))).toEqual([
      "einstellungen:",
    ]);
  });
});

describe("Eingabeprüfung an der Vertrauensgrenze", () => {
  it("__proto__, constructor, prototype werden nicht übernommen und genannt", () => {
    const text = `{"__proto__":{"polluted":1},"format":"ti-visualizer","schemaVersion":${String(SCHEMA_VERSION)},
      "exportedAt":"2026-11-05T10:00:00.000Z","catalogVersion":"${catalog.meta.version}",
      "constructor":{"prototype":{"polluted":1}},
      "topology":{"name":"x","description":"","simDate":"2026-11-01","zones":[],"edges":[],
        "nodes":[{"id":"a","type":"kt","fault":false,"position":{"x":0,"y":0,"__proto__":{"polluted":1}},
                  "constructor":{"prototype":{"polluted":1}},"prototype":1}]}}`;
    const r = parse(text, catalog);
    if (!r.ok) throw new Error(r.reason);
    const msgs = r.findings.map((f) => f.message).join("\n");
    expect(msgs).toContain("__proto__");
    expect(msgs).toContain("constructor");
    expect(msgs).toContain("prototype");
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.hasOwn(r.topology.nodes[0] ?? {}, "constructor")).toBe(false);
    expect(Object.getPrototypeOf(r.topology.nodes[0])).toBe(Object.prototype);
  });

  it("Skript und HTML in Texten bleiben Text, feste Werte für tone", () => {
    const evil = "<img src=x onerror=alert(1)>";
    const r = ok(
      file({
        ...base(),
        name: evil,
        zones: [
          {
            id: "z",
            label: evil,
            tone: "sage",
            area: { x: 0, y: 0, w: 1, h: 1 },
          },
          {
            id: "z2",
            tone: "red;background:url(javascript:1)",
            area: { x: 0, y: 0, w: 1, h: 1 },
          },
        ],
      }),
    );
    expect(r.topology.name).toBe(evil);
    expect(r.topology.zones.map((z) => z.id)).toEqual(["z"]);
    expect(r.findings.map((f) => f.code)).toEqual(["ungueltig"]);
  });

  it("zufälliger Text wirft nie (Fuzz)", () => {
    fc.assert(
      fc.property(fc.oneof(fc.string(), fc.json()), (text) => {
        expect(() => parse(text, catalog)).not.toThrow();
      }),
      { numRuns: 300 },
    );
  });

  it("zufällig verfälschte gültige Dateien werfen nie und liefern eine gültige Topologie", () => {
    const valid = JSON.parse(
      serialize(catalog.presets[0]?.topology ?? base(), catalog),
    ) as unknown;
    const mutate = (v: unknown, pick: number): unknown => {
      if (Array.isArray(v))
        return (v as unknown[]).map((x, i) =>
          i === pick % v.length ? mutate(x, pick) : x,
        );
      if (typeof v === "object" && v !== null) {
        const e = Object.entries(v);
        return Object.fromEntries<unknown>(
          e.map(([k, x], i) => [
            k,
            i === pick % e.length ? mutate(x, pick + 1) : x,
          ]),
        );
      }
      return pick % 2 ? null : 12345;
    };
    fc.assert(
      fc.property(fc.nat(10_000), (pick) => {
        const r = parseData(mutate(valid, pick), catalog);
        if (r.ok) expect(r.topology.nodes.length).toBeLessThanOrEqual(500);
      }),
      { numRuns: 300 },
    );
  });
});
