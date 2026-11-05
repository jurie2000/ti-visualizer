import { z } from "zod";

// Zod-Schemas des Katalogs (D13, plan.md „Katalog“). Alle Objekte sind strikt,
// damit Tippfehler in den JSON-Dateien auffallen (D5).

const Id = z.string().min(1);
const Text = z.string().min(1);

export const Status = z.enum([
  "bestätigt",
  "plausibel",
  "Vereinfachung",
  "offen",
]);

/** Jeder fachliche Eintrag trägt Quelle(n) (IDs aus `sources.json`) und Status. */
const sourced = {
  source: z.array(Id).min(1),
  status: Status,
};

/** Wählt Gerätetypen direkt oder über eine Fähigkeit (z. B. `zugang`). */
const Selector = z.union([
  z.strictObject({ types: z.array(Id).min(1) }),
  z.strictObject({ capability: Id }),
]);
export type Selector = z.infer<typeof Selector>;

/** Deklarativer Ausdruck für Voraussetzungen und Prüfregeln, kein Code (plan.md). */
export type Expr =
  | { all: Expr[] }
  | { any: Expr[] }
  | { not: Expr }
  | { card: string; unlocked?: boolean | undefined }
  | { need: "zugang" | "ti" | "pruefungsnachweis" | "befugnis" }
  | { service: string }
  | { present: string }
  | {
      field: string;
      op: "eq" | "neq" | "lt" | "lte" | "gt" | "gte";
      value: string | number | boolean;
    };

export const Expr: z.ZodType<Expr> = z.lazy(() =>
  z.union([
    z.strictObject({ all: z.array(Expr) }),
    z.strictObject({ any: z.array(Expr) }),
    z.strictObject({ not: Expr }),
    z.strictObject({ card: Id, unlocked: z.boolean().optional() }),
    z.strictObject({
      need: z.enum(["zugang", "ti", "pruefungsnachweis", "befugnis"]),
    }),
    z.strictObject({ service: Id }),
    z.strictObject({ present: Id }),
    z.strictObject({
      field: Id,
      op: z.enum(["eq", "neq", "lt", "lte", "gt", "gte"]),
      value: z.union([z.string(), z.number(), z.boolean()]),
    }),
  ]),
);

export const meta = z.strictObject({
  version: Id,
  date: z.iso.date(),
  note: z.string(),
});

export const active = z.strictObject({ version: Id });

export const categories = z.array(
  z.strictObject({
    id: Id,
    name: Text,
    color: Text,
    colorDark: Text,
    shape: Text,
    order: z.number().int(),
  }),
);

// Anschlüsse tragen eigene Quelle und eigenen Status (Regelwerk 2.2).
const Port = z.strictObject({
  id: Id,
  name: Text,
  kind: Id,
  multi: z.boolean().default(false),
  ...sourced,
});

export const deviceTypes = z.array(
  z.strictObject({
    id: Id,
    abbr: Text,
    name: Text,
    category: Id,
    // false für Smartcards: Karten sind keine Knoten (D12), nicht in der Palette
    placeable: z.boolean().default(true),
    icon: Id,
    visibleSimple: z.boolean(),
    capabilities: z.array(Id),
    ports: z.array(Port),
    ...sourced,
  }),
);

export const portKinds = z.strictObject({
  kinds: z.array(z.strictObject({ id: Id, name: Text, ...sourced })),
  compatible: z.array(z.strictObject({ a: Id, b: Id, ...sourced })),
});

export const connectionRules = z.array(
  z.strictObject({
    id: Id,
    a: Selector,
    b: Selector,
    // Nennt das Regelwerk konkrete Anschlüsse (z. B. „Router-LAN“, „Zugang
    // (WAN)“), beschränkt dies die Anschlussarten je Seite. Ohne Angabe gilt
    // jeder verträgliche Anschluss.
    kinds: z
      .strictObject({
        a: z.array(Id).min(1).optional(),
        b: z.array(Id).min(1).optional(),
      })
      .optional(),
    visibleSimple: z.boolean(),
    ...sourced,
  }),
);

export const reasonRules = z.array(
  z.strictObject({
    id: Id,
    a: Selector,
    b: Selector,
    // Paare, die trotz Treffer von a/b nicht gemeint sind (z. B. V-6: erlaubte
    // Primärsystem-Paare), damit keine Begründung ein erlaubtes Paar erfasst.
    except: z.array(z.strictObject({ a: Selector, b: Selector })).optional(),
    message: Text,
    ...sourced,
  }),
);

export const baseChecks = z.array(
  z.strictObject({
    id: Id,
    check: z.enum(["self", "duplicate", "freePort", "singleZugang"]),
    message: Text,
    ...sourced,
  }),
);

export const exclusionRules = z.array(
  z.strictObject({
    id: Id,
    exclusive: z.tuple([Selector, Selector]),
    message: Text,
    ...sourced,
  }),
);

export const protocols = z.strictObject({
  connectionKinds: z.array(
    z.strictObject({ id: Id, name: Text, meaning: Text, lineStyle: Text }),
  ),
  protocols: z.array(
    z.strictObject({
      id: Id,
      a: Selector,
      b: Selector,
      label: Text,
      protocol: Text,
      netPort: z.string().nullable(),
      // Nur gesetzt, wenn der Netzport schwächer belegt ist als die Zeile selbst
      netPortStatus: Status.optional(),
      tls: z.boolean().nullable(),
      ...sourced,
    }),
  ),
});

export const actions = z.array(
  z.strictObject({
    id: Id,
    name: Text,
    offeredBy: Selector,
    requires: Expr,
    flow: Id,
    ...sourced,
  }),
);

export const flows = z.array(
  z.strictObject({
    id: Id,
    name: Text,
    steps: z.array(
      z.strictObject({
        from: Id,
        to: Id,
        label: Text,
        text: Text,
        protocol: Id.optional(),
      }),
    ),
    ...sourced,
  }),
);

export const configDefaults = z.array(
  z.strictObject({
    field: Id,
    name: Text,
    default: z.union([z.string(), z.number(), z.boolean(), z.null()]),
    rule: z.string(),
    ...sourced,
  }),
);

export const checks = z.array(
  z.strictObject({
    id: Id,
    name: Text,
    severity: z.enum(["Fehler", "Warnung", "Hinweis"]),
    onlyAdvanced: z.boolean(),
    when: Expr,
    ...sourced,
  }),
);

export const challenges = z.array(
  z.strictObject({
    id: Id,
    title: Text,
    preset: Id,
    violatedChecks: z.array(Id),
    goalActions: z.array(Id),
    ...sourced,
  }),
);

const PresetPort = z.strictObject({ node: Id, port: Id });

export const presets = z.array(
  z.strictObject({
    id: Id,
    name: Text,
    simDate: z.iso.date(),
    nodes: z.array(z.strictObject({ id: Id, type: Id, name: Text })),
    edges: z.array(
      z.strictObject({ id: Id, a: PresetPort, b: PresetPort, kind: Id }),
    ),
    ...sourced,
  }),
);

export const tutorial = z.strictObject({
  personas: z.array(z.strictObject({ id: Id, name: Text, text: Text })),
  steps: z.array(z.strictObject({ id: Id, title: Text, text: Text })),
});

export const glossary = z.array(
  z.strictObject({ term: Text, text: Text, ...sourced }),
);

export const sources = z.array(
  z.strictObject({ id: Id, title: Text, url: z.url({ protocol: /^https$/ }) }),
);

export const catalogSchema = z.strictObject({
  active,
  meta,
  categories,
  deviceTypes,
  portKinds,
  connectionRules,
  reasonRules,
  baseChecks,
  exclusionRules,
  protocols,
  actions,
  flows,
  configDefaults,
  checks,
  challenges,
  presets,
  tutorial,
  glossary,
  sources,
});
export type Catalog = z.infer<typeof catalogSchema>;

function exprTypes(e: Expr, out: string[]) {
  if ("all" in e)
    e.all.forEach((x) => {
      exprTypes(x, out);
    });
  else if ("any" in e)
    e.any.forEach((x) => {
      exprTypes(x, out);
    });
  else if ("not" in e) exprTypes(e.not, out);
  else if ("service" in e) out.push(e.service);
  else if ("present" in e) out.push(e.present);
}

type Row = { id?: string; term?: string; field?: string; source: string[] };

/** Prüft Verweise zwischen den Dateien. Liefert eine Meldung je kaputtem Verweis. */
export function checkReferences(c: Catalog): string[] {
  const errors: string[] = [];
  const ids = (xs: { id: string }[]) => new Set(xs.map((x) => x.id));
  const types = ids(c.deviceTypes);
  const caps = new Set(c.deviceTypes.flatMap((t) => t.capabilities));
  const kinds = ids(c.portKinds.kinds);
  const srcs = ids(c.sources);
  const protos = ids(c.protocols.protocols);
  const connKinds = ids(c.protocols.connectionKinds);
  const cats = ids(c.categories);
  const actionIds = ids(c.actions);
  const checkIds = ids(c.checks);
  const flowIds = ids(c.flows);
  const presetIds = ids(c.presets);

  const ref = (where: string, id: string, known: Set<string>, what: string) => {
    if (!known.has(id)) errors.push(`${where}: ${what} „${id}“ fehlt`);
  };
  const sel = (where: string, s: Selector) => {
    if ("types" in s)
      s.types.forEach((t) => {
        ref(where, t, types, "Gerätetyp");
      });
    else ref(where, s.capability, caps, "Fähigkeit");
  };
  const expr = (where: string, e: Expr) => {
    const used: string[] = [];
    exprTypes(e, used);
    used.forEach((t) => {
      ref(where, t, types, "Gerätetyp");
    });
  };
  const withSource = (what: string, xs: Row[]) => {
    xs.forEach((x) => {
      x.source.forEach((s) => {
        ref(`${what} ${x.id ?? x.term ?? x.field ?? ""}`, s, srcs, "Quelle");
      });
    });
  };

  const lists: [string, { id: string }[]][] = [
    ["Kategorien", c.categories],
    ["Gerätetypen", c.deviceTypes],
    ["Anschlussarten", c.portKinds.kinds],
    ["Regeln 4.2", c.connectionRules],
    ["Regeln 4.3", c.reasonRules],
    ["Regeln 4.1", c.baseChecks],
    ["Regeln 4.4", c.exclusionRules],
    ["Protokolle", c.protocols.protocols],
    ["Verbindungsarten", c.protocols.connectionKinds],
    ["Aktionen", c.actions],
    ["Abläufe", c.flows],
    ["Prüfregeln", c.checks],
    ["Herausforderungen", c.challenges],
    ["Presets", c.presets],
    ["Quellen", c.sources],
  ];
  for (const [what, xs] of lists)
    if (ids(xs).size !== xs.length) errors.push(`${what}: doppelte ID`);

  for (const t of c.deviceTypes) {
    const w = `Gerätetyp ${t.id}`;
    ref(w, t.category, cats, "Kategorie");
    if (new Set(t.ports.map((p) => p.id)).size !== t.ports.length)
      errors.push(`${w}: doppelte Anschluss-ID`);
    t.ports.forEach((p) => {
      ref(w, p.kind, kinds, "Anschlussart");
    });
  }
  for (const p of c.portKinds.compatible) {
    const w = `Verträglichkeit ${p.a}/${p.b}`;
    ref(w, p.a, kinds, "Anschlussart");
    ref(w, p.b, kinds, "Anschlussart");
  }
  for (const r of [
    ...c.connectionRules,
    ...c.reasonRules,
    ...c.protocols.protocols,
  ]) {
    sel(`Regel ${r.id}`, r.a);
    sel(`Regel ${r.id}`, r.b);
  }
  for (const r of c.connectionRules)
    [...(r.kinds?.a ?? []), ...(r.kinds?.b ?? [])].forEach((k) => {
      ref(`Regel ${r.id}`, k, kinds, "Anschlussart");
    });
  for (const r of c.reasonRules)
    r.except?.forEach((e) => {
      sel(`Regel ${r.id}`, e.a);
      sel(`Regel ${r.id}`, e.b);
    });
  for (const r of c.exclusionRules)
    r.exclusive.forEach((s) => {
      sel(`Regel ${r.id}`, s);
    });
  for (const a of c.actions) {
    sel(`Aktion ${a.id}`, a.offeredBy);
    expr(`Aktion ${a.id}`, a.requires);
    ref(`Aktion ${a.id}`, a.flow, flowIds, "Ablauf");
  }
  for (const f of c.flows)
    for (const s of f.steps)
      if (s.protocol) ref(`Ablauf ${f.id}`, s.protocol, protos, "Protokoll");
  for (const k of c.checks) expr(`Prüfregel ${k.id}`, k.when);
  for (const h of c.challenges) {
    const w = `Herausforderung ${h.id}`;
    ref(w, h.preset, presetIds, "Preset");
    h.violatedChecks.forEach((k) => {
      ref(w, k, checkIds, "Prüfregel");
    });
    h.goalActions.forEach((a) => {
      ref(w, a, actionIds, "Aktion");
    });
  }
  for (const p of c.presets) {
    const w = `Preset ${p.id}`;
    const typeOf = new Map(p.nodes.map((n) => [n.id, n.type]));
    for (const n of p.nodes) ref(w, n.type, types, "Gerätetyp");
    for (const e of p.edges) {
      ref(w, e.kind, connKinds, "Verbindungsart");
      for (const end of [e.a, e.b]) {
        const known = c.deviceTypes
          .find((t) => t.id === typeOf.get(end.node))
          ?.ports.some((q) => q.id === end.port);
        if (!known)
          errors.push(
            `${w}: Kante ${e.id} endet an unbekanntem Anschluss ${end.node}.${end.port}`,
          );
      }
    }
  }

  withSource("Gerätetyp", c.deviceTypes);
  withSource(
    "Anschluss",
    c.deviceTypes.flatMap((t) =>
      t.ports.map((p) => ({ ...p, id: `${t.id}.${p.id}` })),
    ),
  );
  withSource("Anschlussart", c.portKinds.kinds);
  withSource("Verträglichkeit", c.portKinds.compatible);
  withSource("Regel", [
    ...c.connectionRules,
    ...c.reasonRules,
    ...c.baseChecks,
    ...c.exclusionRules,
    ...c.protocols.protocols,
  ]);
  withSource("Aktion", c.actions);
  withSource("Ablauf", c.flows);
  withSource("Konfiguration", c.configDefaults);
  withSource("Prüfregel", c.checks);
  withSource("Herausforderung", c.challenges);
  withSource("Preset", c.presets);
  withSource("Glossar", c.glossary);

  return errors;
}
