import { z } from "zod";
import { plugCard } from "../engine/cards";
import { validateConnection } from "../engine/rules";
import {
  Edge,
  LIMITS,
  Node,
  Settings,
  TivFile,
  Topology,
  Zone,
  configVariants,
  type Catalog,
} from "../schema";
import { migrate, SCHEMA_VERSION } from "./migrate";

/** Größte Datei, die `parse` liest (plan.md: 1 MB). */
export const MAX_FILE_BYTES = 1_048_576;

export type Severity = "Fehler" | "Warnung" | "Hinweis";

/**
 * Ein Importbefund: etwas, das beim Öffnen nicht oder verändert übernommen
 * wurde, oder ein Verstoß gegen den Katalog. Nichts verschwindet ohne Befund.
 * - `Fehler`: Element entfernt (ungültig, doppelt, unbekannter Typ, kaputter Verweis)
 * - `Warnung`: Feld nicht übernommen, Regelverstoß gegen den aktiven Katalog
 * - `Hinweis`: Information (abweichende Katalogversion, geänderte Karte)
 */
export interface Finding {
  severity: Severity;
  /** Zum Gruppieren und Testen, die Anzeige nutzt `message`. */
  code:
    | "ungueltig"
    | "unbekanntesFeld"
    | "doppelteId"
    | "unbekannterTyp"
    | "verweis"
    | "anschluss"
    | "karte"
    | "konfiguration"
    | "regel"
    | "katalogversion"
    | "einstellungen";
  /** Deutscher Text, nur als Text anzeigen. */
  message: string;
  /** ID des betroffenen Geräts, der Kante oder Zone (für Hervorheben), falls sie übernommen wurde. */
  ref?: string;
}

export type ParseResult =
  | {
      ok: true;
      topology: Topology;
      /** Nur wenn die Datei gültige Einstellungen enthält. Übernahme nach Rückfrage (D23). */
      settings?: Settings;
      /** `catalogVersion` der Datei. */
      catalogVersion: string;
      findings: Finding[];
    }
  | {
      ok: false;
      /** Meldung für den Benutzer, die ganze Datei wurde abgelehnt. */
      reason: string;
    };

export const MESSAGES = {
  tooBig: "Die Datei ist größer als 1 MB.",
  json: "Die Datei ist kein gültiges JSON.",
  foreign: "Das ist keine Datei dieser App.",
  version: "Die Datei hat keine gültige Versionsangabe.",
  newer: "Datei stammt aus einer neueren Version",
  noTopology: "Die Datei enthält keine Topologie.",
} as const;

const fail = (reason: string): ParseResult => ({ ok: false, reason });

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Fremde Namen kürzen und Steuer-/Formatzeichen ersetzen, bevor sie in einer Meldung stehen. */
const safe = (s: string, max = 60) =>
  s.replace(/[\p{Cc}\p{Cf}]/gu, "?").slice(0, max);

const KINDS = { Node: "Gerät", Edge: "Verbindung", Zone: "Zone" } as const;

/**
 * Liest eine `.tiv.json` (Text) und prüft sie als nicht vertrauenswürdige
 * Eingabe: Größe, JSON, Version (Migration oder Ablehnung), Schema,
 * Anschlüsse, Karten und Konfiguration gegen den Katalog. Bei abweichender
 * `catalogVersion` zusätzlich die Verbindungsregeln. Was nicht übernommen wird,
 * steht in `findings`. Wirft nie.
 */
export function parse(text: string, catalog: Catalog): ParseResult {
  if (text.length > MAX_FILE_BYTES) return fail(MESSAGES.tooBig);
  if (new TextEncoder().encode(text).length > MAX_FILE_BYTES)
    return fail(MESSAGES.tooBig);
  let data: unknown;
  try {
    data = JSON.parse(text.codePointAt(0) === 0xfeff ? text.slice(1) : text);
  } catch {
    // auch zu tief verschachteltes JSON (Stapelüberlauf)
    return fail(MESSAGES.json);
  }
  return parseData(data, catalog);
}

/** Wie `parse` für bereits gelesene JSON-Daten (z. B. ein Objekt aus dem Autosave). */
export function parseData(data: unknown, catalog: Catalog): ParseResult {
  if (!isObject(data) || data.format !== "ti-visualizer")
    return fail(MESSAGES.foreign);
  const v = data.schemaVersion;
  if (typeof v !== "number" || !Number.isInteger(v) || v < 1)
    return fail(MESSAGES.version);
  if (v > SCHEMA_VERSION) return fail(MESSAGES.newer);
  const file = migrate(data);
  if (!file)
    return fail(`Für Dateiversion ${String(v)} gibt es keine Migration.`);

  const head = z.object({
    exportedAt: TivFile.shape.exportedAt,
    catalogVersion: TivFile.shape.catalogVersion,
  });
  const header = head.safeParse(file);
  if (!header.success) return fail(MESSAGES.foreign);

  const raw = file.topology;
  if (!isObject(raw)) return fail(MESSAGES.noTopology);
  const meta = z
    .object({
      name: Topology.shape.name,
      description: Topology.shape.description,
      simDate: Topology.shape.simDate,
    })
    .safeParse(raw);
  if (!meta.success)
    return fail("Name, Beschreibung oder Datum sind ungültig.");
  for (const [key, max, label] of [
    ["nodes", LIMITS.nodes, "Geräte"],
    ["edges", LIMITS.edges, "Verbindungen"],
    ["zones", LIMITS.zones, "Zonen"],
  ] as const) {
    const list = raw[key];
    if (!Array.isArray(list)) return fail(MESSAGES.noTopology);
    if (list.length > max)
      return fail(`Die Datei hat mehr als ${String(max)} ${label}.`);
  }

  const findings: Finding[] = [];
  const add = (f: Finding) => {
    findings.push(f);
  };
  const known = (
    obj: Record<string, unknown>,
    keys: string[],
    path: string,
  ) => {
    dropped(obj, Object.fromEntries(keys.map((k) => [k, 1])), path, add);
  };
  known(
    file,
    [
      "format",
      "schemaVersion",
      "exportedAt",
      "catalogVersion",
      "settings",
      "topology",
    ],
    "Datei",
  );
  known(
    raw,
    ["name", "description", "simDate", "nodes", "edges", "zones"],
    "topology",
  );

  const topology = build(raw, meta.data, catalog, add);
  if (header.data.catalogVersion !== catalog.meta.version) {
    add({
      severity: "Hinweis",
      code: "katalogversion",
      message: `Die Datei nutzt Katalog ${safe(header.data.catalogVersion)}, geprüft wurde gegen ${catalog.meta.version}.`,
    });
    checkRules(topology, catalog, add);
  }
  // Sicherheitsnetz: der bereinigte Stand muss das Schema erfüllen
  const final = Topology.safeParse(topology);
  if (!final.success)
    return fail("Die Topologie in der Datei ist inkonsistent.");

  const result: ParseResult = {
    ok: true,
    topology: final.data,
    catalogVersion: header.data.catalogVersion,
    findings,
  };
  if (file.settings !== undefined) {
    const s = Settings.safeParse(file.settings);
    if (s.success) {
      dropped(file.settings, s.data, "settings", add);
      result.settings = s.data;
    } else
      add({
        severity: "Warnung",
        code: "einstellungen",
        message:
          "Die Einstellungen in der Datei sind ungültig und wurden nicht übernommen.",
      });
  }
  return result;
}

/** Meldet Felder in `raw`, die in `kept` fehlen (rekursiv, nur eigene Schlüssel). */
function dropped(
  raw: unknown,
  kept: unknown,
  path: string,
  add: (f: Finding) => void,
): void {
  if (Array.isArray(raw) && Array.isArray(kept)) {
    raw.forEach((r, i) => {
      dropped(r, kept[i], `${path}[${String(i)}]`, add);
    });
  } else if (isObject(raw) && isObject(kept)) {
    for (const key of Object.keys(raw)) {
      if (Object.hasOwn(kept, key)) {
        dropped(raw[key], kept[key], `${path}.${safe(key)}`, add);
      } else {
        add({
          severity: "Warnung",
          code: "unbekanntesFeld",
          message: `Feld „${path}.${safe(key)}“ ist unbekannt und wurde nicht übernommen.`,
        });
      }
    }
  }
}

type NodeT = z.infer<typeof Node>;
type EdgeT = z.infer<typeof Edge>;
type ZoneT = z.infer<typeof Zone>;

/** Elementweise Prüfung mit Katalog. Gibt eine bereinigte Topologie zurück (noch nicht als Ganzes geprüft). */
function build(
  raw: Record<string, unknown>,
  meta: { name: string; description: string; simDate: string },
  catalog: Catalog,
  add: (f: Finding) => void,
): Topology {
  const ids = new Set<string>();
  const types = new Map(catalog.deviceTypes.map((t) => [t.id, t]));

  /** Parst ein Element, meldet Ungültiges und Doppelte und reserviert die ID. */
  const take = <T extends { id: string }>(
    list: unknown,
    schema: z.ZodType<T>,
    kind: keyof typeof KINDS,
    path: string,
    accept: (el: T, index: number) => boolean,
  ): T[] => {
    const out: T[] = [];
    (list as unknown[]).forEach((item, i) => {
      const where = `${KINDS[kind]} ${String(i + 1)}`;
      const p = schema.safeParse(item);
      if (!p.success) {
        const field = safe(p.error.issues[0]?.path.join(".") ?? "");
        add({
          severity: "Fehler",
          code: "ungueltig",
          message: `${where} ist ungültig${field ? ` (Feld „${field}“)` : ""} und wurde nicht übernommen.`,
        });
        return;
      }
      const el = p.data;
      if (ids.has(el.id)) {
        add({
          severity: "Fehler",
          code: "doppelteId",
          message: `${where}: Die ID „${el.id}“ ist doppelt, der Eintrag wurde nicht übernommen.`,
        });
        return;
      }
      if (!accept(el, i)) return;
      dropped(item, el, `${path}[${String(i)}]`, add);
      ids.add(el.id);
      out.push(el);
    });
    return out;
  };

  const nodes = take<NodeT>(raw.nodes, Node, "Node", "topology.nodes", (n) => {
    const device = types.get(n.type);
    if (!device?.placeable) {
      add({
        severity: "Fehler",
        code: "unbekannterTyp",
        message: `Gerät „${n.id}“ hat den unbekannten Typ „${n.type}“ und wurde nicht übernommen.`,
      });
      return false;
    }
    return true;
  }).map((n) => checkConfig(n, types, add));
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  // Belegung je Anschluss: Schema-Prüfung nach Regelwerk 2.2 (`multi`), keine Regel-ID
  const load = new Map<string, number>();
  const edges = take<EdgeT>(raw.edges, Edge, "Edge", "topology.edges", (e) => {
    const refuse = (code: Finding["code"], why: string) => {
      add({
        severity: "Fehler",
        code,
        message: `Verbindung „${e.id}“ wurde nicht übernommen: ${why}`,
      });
      return false;
    };
    const keys: string[] = [];
    for (const [j, end] of e.ends.entries()) {
      const node = nodeById.get(end.node);
      if (!node)
        return refuse("verweis", `Gerät „${end.node}“ fehlt in der Datei.`);
      const port = types.get(node.type)?.ports.find((p) => p.id === end.port);
      if (!port)
        return refuse(
          "anschluss",
          `Anschluss „${end.port}“ gibt es bei Gerät „${end.node}“ nicht.`,
        );
      const key = `${end.node}/${end.port}`;
      // zweites Ende am selben Anschluss zählt wie eine zweite Kante
      const taken = (load.get(key) ?? 0) + (j === 1 && keys[0] === key ? 1 : 0);
      if (!port.multi && taken >= 1)
        return refuse(
          "anschluss",
          `Anschluss „${end.port}“ von Gerät „${end.node}“ ist schon belegt.`,
        );
      keys.push(key);
    }
    for (const key of keys) load.set(key, (load.get(key) ?? 0) + 1);
    return true;
  });

  const zones = take<ZoneT>(
    raw.zones,
    Zone,
    "Zone",
    "topology.zones",
    () => true,
  );

  return { ...meta, nodes: checkCards(nodes, catalog, add), edges, zones };
}

/** `config` nur bei Gerätetypen mit `netConfig:<variante>`, nur Felder der Variante. */
function checkConfig(
  node: NodeT,
  types: Map<string, Catalog["deviceTypes"][number]>,
  add: (f: Finding) => void,
): NodeT {
  const { config, ...rest } = node;
  if (config === undefined) return node;
  const name = types
    .get(node.type)
    ?.capabilities.find((c) => c.startsWith("netConfig:"))
    ?.slice("netConfig:".length);
  const variant =
    name !== undefined && Object.hasOwn(configVariants, name)
      ? configVariants[name as keyof typeof configVariants]
      : undefined;
  const parsed = variant?.safeParse(config);
  if (!parsed?.success) {
    add({
      severity: "Warnung",
      code: "konfiguration",
      message: `Gerät „${node.id}“ hat keine Netzwerkeinstellungen oder sie sind ungültig, sie wurden nicht übernommen.`,
      ref: node.id,
    });
    return rest;
  }
  dropped(config, parsed.data, `Gerät ${node.id}.config`, add);
  return { ...rest, config: parsed.data };
}

const omitCards = (n: NodeT): NodeT => {
  const copy = { ...n };
  delete copy.cards;
  return copy;
};

/** Karten über die Kartenregeln der Engine stecken (K-1, K-2, K-6, K-8, K-9). */
function checkCards(
  nodes: NodeT[],
  catalog: Catalog,
  add: (f: Finding) => void,
): NodeT[] {
  let t: Topology = {
    name: "",
    description: "",
    simDate: "2000-01-01",
    nodes: nodes.map((n) => omitCards(n)),
    edges: [],
    zones: [],
  };
  for (const node of nodes)
    for (const card of node.cards ?? []) {
      const r = plugCard(t, node.id, card, catalog);
      if (!r.ok) {
        add({
          severity: "Fehler",
          code: "karte",
          message: `Karte (${card.kind}) bei Gerät „${node.id}“ wurde nicht übernommen: ${r.message}`,
          ref: node.id,
        });
        continue;
      }
      t = r.topology;
      const plugged = r.topology.nodes
        .find((n) => n.id === node.id)
        ?.cards?.at(-1);
      if (
        card.kind === "egk" &&
        card.pinActive &&
        !(plugged as typeof card | undefined)?.pinActive
      )
        add({
          severity: "Hinweis",
          code: "karte",
          message: `Karte (${card.kind}) bei Gerät „${node.id}“ wurde angepasst (PIN-Einwilligung gibt es per NFC nicht).`,
          ref: node.id,
        });
    }
  return t.nodes;
}

/** Bei abweichender Katalogversion: jede Kante gegen die Verbindungsregeln, Verstöße bleiben als Warnung stehen. */
function checkRules(
  topology: Topology,
  catalog: Catalog,
  add: (f: Finding) => void,
): void {
  let built: Topology = { ...topology, edges: [] };
  for (const e of topology.edges) {
    const [a, b] = e.ends;
    const r = validateConnection(
      built,
      a.node,
      a.port,
      b.node,
      b.port,
      catalog,
    );
    if (!r.ok)
      add({
        severity: "Warnung",
        code: "regel",
        message: `Verbindung „${e.id}“ verstößt gegen den aktuellen Katalog: ${safe(r.reason ?? "nicht erlaubt", 300)}`,
        ref: e.id,
      });
    built = { ...built, edges: [...built.edges, e] };
  }
}
