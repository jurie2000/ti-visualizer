import type { Catalog, Edge, Selector, Topology } from "../schema";

// Regel-Engine nach Regelwerk 4.0. Reine Funktionen, ungerichtet (D15), der
// Modus spielt keine Rolle (D36).

export interface ValidationResult {
  ok: boolean;
  reason?: string;
  ruleId?: string;
}

export interface PortPair {
  a: string;
  b: string;
}

type Device = Catalog["deviceTypes"][number];
type Port = Device["ports"][number];
type ConnectionRule = Catalog["connectionRules"][number];

export const MESSAGES = {
  notFound: "Gerät nicht gefunden.",
  noPort: "Anschluss nicht gefunden.",
  noPartner: "kann mit keinem anderen Gerät direkt verbunden werden.",
} as const;

export const matches = (
  s: Selector,
  type: string,
  catalog: Catalog,
): boolean =>
  "types" in s
    ? s.types.includes(type)
    : (catalog.deviceTypes
        .find((t) => t.id === type)
        ?.capabilities.includes(s.capability) ?? false);

const deviceOf = (type: string, catalog: Catalog) =>
  catalog.deviceTypes.find((t) => t.id === type);

/** Zwei Ports sind verträglich, wenn ihre Arten in `portKinds.compatible` stehen (A-1, A-2), in beliebiger Reihenfolge. */
function compatible(catalog: Catalog, x: string, y: string): boolean {
  return catalog.portKinds.compatible.some(
    (c) => (c.a === x && c.b === y) || (c.a === y && c.b === x),
  );
}

/** Erlaubnisregeln für das Typpaar (x, y), mit der Seite, auf der x steht. */
function pairRules(catalog: Catalog, x: string, y: string) {
  const found: { rule: ConnectionRule; swapped: boolean }[] = [];
  for (const rule of catalog.connectionRules) {
    if (matches(rule.a, x, catalog) && matches(rule.b, y, catalog))
      found.push({ rule, swapped: false });
    else if (matches(rule.a, y, catalog) && matches(rule.b, x, catalog))
      found.push({ rule, swapped: true });
  }
  return found;
}

const kindOk = (allowed: string[] | undefined, kind: string) =>
  allowed === undefined || allowed.includes(kind);

/** Lässt die Regel diese Anschlussarten zu? `swapped`: Gerät A steht auf der b-Seite der Regel. */
function admits(
  { rule, swapped }: { rule: ConnectionRule; swapped: boolean },
  kindA: string,
  kindB: string,
): boolean {
  const [ka, kb] = swapped
    ? [rule.kinds?.b, rule.kinds?.a]
    : [rule.kinds?.a, rule.kinds?.b];
  return kindOk(ka, kindA) && kindOk(kb, kindB);
}

/** Bei mehreren passenden Regeln gilt die mit dem stärksten Status (Reihenfolge des Status-Enums), bei Gleichstand die erste im Katalog. */
const STATUS_RANK = ["bestätigt", "plausibel", "Vereinfachung", "offen"];
function best(rules: ConnectionRule[]): ConnectionRule | undefined {
  let top: ConnectionRule | undefined;
  for (const r of rules)
    if (!top || STATUS_RANK.indexOf(r.status) < STATUS_RANK.indexOf(top.status))
      top = r;
  return top;
}

const used = (topology: Topology, node: string, port: string) =>
  topology.edges.some((e) =>
    e.ends.some((end) => end.node === node && end.port === port),
  );

export const isFree = (topology: Topology, node: string, port: Port) =>
  port.multi || !used(topology, node, port.id);

interface Candidate extends PortPair {
  rules: ConnectionRule[];
  freeA: boolean;
  freeB: boolean;
}

/** Alle verträglichen Anschlusspaare, die mindestens eine Erlaubnisregel zulässt, in Katalogreihenfolge (A-3). */
function candidates(
  topology: Topology,
  a: { node: string; type: string; port?: string | undefined },
  b: { node: string; type: string; port?: string | undefined },
  catalog: Catalog,
): Candidate[] {
  const rules = pairRules(catalog, a.type, b.type);
  const portsA = (deviceOf(a.type, catalog)?.ports ?? []).filter(
    (p) => a.port === undefined || p.id === a.port,
  );
  const portsB = (deviceOf(b.type, catalog)?.ports ?? []).filter(
    (p) => b.port === undefined || p.id === b.port,
  );
  const out: Candidate[] = [];
  for (const pa of portsA)
    for (const pb of portsB) {
      if (!compatible(catalog, pa.kind, pb.kind)) continue;
      const ok = rules.filter((r) => admits(r, pa.kind, pb.kind));
      if (ok.length === 0) continue;
      out.push({
        a: pa.id,
        b: pb.id,
        rules: ok.map((r) => r.rule),
        freeA: isFree(topology, a.node, pa),
        freeB: isFree(topology, b.node, pb),
      });
    }
  return out;
}

/** Erstes freies, verträgliches Anschlusspaar (A-3, Modus Einfach). `undefined`, wenn keines existiert. */
export function autoPorts(
  topology: Topology,
  a: string,
  b: string,
  catalog: Catalog,
): PortPair | undefined {
  const na = topology.nodes.find((n) => n.id === a);
  const nb = topology.nodes.find((n) => n.id === b);
  if (!na || !nb) return undefined;
  const hit = candidates(
    topology,
    { node: a, type: na.type },
    { node: b, type: nb.type },
    catalog,
  ).find((c) => c.freeA && c.freeB);
  return hit && { a: hit.a, b: hit.b };
}

/** Alle verträglichen Anschlusspaare zweier Geräte für den PortPicker (A-3, Modus Erweitert); `free` heißt: beide Anschlüsse frei. */
export function portPairs(
  topology: Topology,
  a: string,
  b: string,
  catalog: Catalog,
): (PortPair & { free: boolean })[] {
  const na = topology.nodes.find((n) => n.id === a);
  const nb = topology.nodes.find((n) => n.id === b);
  if (!na || !nb) return [];
  return candidates(
    topology,
    { node: a, type: na.type },
    { node: b, type: nb.type },
    catalog,
  ).map((c) => ({ a: c.a, b: c.b, free: c.freeA && c.freeB }));
}

/** A-4: Läuft eine Verbindung über `wifi`, ist sie eine WLAN-Verbindung. */
export function isWlan(
  edge: Edge,
  topology: Topology,
  catalog: Catalog,
): boolean {
  return edge.ends.some((end) => {
    const type = topology.nodes.find((n) => n.id === end.node)?.type;
    const kind = deviceOf(type ?? "", catalog)?.ports.find(
      (p) => p.id === end.port,
    )?.kind;
    return kind === "wifi";
  });
}

const checkMessage = (catalog: Catalog, check: string) =>
  catalog.baseChecks.find((c) => c.check === check);

/** Namen der Gerätearten, mit denen `type` laut Erlaubnisliste verbunden werden kann. */
function partners(type: string, catalog: Catalog): string[] {
  return catalog.deviceTypes
    .filter((t) => t.placeable && pairRules(catalog, type, t.id).length > 0)
    .map((t) => t.name);
}

/**
 * Prüft, ob zwei Geräte verbunden werden dürfen (Regelwerk 4.0): (1) G-1, G-2,
 * X-1, G-4, (2) Erlaubnisliste, sonst (3) Begründungsregel oder allgemeine
 * Meldung, (4) G-3 für den konkreten Anschluss. G-3 hängt von der Regel ab
 * (Anschlussarten), deshalb steht es nach der Paarfrage.
 */
export function validateConnection(
  topology: Topology,
  a: string,
  portA: string | undefined,
  b: string,
  portB: string | undefined,
  catalog: Catalog,
): ValidationResult {
  const na = topology.nodes.find((n) => n.id === a);
  const nb = topology.nodes.find((n) => n.id === b);
  if (!na || !nb) return { ok: false, reason: MESSAGES.notFound };
  const fail = (id: string, reason: string): ValidationResult => ({
    ok: false,
    reason,
    ruleId: id,
  });

  const g1 = checkMessage(catalog, "self");
  if (a === b && g1) return fail(g1.id, g1.message);

  const g2 = checkMessage(catalog, "duplicate");
  if (
    g2 &&
    topology.edges.some((e) => {
      const nodes = e.ends.map((end) => end.node);
      return nodes.includes(a) && nodes.includes(b);
    })
  )
    return fail(g2.id, g2.message);

  // X-1: Das Gegenstück darf nirgends sonst in der Topologie stehen. Das Paar
  // selbst (Konnektor direkt an Gateway) beantwortet die Begründungsregel V-10.
  for (const x of catalog.exclusionRules) {
    const [s0, s1] = x.exclusive;
    for (const [mine, theirs] of [
      [s0, s1],
      [s1, s0],
    ] as const)
      for (const node of [na, nb])
        if (
          matches(mine, node.type, catalog) &&
          topology.nodes.some(
            (n) => n.id !== a && n.id !== b && matches(theirs, n.type, catalog),
          )
        )
          return fail(x.id, x.message);
  }

  // G-4: ein eHealth-KT arbeitet mit höchstens einem Zugang zusammen
  const g4 = checkMessage(catalog, "singleZugang");
  const zugang = { capability: "zugang" } as const;
  if (g4)
    for (const [kt, other] of [
      [na, nb],
      [nb, na],
    ] as const)
      if (kt.type === "kt" && matches(zugang, other.type, catalog)) {
        const linked = topology.edges.some((e) => {
          const ids = e.ends.map((end) => end.node);
          if (!ids.includes(kt.id)) return false;
          const peer = topology.nodes.find(
            (n) => n.id === ids.find((i) => i !== kt.id),
          );
          return (
            peer !== undefined &&
            peer.id !== other.id &&
            matches(zugang, peer.type, catalog)
          );
        });
        if (linked) return fail(g4.id, g4.message);
      }

  const rules = pairRules(catalog, na.type, nb.type);
  if (rules.length === 0) {
    const reason = catalog.reasonRules.find((r) =>
      (matches(r.a, na.type, catalog) && matches(r.b, nb.type, catalog)) ||
      (matches(r.a, nb.type, catalog) && matches(r.b, na.type, catalog))
        ? !r.except?.some(
            (e) =>
              (matches(e.a, na.type, catalog) &&
                matches(e.b, nb.type, catalog)) ||
              (matches(e.a, nb.type, catalog) &&
                matches(e.b, na.type, catalog)),
          )
        : false,
    );
    if (reason) return fail(reason.id, reason.message);
    const list = partners(na.type, catalog);
    const name = deviceOf(na.type, catalog)?.name ?? na.type;
    return {
      ok: false,
      reason: `Diese Verbindung gibt es in der TI nicht. ${name} ${
        list.length > 0
          ? `kann verbunden werden mit: ${list.join(", ")}.`
          : MESSAGES.noPartner
      }`,
    };
  }

  // G-3: freies, verträgliches Anschlusspaar, das eine Erlaubnisregel zulässt
  const ports = candidates(
    topology,
    { node: a, type: na.type, port: portA },
    { node: b, type: nb.type, port: portB },
    catalog,
  );
  const g3 = checkMessage(catalog, "freePort");
  const knownPort = (n: typeof na, p: string | undefined) =>
    p === undefined ||
    deviceOf(n.type, catalog)?.ports.some((q) => q.id === p) === true;
  if (!knownPort(na, portA) || !knownPort(nb, portB))
    return { ok: false, reason: MESSAGES.noPort };
  const free = ports.find((c) => c.freeA && c.freeB);
  if (!free) {
    const name = (n: typeof na) =>
      n.label ?? deviceOf(n.type, catalog)?.name ?? n.type;
    // Schuld hat die Seite, auf der kein Anschluss eines zulässigen Paares frei ist
    const culprit = ports.some((c) => c.freeA) ? nb : na;
    return {
      ok: false,
      reason: (g3?.message ?? "").replace("‹Gerät›", name(culprit)),
      ...(g3 && { ruleId: g3.id }),
    };
  }
  const top = best(free.rules);
  return { ok: true, ...(top && { ruleId: top.id }) };
}
