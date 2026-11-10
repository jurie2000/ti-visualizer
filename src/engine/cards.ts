import type { AnyCard, Catalog, Topology } from "../schema";

export type CardKind = AnyCard["kind"];
export type CardResult =
  { ok: true; topology: Topology } | { ok: false; message: string };

/** `plugged` ist false bei `none` und bei `expired`: abgelaufen zählt als nicht gesteckt (K-3). */
export interface CardState {
  state: "none" | "expired" | "locked" | "ready";
  plugged: boolean;
  card?: AnyCard;
  message?: string;
  /** Nur eGK (K-7): Meldung, wenn die PIN für den Medikationsplan nicht zur Verfügung steht. */
  empMessage?: string;
}

export const MESSAGES = {
  // K-8
  noSlot:
    "Smartcards werden nur in ein Kartenterminal gesteckt, nie direkt an Konnektor, Primärsystem oder Fachdienst.",
  // K-6
  nfcOnlyEgk:
    "Über eHealth-CardLink wird nur die eGK gelesen, ohne PIN. HBA und SMC-B gehören in ein stationäres Kartenterminal.",
  // K-2
  full: "Alle Kartenarten stecken bereits in diesem Terminal.",
  // K-9
  elsewhere: "Diese Karte steckt bereits in einem anderen Terminal.",
  // K-7
  emp: "Für den Medikationsplan ist die PIN der eGK nötig.",
} as const;

export const CARD_NAMES: Record<CardKind, string> = {
  egk: "eGK",
  hba: "HBA",
  smcb: "SMC-B",
};

const germanDate = (iso: string) => iso.split("-").reverse().join(".");

/** Stecken (K-1, K-2, K-6, K-8, K-9). Liefert eine neue Topologie, die alte bleibt unverändert. */
export function plugCard(
  topology: Topology,
  nodeId: string,
  card: AnyCard,
  catalog: Catalog,
): CardResult {
  const node = topology.nodes.find((n) => n.id === nodeId);
  if (!node) return { ok: false, message: "Gerät nicht gefunden." };
  const caps =
    catalog.deviceTypes.find((t) => t.id === node.type)?.capabilities ?? [];
  const slots = caps.includes("cardSlots");
  if (!slots && !caps.includes("nfcCard"))
    return { ok: false, message: MESSAGES.noSlot };
  if (!slots && card.kind !== "egk")
    return { ok: false, message: MESSAGES.nfcOnlyEgk };
  // K-6: per NFC (CAN) gibt es keine PIN, also auch keine Einwilligung für eMP (K-7).
  if (!slots && card.kind === "egk") card = { ...card, pinActive: false };
  const cards = node.cards ?? [];
  if (cards.some((c) => c.kind === card.kind))
    return { ok: false, message: MESSAGES.full };
  if (
    card.id !== undefined &&
    topology.nodes.some((n) => n.cards?.some((c) => c.id === card.id))
  )
    return { ok: false, message: MESSAGES.elsewhere };
  return {
    ok: true,
    topology: {
      ...topology,
      nodes: topology.nodes.map((n) =>
        n.id === nodeId ? { ...n, cards: [...cards, card] } : n,
      ),
    },
  };
}

/** Ziehen (K-2): entfernt die Karte der Art. Ohne Karte bleibt der Inhalt gleich. */
export function unplugCard(
  topology: Topology,
  nodeId: string,
  kind: CardKind,
): Topology {
  return {
    ...topology,
    nodes: topology.nodes.map((n) =>
      n.id === nodeId && n.cards
        ? { ...n, cards: n.cards.filter((c) => c.kind !== kind) }
        : n,
    ),
  };
}

/** Zustand der Karte einer Art im Gerät, gemessen am `simDate` (K-3, K-4, K-7). */
export function cardState(
  topology: Topology,
  nodeId: string,
  kind: CardKind,
): CardState {
  const card = topology.nodes
    .find((n) => n.id === nodeId)
    ?.cards?.find((c) => c.kind === kind);
  if (!card) return { state: "none", plugged: false };
  if (card.expires < topology.simDate)
    return {
      state: "expired",
      plugged: false,
      card,
      message: `${CARD_NAMES[kind]} ist seit ${germanDate(card.expires)} abgelaufen.`,
    };
  if (card.kind === "egk")
    return {
      state: "ready",
      plugged: true,
      card,
      ...(card.pinActive === false && { empMessage: MESSAGES.emp }),
    };
  if (!card.unlocked)
    return {
      state: "locked",
      plugged: true,
      card,
      message: `${CARD_NAMES[kind]} ist nicht freigeschaltet.`,
    };
  return { state: "ready", plugged: true, card };
}
