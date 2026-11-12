import { useEffect, useMemo, useState } from "react";
import { categoryColor } from "../canvas/deviceStyle";
import { useCatalog } from "../store";
import { PaletteGroup } from "./PaletteGroup";
import { PaletteItem, type DeviceType } from "./PaletteItem";
import "./palette.css";

interface Props {
  /** Fügt ein Gerät dieses Typs ein (Position bestimmt der Aufrufer). */
  onAdd: (type: string) => void;
  /**
   * Filter (T-207): `PalettePanel` zeigt im Modus Einfach nur Typen mit `visibleSimple`.
   * Ohne Angabe erscheinen alle platzierbaren Typen.
   */
  filter?: ((device: DeviceType) => boolean) | undefined;
  /** Schienen-Symbol (T-711): klappt diese Gruppe auf und scrollt sie ins Bild; `n` zählt die Klicks. */
  reveal?: { id: string; n: number } | undefined;
}

const PINNED = "__pinned";

const toggled = (set: Set<string>, id: string) => {
  const next = new Set(set);
  if (!next.delete(id)) next.add(id);
  return next;
};

/** Gerätepalette: nach Kategorie gruppiert, einklappbar, anpinnbar, mit Suche. */
export function Palette({ onAdd, filter, reveal }: Props) {
  const catalog = useCatalog((s) => s.catalog);
  const [query, setQuery] = useState("");
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const [pinned, setPinned] = useState<Set<string>>(new Set());
  const searching = query.trim() !== "";

  // Neuer Klick auf ein Schienen-Symbol: Gruppe aufklappen (Zustand beim Rendern angleichen)
  const [seen, setSeen] = useState(reveal);
  if (reveal !== seen) {
    setSeen(reveal);
    if (reveal)
      setClosed((c) => new Set([...c].filter((x) => x !== reveal.id)));
  }
  useEffect(() => {
    if (reveal)
      document
        .querySelector(`[data-group="${reveal.id}"]`)
        ?.scrollIntoView({ block: "start" });
  }, [reveal]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const devices = catalog.deviceTypes.filter(
      (d) =>
        d.placeable &&
        (filter?.(d) ?? true) &&
        (!q ||
          d.name.toLowerCase().includes(q) ||
          d.abbr.toLowerCase().includes(q)),
    );
    const byCategory = [...catalog.categories]
      .sort((a, b) => a.order - b.order)
      .map((c) => ({
        id: c.id,
        title: c.name,
        color: categoryColor(c.id),
        devices: devices.filter((d) => d.category === c.id),
      }));
    const pins = devices.filter((d) => pinned.has(d.id));
    return [
      ...(pins.length
        ? [{ id: PINNED, title: "Angepinnt", color: undefined, devices: pins }]
        : []),
      ...byCategory,
    ].filter((g) => g.devices.length > 0);
  }, [catalog, query, filter, pinned]);

  return (
    <div className="tiv-palette__root">
      <h2 className="tiv-palette__heading">Gerätepalette</h2>
      <input
        type="search"
        className="tiv-palette__search"
        aria-label="Geräte suchen"
        placeholder="Gerät suchen"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
        }}
      />
      <p className="tiv-palette__empty" role="status">
        {groups.length === 0 ? "Kein Gerät gefunden." : ""}
      </p>
      {groups.map((g) => (
        <PaletteGroup
          key={g.id}
          title={g.title}
          count={g.devices.length}
          color={g.color}
          id={g.id}
          // Bei einer Suche sind alle Treffer sichtbar
          open={searching || !closed.has(g.id)}
          onToggle={() => {
            setClosed(toggled(closed, g.id));
          }}
        >
          {g.devices.map((d) => (
            <PaletteItem
              key={d.id}
              device={d}
              pinned={pinned.has(d.id)}
              onAdd={onAdd}
              onTogglePin={(id) => {
                setPinned(toggled(pinned, id));
              }}
            />
          ))}
        </PaletteGroup>
      ))}
    </div>
  );
}
