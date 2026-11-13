import type { Catalog, Node, Topology } from "../schema";

// Prüfregeln des Regelwerks 9, Teil Betrieb (nur Erweitert). Die Prädikate
// stehen hier einmal und gelten für `runChecks` wie für `availableActions`
// (Regeln, die den Pfad unterbrechen). `checks.ts` importiert diese Datei,
// nicht umgekehrt; `Rule` ist daher strukturell zu `checks.ts` kompatibel. Ungesetzte Felder gelten als Standardwert, nicht als
// Verstoß (Regelwerk 8).

type Cat = Pick<Catalog, "deviceTypes">;
type Rule = (x: {
  t: Topology;
  c: Catalog;
  zugaenge: Node[];
  terminals: Node[];
}) => {
  subject: string;
  nodes: string[];
  severity?: Catalog["checks"][number]["severity"];
}[];

const DAY = 86_400_000;
const NTP_MAX_TIMEDIFFERENCE = 3600;
const NTP_WARN_PERIOD = 30;
const NTP_GRACE_PERIOD = 50;

const has = (c: Cat, n: Node, capability: string) =>
  c.deviceTypes
    .find((d) => d.id === n.type)
    ?.capabilities.includes(capability) ?? false;
const mode = (z: Node) => z.config?.mode ?? "reihe";
const sorted = (xs: Iterable<string>) =>
  [...xs].sort((a, b) => a.localeCompare(b));
const standard = (c: Catalog, field: string) =>
  String(c.configDefaults.find((d) => d.field === field)?.default ?? "");

/**
 * Geräte im selben Segment wie `start`: über Switches und Access Points, mit
 * `viaFw` auch über Firewalls, nie über Router. Grenzgeräte (Zugang, Router)
 * zählen als Mitglied, die Suche endet dort.
 */
function segment(start: string, t: Topology, c: Cat, viaFw = false): Node[] {
  const byId = new Map(t.nodes.map((n) => [n.id, n]));
  const seen = new Set([start]);
  for (const id of seen) {
    const n = byId.get(id);
    if (
      !n ||
      (id !== start &&
        !(has(c, n, "netConfig:infra") && (viaFw || n.type !== "fw")))
    )
      continue;
    for (const e of t.edges) {
      const [a, b] = e.ends;
      const other = a.node === id ? b.node : b.node === id ? a.node : undefined;
      if (other !== undefined && byId.has(other)) seen.add(other);
    }
  }
  seen.delete(start);
  return [...seen].map((id) => byId.get(id) as Node);
}

const zugaengeIm = (n: Node, t: Topology, c: Cat) =>
  segment(n.id, t, c).filter((x) => has(c, x, "zugang"));

/** Wert passt zu einer der Soll-Adressen. Eine unbekannte Adresse (ungesetzt) zählt als passend. */
const passt = (wert: string, soll: (string | undefined)[]) =>
  soll.some((ip) => ip === undefined || ip === wert);

const tageSeitSync = (z: Node, t: Topology) =>
  z.config?.lastTimeSync === undefined
    ? 0
    : Math.floor(
        (Date.parse(t.simDate) - Date.parse(z.config.lastTimeSync)) / DAY,
      );

/** Router, die der Zugang erreicht (auch hinter einer Firewall), mit gesperrtem IPsec. */
const ipsecGesperrt = (z: Node, t: Topology, c: Cat) =>
  segment(z.id, t, c, true).filter(
    (r) => r.type === "router" && r.config?.ipsecAllowed === false,
  );

/** P-25 oder P-26 für einen Client, sonst `undefined` (Regelwerk 8, „Gateway der Clients“). */
function gatewayRegel(
  n: Node,
  t: Topology,
  c: Cat,
): "P-25" | "P-26" | undefined {
  const gw = n.config?.gateway;
  if (gw === undefined || !has(c, n, "netConfig:client")) return undefined;
  const z = zugaengeIm(n, t, c);
  if (z.length === 0) return undefined;
  if (z.every((x) => mode(x) === "reihe"))
    return passt(
      gw,
      z.map((x) => x.config?.ip),
    )
      ? undefined
      : "P-25";
  const routers = t.nodes.filter((r) => r.type === "router");
  return z.every((x) => mode(x) === "parallel") &&
    routers.length > 0 &&
    !passt(
      gw,
      routers.map((r) => r.config?.ip),
    )
    ? "P-26"
    : undefined;
}

function routeFehlt(n: Node, t: Topology, c: Cat) {
  if (n.config?.routeTI !== false || !has(c, n, "netConfig:client"))
    return false;
  const z = zugaengeIm(n, t, c);
  return z.length > 0 && z.every((x) => mode(x) === "parallel");
}

/** Grund, warum der Zugang keinen VPN-Tunnel aufbaut (P-16, P-17, P-17a ab 50 Tagen, P-21). */
export function tunnelGrund(z: Node, t: Topology, c: Cat): string | undefined {
  if (z.config?.updateOk === false)
    return "Kritisches Update fehlt, der Zugang baut keinen VPN-Tunnel auf (P-16).";
  if (Math.abs(z.config?.timeOffset ?? 0) > NTP_MAX_TIMEDIFFERENCE)
    return "Zeitabweichung des Zugangs über 3600 s (P-17).";
  if (tageSeitSync(z, t) >= NTP_GRACE_PERIOD)
    return "Keine Zeitsynchronisation seit 50 Tagen (P-17a).";
  if (ipsecGesperrt(z, t, c).length > 0)
    return "Die Router-Firewall blockiert IPsec (P-21).";
  return undefined;
}

/** Grund, warum der Client den Zugang nicht über sein Gateway erreicht (P-25, P-26). */
export function gatewayGrund(n: Node, t: Topology, c: Cat) {
  const id = gatewayRegel(n, t, c);
  return id === "P-25"
    ? "Das Gateway ist nicht der Zugang (P-25)."
    : id === "P-26"
      ? "Das Gateway ist nicht der Router (P-26)."
      : undefined;
}

/** Grund, warum dem Client die Route in die TI fehlt (P-27). */
export const routeGrund = (n: Node, t: Topology, c: Cat) =>
  routeFehlt(n, t, c)
    ? "Dem Gerät fehlt die Route 100.102.0.0/15 über den Zugang (P-27)."
    : undefined;

export const BETRIEB: Record<string, Rule> = {
  "P-16": ({ zugaenge }) =>
    zugaenge
      .filter((z) => z.config?.updateOk === false)
      .map((z) => ({ subject: z.id, nodes: [z.id] })),

  "P-17": ({ zugaenge }) =>
    zugaenge
      .filter(
        (z) => Math.abs(z.config?.timeOffset ?? 0) > NTP_MAX_TIMEDIFFERENCE,
      )
      .map((z) => ({ subject: z.id, nodes: [z.id] })),

  // Eine Regel, zwei Schweren: Warnung ab 30, Fehler ab 50 Tagen.
  "P-17a": ({ t, zugaenge }) =>
    zugaenge
      .filter((z) => tageSeitSync(z, t) >= NTP_WARN_PERIOD)
      .map((z) => ({
        subject: z.id,
        nodes: [z.id],
        ...(tageSeitSync(z, t) >= NTP_GRACE_PERIOD && {
          severity: "Fehler" as const,
        }),
      })),

  "P-19": ({ t, zugaenge }) =>
    t.nodes.some((n) => n.type === "fw")
      ? []
      : zugaenge
          .filter((z) => mode(z) === "parallel")
          .map((z) => ({ subject: z.id, nodes: [z.id] })),

  "P-20": ({ t, zugaenge }) =>
    t.nodes.some((n) => n.type === "router")
      ? []
      : zugaenge
          .filter((z) => mode(z) === "parallel")
          .map((z) => ({ subject: z.id, nodes: [z.id] })),

  "P-21": ({ t, c, zugaenge }) => {
    const byRouter = new Map<string, Set<string>>();
    for (const z of zugaenge)
      for (const r of ipsecGesperrt(z, t, c))
        byRouter.set(r.id, (byRouter.get(r.id) ?? new Set()).add(z.id));
    return [...byRouter].map(([router, zs]) => ({
      subject: router,
      nodes: sorted([router, ...zs]),
    }));
  },

  // Segment wie bei P-6. Server ist ein Zugang oder Router mit `dhcpServer`.
  "P-23": ({ t, c }) =>
    t.nodes
      .filter((n) => n.config?.dhcp === true)
      .filter(
        (n) =>
          !segment(n.id, t, c).some(
            (s) =>
              (s.type === "router" || has(c, s, "zugang")) &&
              s.config?.dhcpServer === true,
          ),
      )
      .map((n) => ({ subject: n.id, nodes: [n.id] })),

  // Terminals und Clients: gleiches VLAN wie mindestens ein Zugang im Segment.
  "P-24": ({ t, c }) => {
    const vlan = (n: Node) => n.config?.vlan ?? standard(c, "vlan");
    return t.nodes
      .filter(
        (n) => has(c, n, "netConfig:client") || has(c, n, "netConfig:terminal"),
      )
      .flatMap((n) => {
        const z = zugaengeIm(n, t, c);
        return z.length > 0 && !z.some((x) => vlan(x) === vlan(n))
          ? [{ subject: n.id, nodes: sorted([n.id, ...z.map((x) => x.id)]) }]
          : [];
      });
  },

  "P-25": ({ t, c }) => gatewayHits(t, c, "P-25"),
  "P-26": ({ t, c }) => gatewayHits(t, c, "P-26"),

  "P-27": ({ t, c }) =>
    t.nodes
      .filter((n) => routeFehlt(n, t, c))
      .map((n) => ({ subject: n.id, nodes: [n.id] })),

  // Ungesetzter DNS ist der Zugang (Standard), kein Verstoß.
  "P-28": ({ t, c }) =>
    t.nodes
      .filter((n) => n.config?.dns !== undefined)
      .filter((n) => has(c, n, "netConfig:client"))
      .filter((n) => {
        const z = zugaengeIm(n, t, c);
        return (
          z.length > 0 &&
          !passt(
            n.config?.dns ?? "",
            z.map((x) => x.config?.ip),
          )
        );
      })
      .map((n) => ({ subject: n.id, nodes: [n.id] })),

  // Nur wenn es überhaupt ein Kartenterminal gibt, sonst fehlt nur das Gerät.
  "P-29": ({ t, c, terminals }) => {
    const wp = (n: Node) => n.config?.workplace ?? standard(c, "workplace");
    const plaetze = new Set(terminals.map(wp));
    return terminals.length === 0
      ? []
      : t.nodes
          .filter((n) => has(c, n, "workplace") && !plaetze.has(wp(n)))
          .map((n) => ({ subject: n.id, nodes: [n.id] }));
  },

  "P-30": ({ terminals }) =>
    terminals
      .filter((k) => k.config?.paired === false)
      .map((k) => ({ subject: k.id, nodes: [k.id] })),
};

function gatewayHits(t: Topology, c: Catalog, id: "P-25" | "P-26") {
  return t.nodes
    .filter((n) => gatewayRegel(n, t, c) === id)
    .map((n) => ({ subject: n.id, nodes: [n.id] }));
}
