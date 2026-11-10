import type { Catalog, Expr, Node, Selector, Topology } from "../schema";
import { cardState, type CardKind } from "./cards";
import { resolvePath, terminalFor, zugangOf, type PathResult } from "./paths";

type Cat = Pick<Catalog, "deviceTypes" | "actions">;

export interface ActionState {
  id: string;
  name: string;
  enabled: boolean;
  /** Erste nicht erfüllte Bedingung (Regelwerk 6.1). */
  disabledReason?: string;
  /** „Terminal wählen“: mehrere passende Terminals ohne Zuordnung (Regelwerk 6.0). */
  chooseTerminal?: string[];
}

interface Ctx {
  topology: Topology;
  catalog: Cat;
  trigger: Node;
  terminal?: Node | undefined;
}

// Arbeitsplatz-PC und Tablet bieten die Aktionen dieser Primärsysteme an (Regelwerk 6.2, 6.7).
const HOSTS = ["pvs", "kis", "avs"];

const NAMES: Record<CardKind, string> = {
  egk: "eGK",
  hba: "HBA",
  smcb: "SMC-B",
};

const caps = (c: Cat, n: Node) =>
  c.deviceTypes.find((d) => d.id === n.type)?.capabilities ?? [];
const typeName = (c: Cat, id: string) =>
  c.deviceTypes.find((d) => d.id === id)?.name ?? id;

function nameOf(ctx: Ctx, id: string): string {
  const n = ctx.topology.nodes.find((x) => x.id === id);
  if (n) return n.label ?? typeName(ctx.catalog, n.type);
  return ctx.topology.edges.find((e) => e.id === id)?.label ?? "Verbindung";
}

/** `undefined`, wenn ein Weg zu einem der Ziele besteht, sonst die Begründung. */
function reach(
  ctx: Ctx,
  from: string,
  targets: string[],
  fallback: string,
): string | undefined {
  const results: PathResult[] = targets.map((t) =>
    resolvePath(ctx.topology, from, t, ctx.catalog, "ti"),
  );
  if (results.some((r) => r.ok)) return undefined;
  for (const r of results)
    if (!r.ok && r.reason === "ausgefallen")
      return `${nameOf(ctx, r.at)} ist ausgefallen.`;
  return fallback;
}

const ofType = (ctx: Ctx, type: string) =>
  ctx.topology.nodes.filter((n) => n.type === type).map((n) => n.id);

/** Zugang, den die Aktion nutzt: der des Terminals, sonst der erste erreichbare. */
function zugangFor(ctx: Ctx): string | undefined {
  if (ctx.terminal) return zugangOf(ctx.topology, ctx.terminal.id, ctx.catalog);
  return ctx.topology.nodes
    .filter((n) => caps(ctx.catalog, n).includes("zugang"))
    .map((n) => n.id)
    .find((z) => resolvePath(ctx.topology, ctx.trigger.id, z, ctx.catalog).ok);
}

function needZugang(ctx: Ctx): string | undefined {
  const all = ctx.topology.nodes.filter((n) =>
    caps(ctx.catalog, n).includes("zugang"),
  );
  if (all.length === 0)
    return "Kein Zugang (Konnektor oder TI-Gateway) im Netz.";
  const z = ctx.terminal
    ? zugangOf(ctx.topology, ctx.terminal.id, ctx.catalog)
    : undefined;
  if (ctx.terminal && !z) return "Das Kartenterminal gehört zu keinem Zugang.";
  return reach(
    ctx,
    ctx.trigger.id,
    z ? [z] : all.map((n) => n.id),
    "Kein Zugang erreichbar.",
  );
}

function needCard(
  ctx: Ctx,
  e: Extract<Expr, { card: string }>,
): string | undefined {
  const kind = e.card as CardKind;
  const holders = [ctx.trigger, ctx.terminal].filter((n) => n !== undefined);
  const states = holders.map((h) => cardState(ctx.topology, h.id, kind));
  const plugged = states.find((s) => s.plugged);
  if (!plugged) {
    const msg = states.find((s) => s.message)?.message;
    if (msg) return msg;
    const canHold =
      ctx.terminal ||
      caps(ctx.catalog, ctx.trigger).some(
        (c) => c === "cardSlots" || c === "nfcCard",
      );
    return canHold
      ? `Keine ${NAMES[kind]} gesteckt.`
      : "Kein Kartenterminal erreichbar.";
  }
  if (e.unlocked && plugged.state === "locked") return plugged.message;
  return e.pin ? plugged.empMessage : undefined; // K-7
}

/** Erste nicht erfüllte Bedingung, `undefined` wenn alles erfüllt ist. */
function unmet(ctx: Ctx, e: Expr): string | undefined {
  if ("all" in e) {
    for (const x of e.all) {
      const r = unmet(ctx, x);
      if (r) return r;
    }
    return undefined;
  }
  if ("any" in e) {
    const reasons = e.any.map((x) => unmet(ctx, x));
    return reasons.every((r) => r !== undefined)
      ? [...new Set(reasons)].join(" Oder: ")
      : undefined;
  }
  if ("card" in e) return needCard(ctx, e);
  if ("present" in e)
    return ofType(ctx, e.present).length > 0 // Vereinfachung, Regelwerk 6.1 „Gerät vorhanden“
      ? undefined
      : `${typeName(ctx.catalog, e.present)} fehlt in der Topologie.`;
  if ("service" in e) {
    const name = typeName(ctx.catalog, e.service);
    const targets = ofType(ctx, e.service);
    return targets.length === 0
      ? `${name} fehlt in der Topologie.`
      : reach(ctx, ctx.trigger.id, targets, `${name} ist nicht erreichbar.`);
  }
  if ("need" in e) {
    switch (e.need) {
      case "zugang":
        return needZugang(ctx);
      case "ti": {
        const r = needZugang(ctx);
        if (r) return r;
        const z = zugangFor(ctx);
        if (!z) return "Kein Zugang erreichbar.";
        const vpn = ofType(ctx, "vpn");
        return vpn.length === 0
          ? "Kein VPN-Zugangsdienst im Netz."
          : reach(
              ctx,
              z,
              vpn,
              "Der Zugang hat keinen Weg zum VPN-Zugangsdienst.",
            );
      }
      case "pruefungsnachweis":
        return unmet(ctx, {
          all: [
            { need: "ti" },
            { card: "egk" },
            { card: "smcb", unlocked: true },
            { service: "vsdm" },
          ],
        });
      case "befugnis":
        return unmet(ctx, {
          any: [{ need: "pruefungsnachweis" }, { service: "popp" }],
        });
    }
  }
  return "Diese Bedingung ist nicht prüfbar.";
}

const usesCard = (e: Expr): boolean =>
  "card" in e ||
  ("all" in e && e.all.some(usesCard)) ||
  ("any" in e && e.any.some(usesCard)) ||
  ("need" in e && (e.need === "pruefungsnachweis" || e.need === "befugnis"));

const offers = (s: Selector, c: Cat, type: string) =>
  "types" in s
    ? s.types.includes(type)
    : (c.deviceTypes.find((d) => d.id === type)?.capabilities ?? []).includes(
        s.capability,
      );

/** Primärsysteme, an denen ein PC oder Tablet hängt: direkt oder über Netzgeräte. */
function hostTypes(node: Node, topology: Topology, c: Cat): string[] {
  const byId = new Map(topology.nodes.map((n) => [n.id, n]));
  const seen = new Set([node.id]);
  const found = new Set<string>();
  const queue = [node.id];
  for (const id of queue)
    for (const e of topology.edges) {
      const [a, b] = e.ends;
      const other = a.node === id ? b.node : b.node === id ? a.node : undefined;
      const n = other === undefined ? undefined : byId.get(other);
      if (!n || seen.has(n.id)) continue;
      seen.add(n.id);
      if (HOSTS.includes(n.type)) found.add(n.type);
      else if (c.deviceTypes.find((d) => d.id === n.type)?.category === "lan")
        queue.push(n.id);
    }
  return [...found];
}

/**
 * Aktionen des Geräts mit `enabled` und Begründung (FR-6, FR-7). Der Katalog
 * führt PC und Tablet in keinem `offeredBy`, sie erben die Aktionen ihres
 * Primärsystems (Auslegung 2026-11-10, T-402).
 */
export function availableActions(
  node: Node,
  topology: Topology,
  catalog: Cat,
): ActionState[] {
  const types = ["pc", "tab"].includes(node.type)
    ? hostTypes(node, topology, catalog)
    : [node.type];
  const choice = caps(catalog, node).includes("cardSlots")
    ? ({ status: "one", terminal: node.id } as const)
    : terminalFor(topology, node.id, catalog);
  const byId = (id: string) => topology.nodes.find((n) => n.id === id);
  const terminals =
    choice.status === "one"
      ? [byId(choice.terminal)]
      : choice.status === "choose"
        ? choice.candidates.map(byId)
        : [undefined];

  return catalog.actions
    .filter((a) => types.some((t) => offers(a.offeredBy, catalog, t)))
    .map((a): ActionState => {
      const base = { id: a.id, name: a.name };
      const withCard = usesCard(a.requires);
      const results = (withCard ? terminals : [undefined]).map((terminal) => ({
        terminal,
        reason: unmet(
          { topology, catalog, trigger: node, terminal },
          a.requires,
        ),
      }));
      const ok = results.filter((r) => !r.reason);
      if (ok.length === 0)
        return {
          ...base,
          enabled: false,
          disabledReason: results[0]?.reason ?? "",
        };
      const ids = ok.flatMap((r) => (r.terminal ? [r.terminal.id] : []));
      return {
        ...base,
        enabled: true,
        ...(choice.status === "choose" &&
          ids.length > 1 && { chooseTerminal: ids }),
      };
    });
}
