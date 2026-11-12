import { CardChip } from "../canvas/CardChip";
import { plugCardDialog } from "../dialogs/PlugCardDialog";
import type { Catalog, Node } from "../schema";
import { useUi } from "../store";
import { Button } from "../ui/Button";

/**
 * Gesteckte Karten eines Geräts (Mockup `showCardSlots`, FR-8, K-2). Gilt in beiden Modi.
 * Stecken öffnet den vorhandenen Dialog (Ablaufdatum K-3, PIN K-4), Ziehen ist der Knopf am Chip.
 */
export function CardSlots({ node, catalog }: { node: Node; catalog: Catalog }) {
  const device = catalog.deviceTypes.find((d) => d.id === node.type);
  const caps = device?.capabilities ?? [];
  const nfc = caps.includes("nfcCard");
  if (!nfc && !caps.includes("cardSlots")) return null;
  const cards = node.cards ?? [];
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
          />
        ))}
      </div>
      <Button
        onClick={() => {
          useUi.getState().openDialog(plugCardDialog(node.id));
        }}
      >
        Karte stecken
      </Button>
    </section>
  );
}
