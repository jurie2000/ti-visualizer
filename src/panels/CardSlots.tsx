import { CardChip } from "../canvas/CardChip";
import { missingKinds, plugCardDialog } from "../dialogs/PlugCardDialog";
import type { AnyCard, Catalog, Node } from "../schema";
import { useTopology, useUi } from "../store";
import { Button } from "../ui/Button";

/**
 * Gesteckte Karten eines Geräts (Mockup `showCardSlots`, FR-8, K-2). Gilt in beiden Modi.
 * Stecken öffnet den vorhandenen Dialog (Ablaufdatum K-3, PIN K-4), Ziehen ist der Knopf am Chip.
 */
export function CardSlots({ node, catalog }: { node: Node; catalog: Catalog }) {
  const device = catalog.deviceTypes.find((d) => d.id === node.type);
  const caps = device?.capabilities ?? [];
  const nfc = caps.includes("nfcCard");
  const topology = useTopology((s) => s.topology);
  if (!nfc && !caps.includes("cardSlots") && !caps.includes("hsmSlot"))
    return null;
  const cards = node.cards ?? [];
  const software = (c: AnyCard) => {
    const id = c.kind === "hsmb" ? c.software : undefined;
    const n = topology.nodes.find((x) => x.id === id);
    return (
      n &&
      (n.label ??
        catalog.deviceTypes.find((d) => d.id === n.type)?.name ??
        n.id)
    );
  };
  return (
    <section className="tiv-cards" aria-label="Gesteckte Karten">
      <h4>Gesteckte Karten</h4>
      <div className="tiv-cards__list">
        {cards.length === 0 && <span>Noch keine Karte gesteckt.</span>}
        {cards.map((c) => (
          <CardChip
            key={c.kind}
            nodeId={node.id}
            card={c}
            nfc={nfc}
            owner={node.label ?? device?.name ?? node.type}
            software={software(c)}
          />
        ))}
      </div>
      {missingKinds(node, device).free.length > 0 && (
        <Button
          onClick={() => {
            useUi.getState().openDialog(plugCardDialog(node.id));
          }}
        >
          Karte stecken
        </Button>
      )}
    </section>
  );
}
