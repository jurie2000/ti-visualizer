import type { Catalog, Expr, Node, Selector, Topology } from "../schema";
import { CARD_NAMES, cardState, type CardKind } from "./cards";
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
  /** Zugang der Auswertung, `undefined` ohne Zugang im Netz. */
  zugang: string | undefined;
  /** Terminals dieses Zugangs, die für den Auslöser zählen (Regelwerk 6.0). */
  terminals: Node[];
  /** Terminals, unter denen die Nutzer wählen müssen (Karte steckt in mehreren). */
  ambiguous: Set<string>;
}

// Arbeitsplatz-PC und Tablet bieten die Aktionen dieser Primärsysteme an (Regelwerk 6.2, 6.7).
const HOSTS = ["pvs", "kis", "avs"];

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

function needZugang(ctx: Ctx): string | undefined {
  if (!ctx.zugang)
    return ctx.topology.nodes.some((n) =>
      caps(ctx.catalog, n).includes("zugang"),
    )
      ? "Kein Zugang erreichbar."
      : "Kein Zugang (Konnektor oder TI-Gateway) im Netz.";
  return reach(ctx, ctx.trigger.id, [ctx.zugang], "Kein Zugang erreichbar.");
}

// Karte X (6.1): steckt im Auslöser selbst (NFC, mobiles KT) oder in einem
// Terminal des Zugangs. Karten dürfen auf verschiedene Terminals verteilt sein.
function needCard(
  ctx: Ctx,
  e: Extract<Expr, { card: string }>,
): string | undefined {
  const kind = e.card as CardKind;
  const holders = [ctx.trigger, ...ctx.terminals].map((node) => ({
    node,
    state: cardState(ctx.topology, node.id, kind),
  }));
  const plugged = holders.filter((h) => h.state.plugged);
  if (plugged.length === 0) {
    const msg = holders.find((h) => h.state.message)?.state.message;
    if (msg) return msg;
    const canHold =
      ctx.terminals.length > 0 ||
      caps(ctx.catalog, ctx.trigger).some(
        (c) => c === "cardSlots" || c === "nfcCard",
      );
    return canHold
      ? `Keine ${CARD_NAMES[kind]} gesteckt.`
      : "Kein Kartenterminal erreichbar.";
  }
  const fits = plugged.filter(
    (h) =>
      !(e.unlocked && h.state.state === "locked") &&
      !(e.pin && h.state.empMessage), // K-7
  );
  const [first] = fits;
  if (!first) return plugged[0]?.state.message ?? plugged[0]?.state.empMessage;
  if (!fits.some((h) => h.node === ctx.trigger) && fits.length > 1)
    fits.forEach((h) => ctx.ambiguous.add(h.node.id));
  return undefined;
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
    // Mehrdeutige Terminals zählen nur aus dem ersten erfüllten Zweig.
    const outer = ctx.ambiguous;
    const branches = e.any.map((x) => {
      ctx.ambiguous = new Set();
      return { reason: unmet(ctx, x), ambiguous: ctx.ambiguous };
    });
    ctx.ambiguous = outer;
    const ok = branches.find((b) => !b.reason);
    ok?.ambiguous.forEach((id) => outer.add(id));
    return ok
      ? undefined
      : [...new Set(branches.map((b) => b.reason))].join(" Oder: ");
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
        if (r || !ctx.zugang) return r;
        const vpn = ofType(ctx, "vpn");
        return vpn.length === 0
          ? "Kein VPN-Zugangsdienst im Netz."
          : reach(
              ctx,
              ctx.zugang,
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

const offers = (s: Selector, c: Cat, type: string) =>
  "types" in s
    ? s.types.includes(type)
    : (c.deviceTypes.find((d) => d.id === type)?.capabilities ?? []).includes(
        s.capability,
      );

/** Primärsysteme, an denen ein PC oder Tablet hängt: direkt oder über Netzgeräte. Ausgefallene Geräte und Kanten trennen die Verbindung (P-1, P-2). */
function hostTypes(node: Node, topology: Topology, c: Cat): string[] {
  const byId = new Map(topology.nodes.map((n) => [n.id, n]));
  const seen = new Set([node.id]);
  const found = new Set<string>();
  const queue = [node.id];
  for (const id of queue)
    for (const e of topology.edges) {
      if (e.fault) continue;
      const [a, b] = e.ends;
      const other = a.node === id ? b.node : b.node === id ? a.node : undefined;
      const n = other === undefined ? undefined : byId.get(other);
      if (!n || n.fault || seen.has(n.id)) continue;
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
  // Je Zugang eine Auswertung: Terminals nach `zugangOf` gruppiert (6.0, 6.1).
  const own = caps(catalog, node).includes("cardSlots");
  const choice = own ? undefined : terminalFor(topology, node.id, catalog);
  const ids =
    choice?.status === "one"
      ? [choice.terminal]
      : choice?.status === "choose"
        ? choice.candidates
        : [];
  const groups = new Map<string | undefined, Node[]>();
  if (own) groups.set(zugangOf(topology, node.id, catalog), []);
  for (const t of topology.nodes.filter((n) => ids.includes(n.id))) {
    const z = zugangOf(topology, t.id, catalog);
    groups.set(z, [...(groups.get(z) ?? []), t]);
  }
  if (groups.size === 0)
    for (const n of topology.nodes)
      if (caps(catalog, n).includes("zugang")) groups.set(n.id, []);
  if (groups.size === 0) groups.set(undefined, []);

  return catalog.actions
    .filter((a) => types.some((t) => offers(a.offeredBy, catalog, t)))
    .map((a): ActionState => {
      const base = { id: a.id, name: a.name };
      const results = [...groups].map(([zugang, terminals]) => {
        const ctx: Ctx = {
          topology,
          catalog,
          trigger: node,
          zugang,
          terminals,
          ambiguous: new Set(),
        };
        return {
          reason: unmet(ctx, a.requires),
          ambiguous: [...ctx.ambiguous],
        };
      });
      const ok = results.find((r) => !r.reason);
      if (!ok)
        return {
          ...base,
          enabled: false,
          disabledReason: results[0]?.reason ?? "",
        };
      return {
        ...base,
        enabled: true,
        ...(ok.ambiguous.length > 0 && { chooseTerminal: ok.ambiguous }),
      };
    });
}
