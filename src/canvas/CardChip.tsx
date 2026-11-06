import { AlertTriangle, CreditCard, Lock } from "lucide-react";
import { cardState, type CardKind } from "../engine/cards";
import type { AnyCard } from "../schema";
import { useTopology } from "../store";

export const CARD_NAMES: Record<CardKind, string> = {
  egk: "eGK",
  hba: "HBA",
  smcb: "SMC-B",
};

/**
 * Karte im Terminal (K-2, K-3, K-4). Zustand steht im Text und im Symbol,
 * nie nur in der Farbe. „ziehen“ ist ein eigener Knopf (kein Ziehen mit der Maus).
 */
export function CardChip({
  nodeId,
  card,
  nfc,
}: {
  nodeId: string;
  card: AnyCard;
  nfc: boolean;
}) {
  const topology = useTopology((s) => s.topology);
  const unplug = useTopology((s) => s.unplugCard);
  const { state, empMessage } = cardState(topology, nodeId, card.kind);
  const name = CARD_NAMES[card.kind];
  const status =
    state === "expired"
      ? "abgelaufen"
      : state === "locked"
        ? "nicht freigeschaltet"
        : empMessage
          ? "PIN aus"
          : "";
  const way = nfc ? "NFC · ISO 14443, CAN" : "gesteckt · ISO 7816";
  return (
    <span className={`tiv-chip tiv-chip--${state} nodrag nopan`}>
      {state === "expired" ? (
        <AlertTriangle size={12} aria-hidden="true" />
      ) : state === "locked" ? (
        <Lock size={12} aria-hidden="true" />
      ) : (
        <CreditCard size={12} aria-hidden="true" />
      )}
      <span>
        {name}
        {status && ` (${status})`} · {way}
      </span>
      <button
        type="button"
        className="tiv-chip__unplug"
        aria-label={`${name} ziehen`}
        onClick={() => {
          unplug(nodeId, card.kind);
        }}
      >
        ×
      </button>
    </span>
  );
}
