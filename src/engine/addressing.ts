import type { Catalog, Node, Topology } from "../schema";
import { zugangOf } from "./paths";

// Prüfregeln des Regelwerks 9, Teil Adressierung (P-8 bis P-15). Eigene Datei,
// `checks.ts` bindet sie in die Regeltabelle ein. Nur IPv4, ungesetzte
// Felder sind kein Verstoß (Auslegung 2026-11-11, T-504).

interface Hit {
  subject: string;
  nodes: string[];
}
interface Ctx {
  t: Topology;
  c: Catalog;
  has: (n: Node, capability: string) => boolean;
  terminals: Node[];
}
type Rule = (x: Ctx) => Hit[];

/** Strenge Punktschreibweise: vier Teile 0 bis 255, keine führenden Nullen. */
function parseIp(s: string | undefined): number | undefined {
  const parts = s?.split(".") ?? [];
  if (parts.length !== 4) return undefined;
  let n = 0;
  for (const p of parts) {
    if (!/^(0|[1-9]\d{0,2})$/.test(p) || Number(p) > 255) return undefined;
    n = n * 256 + Number(p);
  }
  return n;
}

/** Präfixlänge einer zusammenhängenden Maske von /1 bis /30 (mit Hostbereich). */
function prefixOf(s: string | undefined): number | undefined {
  const m = parseIp(s);
  if (m === undefined) return undefined;
  for (let p = 1; p <= 30; p++) if (m === 2 ** 32 - 2 ** (32 - p)) return p;
  return undefined;
}

const size = (prefix: number) => 2 ** (32 - prefix);
const net = (ip: number, prefix: number) =>
  Math.floor(ip / size(prefix)) * size(prefix);

const byId = (xs: string[]) => [...xs].sort((a, b) => a.localeCompare(b));
const hit = (n: Node): Hit => ({ subject: n.id, nodes: [n.id] });

/** Maske des Geräts: gesetzt oder Standardwert aus `config-defaults.json`. */
const maskOf = (n: Node, c: Catalog) => {
  const standard = c.configDefaults.find((d) => d.field === "mask")?.default;
  return (
    n.config?.mask ?? (typeof standard === "string" ? standard : undefined)
  );
};

/** Gültige IP und Maske eines Geräts, sonst `undefined`. */
function addressOf(n: Node, c: Catalog) {
  const ip = parseIp(n.config?.ip);
  const prefix = prefixOf(maskOf(n, c));
  return ip === undefined || prefix === undefined ? undefined : { ip, prefix };
}

export const ADDRESSING: Record<string, Rule> = {
  "P-8": ({ t }) =>
    t.nodes
      .filter(
        (n) => n.config?.ip !== undefined && parseIp(n.config.ip) === undefined,
      )
      .map(hit),

  // Je Adresse ein Befund mit allen Geräten, die sie führen.
  "P-9": ({ t }) => {
    const byIp = new Map<number, string[]>();
    for (const n of t.nodes) {
      const ip = parseIp(n.config?.ip);
      if (ip !== undefined) byIp.set(ip, [...(byIp.get(ip) ?? []), n.id]);
    }
    return [...byIp.entries()]
      .filter(([, ids]) => ids.length > 1)
      .map(([ip, ids]) => ({ subject: String(ip), nodes: byId(ids) }));
  },

  "P-10": ({ t }) =>
    t.nodes
      .filter(
        (n) =>
          n.config?.mask !== undefined && prefixOf(n.config.mask) === undefined,
      )
      .map(hit),

  "P-11": ({ t, c }) =>
    t.nodes
      .filter((n) => {
        const a = addressOf(n, c);
        if (!a) return false;
        const first = net(a.ip, a.prefix);
        return a.ip === first || a.ip === first + size(a.prefix) - 1;
      })
      .map(hit),

  "P-12": ({ t }) =>
    t.nodes
      .filter(
        (n) =>
          n.config?.gateway !== undefined &&
          parseIp(n.config.gateway) === undefined,
      )
      .map(hit),

  "P-13": ({ t, c }) =>
    t.nodes
      .filter((n) => {
        const a = addressOf(n, c);
        const gw = parseIp(n.config?.gateway);
        return (
          a && gw !== undefined && net(gw, a.prefix) !== net(a.ip, a.prefix)
        );
      })
      .map(hit),

  // Zählt nur andere Geräte: das eigene Gerät ist kein Gateway für sich.
  "P-14": ({ t }) =>
    t.nodes
      .filter((n) => {
        const gw = parseIp(n.config?.gateway);
        return (
          gw !== undefined &&
          !t.nodes.some((o) => o.id !== n.id && parseIp(o.config?.ip) === gw)
        );
      })
      .map(hit),

  // Clients und Kartenterminals: ihre IP muss im Netz des Zugangs liegen (IP
  // und Maske des Zugangs). Ohne bestimmbaren Zugang keine Aussage.
  "P-15": ({ t, c, has, terminals }) => {
    const nodes = new Map(t.nodes.map((n) => [n.id, n]));
    const devices = [
      ...t.nodes.filter((n) => has(n, "netConfig:client")),
      ...terminals,
    ];
    return devices.flatMap((n) => {
      const zid = zugangOf(t, n.id, c);
      const z = zid === undefined ? undefined : nodes.get(zid);
      const a = addressOf(n, c);
      const b = z && addressOf(z, c);
      return z && a && b && net(a.ip, b.prefix) !== net(b.ip, b.prefix)
        ? [{ subject: n.id, nodes: byId([n.id, z.id]) }]
        : [];
    });
  },
};
