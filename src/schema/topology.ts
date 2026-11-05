import { z } from "zod";

// Grenzen aus plan.md, „Sicherheit beim Öffnen fremder Dateien“
export const LIMITS = {
  nodes: 500,
  edges: 2000,
  zones: 50,
  name: 100,
  description: 2000,
} as const;

const text = (max: number) => z.string().max(max);
const key = z.string().regex(/^[a-z0-9][a-z0-9_-]{0,63}$/i);
const coord = z.number().min(-100_000).max(100_000);
const date = z.iso.date();

export const Point = z.object({ x: coord, y: coord });
export const Rect = z.object({
  x: coord,
  y: coord,
  w: z.number().positive().max(100_000),
  h: z.number().positive().max(100_000),
});
export const Endpoint = z.object({ node: key, port: key });

export const Tone = z.enum(["sage", "accent", "neutral"]);

const Element = z.object({ id: key, label: text(LIMITS.name).optional() });

// Karten (D35): eGK als Card, HBA und SMC-B als PinCard, unterschieden über `kind`
export const Card = z.object({
  kind: z.literal("egk"),
  expires: date,
  pinActive: z.boolean().optional(),
});
export const PinCard = z.object({
  kind: z.enum(["hba", "smcb"]),
  expires: date,
  unlocked: z.boolean().optional(),
});
export const AnyCard = z.discriminatedUnion("kind", [Card, PinCard]);

// Netzwerkeinstellungen (Regelwerk 8). Die Variante legt der Katalog über die
// Fähigkeit `netConfig:<variante>` fest, nicht die Datei.
export const NetConfig = z.object({
  ip: text(45).optional(),
  mask: text(45).optional(),
  gateway: text(45).optional(),
  dns: text(45).optional(),
  vlan: text(32).optional(),
  dhcp: z.boolean().optional(),
});
export const KonnektorConfig = NetConfig.extend({
  mode: z.enum(["reihe", "parallel"]).optional(),
  sis: z.boolean().optional(),
  timeOffset: z.number().min(-1e9).max(1e9).optional(),
  certExpires: date.optional(),
  updateOk: z.boolean().optional(),
  lastTimeSync: date.optional(),
  dhcpServer: z.boolean().optional(),
});
export const TerminalConfig = NetConfig.extend({
  paired: z.boolean().optional(),
  pairedWith: key.optional(),
  workplace: text(LIMITS.name).optional(),
});
export const ClientConfig = NetConfig.extend({
  workplace: text(LIMITS.name).optional(),
  routeTI: z.boolean().optional(),
});
export const RouterConfig = NetConfig.extend({
  ipsecAllowed: z.boolean().optional(),
  dhcpServer: z.boolean().optional(),
});
export const InfraConfig = NetConfig;

/** Varianten nach Katalog-Fähigkeit `netConfig:<variante>`. */
export const configVariants = {
  konnektor: KonnektorConfig,
  terminal: TerminalConfig,
  client: ClientConfig,
  router: RouterConfig,
  infra: InfraConfig,
} as const;

// Ohne Katalog ist die Variante unbekannt: das Knotenschema lässt alle Felder
// der Varianten zu (sonst würde Zod sie verwerfen). Die Prüfung gegen die
// Variante des Gerätetyps (`configVariants`) folgt beim Öffnen mit dem Katalog.
const AnyConfig = z.object({
  ...KonnektorConfig.shape,
  ...TerminalConfig.shape,
  ...ClientConfig.shape,
  ...RouterConfig.shape,
});

export const Node = Element.extend({
  type: key,
  position: Point,
  fault: z.boolean(),
  cards: z.array(AnyCard).max(3).optional(),
  config: AnyConfig.optional(),
});
export const Edge = Element.extend({
  ends: z.tuple([Endpoint, Endpoint]),
  fault: z.boolean(),
});
export const Zone = Element.extend({ area: Rect, tone: Tone });

export const Topology = z
  .object({
    name: text(LIMITS.name),
    description: text(LIMITS.description),
    simDate: date,
    nodes: z.array(Node).max(LIMITS.nodes),
    edges: z.array(Edge).max(LIMITS.edges),
    zones: z.array(Zone).max(LIMITS.zones),
  })
  .superRefine((t, ctx) => {
    const issue = (path: (string | number)[], message: string) => {
      ctx.addIssue({ code: "custom", path, message });
    };

    const ids = new Set<string>();
    for (const list of ["nodes", "edges", "zones"] as const) {
      t[list].forEach((el, i) => {
        if (ids.has(el.id)) issue([list, i, "id"], `ID „${el.id}“ ist doppelt`);
        ids.add(el.id);
      });
    }

    const nodeIds = new Set(t.nodes.map((n) => n.id));
    const used = new Set<string>();
    t.edges.forEach((e, i) => {
      e.ends.forEach((end, j) => {
        const path = ["edges", i, "ends", j];
        if (!nodeIds.has(end.node)) issue(path, `Knoten „${end.node}“ fehlt`);
        const slot = `${end.node}\0${end.port}`;
        if (used.has(slot))
          issue(
            path,
            `Anschluss „${end.node}.${end.port}“ trägt mehr als eine Kante`,
          );
        used.add(slot);
      });
    });
  });

export type Point = z.infer<typeof Point>;
export type Rect = z.infer<typeof Rect>;
export type Endpoint = z.infer<typeof Endpoint>;
export type Card = z.infer<typeof Card>;
export type PinCard = z.infer<typeof PinCard>;
export type AnyCard = z.infer<typeof AnyCard>;
export type NetConfig = z.infer<typeof NetConfig>;
export type KonnektorConfig = z.infer<typeof KonnektorConfig>;
export type TerminalConfig = z.infer<typeof TerminalConfig>;
export type ClientConfig = z.infer<typeof ClientConfig>;
export type RouterConfig = z.infer<typeof RouterConfig>;
export type InfraConfig = z.infer<typeof InfraConfig>;
export type Node = z.infer<typeof Node>;
export type Edge = z.infer<typeof Edge>;
export type Zone = z.infer<typeof Zone>;
export type Topology = z.infer<typeof Topology>;
