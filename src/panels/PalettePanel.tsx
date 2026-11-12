import { useReactFlow } from "@xyflow/react";
import {
  FALLBACK_ICON,
  ICONS,
  NODE_SIZE,
  categoryColor,
} from "../canvas/deviceStyle";
import {
  simLocked,
  useCatalog,
  useSettings,
  useSim,
  useTopology,
  useUi,
} from "../store";
import type { RailItem } from "../app/SidePanel";
import { useToast } from "../ui/Toast";
import { Palette } from "./Palette";
import type { DeviceType } from "./PaletteItem";

const visibleSimple = (d: DeviceType) => d.visibleSimple;

/**
 * Palette in der App-Shell: Enter/Klick setzt das Gerät in die Mitte des
 * sichtbaren Canvas-Bereichs (leicht versetzt, damit Geräte nicht exakt
 * übereinander landen). Läuft innerhalb des `ReactFlowProvider`.
 * Im Modus Einfach zeigt sie nur Typen mit `visibleSimple` (Regelwerk 11).
 */
export function PalettePanel({
  onAdded,
  reveal,
}: {
  onAdded?: () => void;
  reveal?: { id: string; n: number } | undefined;
}) {
  const { screenToFlowPosition } = useReactFlow();
  const addNode = useTopology((s) => s.addNode);
  const select = useUi((s) => s.select);
  const mode = useSettings((s) => s.mode);
  const toast = useToast();

  const add = (type: string) => {
    if (simLocked(useSim.getState().sim)) {
      toast.show("Während der Simulation ist die Topologie gesperrt.");
      return;
    }
    const canvas = document.querySelector(".react-flow");
    const rect = canvas?.getBoundingClientRect();
    const center = screenToFlowPosition({
      x: (rect?.left ?? 0) + (rect?.width ?? 0) / 2,
      y: (rect?.top ?? 0) + (rect?.height ?? 0) / 2,
    });
    const shift = (useTopology.getState().topology.nodes.length % 6) * 24;
    const result = addNode(type, {
      x: Math.round(center.x - NODE_SIZE.width / 2 + shift),
      y: Math.round(center.y - NODE_SIZE.height / 2 + shift),
    });
    if (!result.ok) toast.show(result.reason);
    else if (result.id) {
      select({ kind: "node", id: result.id });
      onAdded?.(); // Überlagerung schließen, damit das neue Gerät sichtbar ist (T-703)
    }
  };

  return (
    <Palette
      onAdd={add}
      filter={mode === "simple" ? visibleSimple : undefined}
      reveal={reveal}
    />
  );
}

/** Schienen-Symbole der Palette (T-711): je Kategorie mit passenden Geräten das Symbol ihres ersten Geräts. */
export function usePaletteRail(onReveal: (id: string) => void): RailItem[] {
  const catalog = useCatalog((s) => s.catalog);
  const mode = useSettings((s) => s.mode);
  return [...catalog.categories]
    .sort((a, b) => a.order - b.order)
    .flatMap((c) => {
      const first = catalog.deviceTypes.find(
        (d) =>
          d.placeable &&
          d.category === c.id &&
          (mode !== "simple" || visibleSimple(d)),
      );
      return first
        ? [
            {
              label: c.name,
              icon: ICONS[first.icon] ?? FALLBACK_ICON,
              color: categoryColor(c.id),
              onClick: () => {
                onReveal(c.id);
              },
            },
          ]
        : [];
    });
}
