import { describe, expect, it } from "vitest";
import { catalogSchema, checkReferences, type Catalog } from "./catalog";
import { loadCatalog } from "./loadCatalog";

const base = { source: ["arch"], status: "bestätigt" } as const;

// Kleiner, in sich stimmiger Katalog als Ausgangspunkt für die Negativbeispiele.
const valid = {
  active: { version: "1" },
  meta: { version: "1", date: "2026-11-05", note: "" },
  categories: [
    {
      id: "lokal",
      name: "Lokal",
      color: "#0a0",
      colorDark: "#6c6",
      shape: "rect",
      order: 1,
    },
  ],
  deviceTypes: [
    {
      id: "pvs",
      abbr: "PVS",
      name: "PVS",
      category: "lokal",
      icon: "monitor",
      visibleSimple: true,
      capabilities: ["netConfig:client"],
      ports: [
        { id: "eth0", name: "Ethernet0", kind: "eth", multi: false, ...base },
      ],
      ...base,
    },
    {
      id: "kon",
      abbr: "Kon",
      name: "Konnektor",
      category: "lokal",
      icon: "box",
      visibleSimple: true,
      capabilities: ["zugang"],
      ports: [{ id: "lan", name: "LAN", kind: "eth", multi: true, ...base }],
      ...base,
    },
  ],
  portKinds: {
    kinds: [{ id: "eth", name: "Ethernet", ...base }],
    compatible: [{ a: "eth", b: "eth", ...base }],
  },
  connectionRules: [
    {
      id: "R-1",
      a: { types: ["pvs"] },
      b: { capability: "zugang" },
      visibleSimple: true,
      ...base,
    },
  ],
  reasonRules: [
    {
      id: "V-1",
      a: { types: ["pvs"] },
      b: { types: ["pvs"] },
      message: "Nein.",
      ...base,
    },
  ],
  baseChecks: [{ id: "G-1", check: "self", message: "Nein.", ...base }],
  exclusionRules: [
    {
      id: "X-1",
      exclusive: [{ types: ["kon"] }, { types: ["pvs"] }],
      message: "Nein.",
      ...base,
    },
  ],
  protocols: {
    connectionKinds: [
      { id: "phys", name: "Physisch", meaning: "Kabel", lineStyle: "solid" },
    ],
    protocols: [
      {
        id: "soap",
        a: { types: ["pvs"] },
        b: { capability: "zugang" },
        label: "SOAP",
        protocol: "SOAP, XML",
        netPort: "443",
        tls: true,
        ...base,
      },
    ],
  },
  actions: [
    {
      id: "vsdm",
      name: "VSDM",
      offeredBy: { types: ["pvs"] },
      requires: {
        all: [{ need: "zugang" }, { card: "egk" }, { service: "kon" }],
      },
      flow: "vsdm",
      ...base,
    },
  ],
  flows: [
    {
      id: "vsdm",
      name: "VSDM",
      steps: [
        {
          from: "P",
          to: "K",
          label: "ReadVSD",
          text: "Text",
          protocol: "soap",
        },
      ],
      ...base,
    },
  ],
  configDefaults: [
    {
      field: "mask",
      name: "Netzmaske",
      default: "255.255.255.0",
      rule: "",
      ...base,
    },
  ],
  checks: [
    {
      id: "P-4",
      name: "Kein Zugang",
      severity: "Warnung",
      onlyAdvanced: false,
      when: { not: { present: "kon" } },
      ...base,
    },
  ],
  challenges: [
    {
      id: "1",
      title: "T",
      preset: "praxis",
      violatedChecks: ["P-4"],
      goalActions: ["vsdm"],
      ...base,
    },
  ],
  presets: [
    {
      id: "praxis",
      topology: {
        name: "Praxis",
        description: "",
        simDate: "2026-11-01",
        nodes: [
          { id: "a", type: "pvs", position: { x: 0, y: 0 }, fault: false },
          { id: "b", type: "kon", position: { x: 1, y: 0 }, fault: false },
        ],
        edges: [
          {
            id: "e1",
            ends: [
              { node: "a", port: "eth0" },
              { node: "b", port: "lan" },
            ],
            fault: false,
          },
        ],
        zones: [],
      },
      ...base,
    },
  ],
  tutorial: { personas: [], steps: [] },
  glossary: [{ term: "TI", text: "Telematikinfrastruktur", ...base }],
  sources: [{ id: "arch", title: "Arch", url: "https://gemspec.gematik.de/" }],
};

const parse = (c: unknown): Catalog => catalogSchema.parse(c);
/** Setzt (oder löscht bei `undefined`) einen Wert per Pfad in einer Kopie des Katalogs. */
function patch(path: string, value: unknown): unknown {
  const c: unknown = structuredClone(valid);
  const keys = path.split(".");
  const last = keys.pop() as string;
  let o = c as Record<string, unknown>;
  for (const k of keys) o = o[k] as Record<string, unknown>;
  if (value === undefined) Reflect.deleteProperty(o, last);
  else o[last] = value;
  return c;
}

describe("Katalog-Schema (D5, D13)", () => {
  it("nimmt einen stimmigen Katalog an", () => {
    expect(checkReferences(parse(valid))).toEqual([]);
  });

  it.each([
    ["fehlendes source", "deviceTypes.0.source", undefined],
    ["leeres source", "connectionRules.0.source", []],
    ["fehlender status", "reasonRules.0.status", undefined],
    ["unbekannter status", "checks.0.status", "geraten"],
    ["leere Anschlussarten", "connectionRules.0.kinds", { a: [] }],
    ["Tippfehler in kinds", "connectionRules.0.kinds", { c: ["eth"] }],
    ["Code statt Ausdruck", "actions.0.requires", "return true"],
    ["unbekanntes Feld", "categories.0.farbe", "rot"],
    ["Anschluss ohne Quelle", "deviceTypes.0.ports.0.source", undefined],
    ["Kategorie ohne Dunkelfarbe", "categories.0.colorDark", undefined],
    ["Gerätetyp ohne Kurzname", "deviceTypes.0.abbr", undefined],
    ["Quellen-URL ohne https", "sources.0.url", "http://x.de"],
  ])("lehnt ab: %s", (_, path, value) => {
    expect(() => parse(patch(path, value))).toThrow();
  });
});

describe("Referenzen (D5)", () => {
  it.each([
    [
      "Regel mit unbekanntem Gerätetyp",
      "connectionRules.0.a",
      { types: ["nix"] },
      "„nix“",
    ],
    [
      "Regel mit unbekannter Fähigkeit",
      "reasonRules.0.b",
      { capability: "nix" },
      "Fähigkeit",
    ],
    [
      "Begründungsregel mit unbekanntem Gerätetyp in der Ausnahme",
      "reasonRules.0.except",
      [{ a: { types: ["nix"] }, b: { types: ["pvs"] } }],
      "„nix“",
    ],
    [
      "Anschluss mit unbekannter Art",
      "deviceTypes.0.ports.0.kind",
      "nix",
      "Anschlussart",
    ],
    [
      "Erlaubnisregel mit unbekannter Anschlussart",
      "connectionRules.0.kinds",
      { b: ["nix"] },
      "Anschlussart",
    ],
    [
      "Verträglichkeit mit unbekannter Art",
      "portKinds.compatible.0.b",
      "nix",
      "Anschlussart",
    ],
    [
      "Anschluss mit unbekannter Quelle",
      "deviceTypes.0.ports.0.source",
      ["nix"],
      "Quelle",
    ],
    [
      "Eintrag mit unbekannter Quelle",
      "protocols.protocols.0.source",
      ["nix"],
      "Quelle",
    ],
    ["Aktion mit unbekanntem Ablauf", "actions.0.flow", "nix", "Ablauf"],
    [
      "Voraussetzung mit unbekanntem Dienst",
      "actions.0.requires",
      { service: "nix" },
      "Gerätetyp",
    ],
    [
      "Ablaufschritt mit unbekanntem Protokoll",
      "flows.0.steps.0.protocol",
      "nix",
      "Protokoll",
    ],
    [
      "Herausforderung mit unbekannter Prüfregel",
      "challenges.0.violatedChecks",
      ["nix"],
      "Prüfregel",
    ],
    [
      "Preset-Kante an unbekanntem Anschluss",
      "presets.0.topology.edges.0.ends.0.port",
      "nix",
      "Anschluss",
    ],
    [
      "Preset belegt einen Einzelanschluss doppelt",
      "presets.0.topology.edges",
      [0, 1].map((i) => ({
        id: `e${String(i)}`,
        ends: [
          { node: "a", port: "eth0" },
          { node: "b", port: "lan" },
        ],
        fault: false,
      })),
      "nicht mehrfach",
    ],
    ["doppelte ID", "sources.1", valid.sources[0], "doppelte ID"],
  ])("meldet: %s", (_, path, value, part) => {
    const errors = checkReferences(parse(patch(path, value)));
    expect(errors.join("\n")).toContain(part);
  });
});

describe("Preset-Anschlüsse", () => {
  it("meldet einen Mehrfachanschluss mit zwei Kanten nicht", () => {
    // zwei Kanten am Mehrfachanschluss b.lan (Selbstkante genügt für die Prüfung)
    const edge = (id: string) => ({
      id,
      ends: [
        { node: "b", port: "lan" },
        { node: "b", port: "lan" },
      ],
      fault: false,
    });
    const errors = checkReferences(
      parse(patch("presets.0.topology.edges", [edge("e1"), edge("e2")])),
    );
    expect(errors).toEqual([]);
  });
});

describe("Loader", () => {
  it("lädt den gebündelten aktiven Katalog, Schemas und Referenzen stimmen", () => {
    expect(checkReferences(loadCatalog())).toEqual([]);
  });

  it("scheitert an einer fehlenden Katalogdatei", () => {
    expect(() =>
      loadCatalog({
        "/catalog/active.json": { version: "1" },
        "/catalog/1/meta.json": valid.meta,
      }),
    ).toThrow();
  });
});
