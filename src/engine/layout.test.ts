import { describe, expect, it } from "vitest";
import { loadCatalog, type Topology } from "../schema";
import { arrange, tileSize } from "./layout";
import { containedNodes } from "./zones";

const catalog = loadCatalog();
const SIZE = { width: 148, height: 64 };
const preset = (id: string) => {
  const p = catalog.presets.find((x) => x.id === id);
  if (!p) throw new Error(id);
  return p.topology;
};
const center = (t: Topology, id: string) => {
  const n = t.nodes.find((x) => x.id === id);
  if (!n) throw new Error(id);
  const s = tileSize(n, catalog, SIZE);
  return { x: n.position.x + s.width / 2, y: n.position.y + s.height / 2 };
};
type P = { x: number; y: number };
const side = (a: P, b: P, c: P) =>
  Math.sign((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x));

/** Gerade Linien zwischen Gerätemitten; Kanten am selben Gerät zählen nicht. */
function crossings(t: Topology): number {
  let n = 0;
  const es = t.edges.map((e) => e.ends.map((x) => x.node));
  for (let i = 0; i < es.length; i++)
    for (let j = i + 1; j < es.length; j++) {
      const [a, b] = es[i] ?? [];
      const [c, d] = es[j] ?? [];
      if (!a || !b || !c || !d || a === c || a === d || b === c || b === d)
        continue;
      const [p, q, r, s] = [a, b, c, d].map((id) => center(t, id)) as [
        P,
        P,
        P,
        P,
      ];
      if (
        side(p, q, r) * side(p, q, s) < 0 &&
        side(r, s, p) * side(r, s, q) < 0
      )
        n++;
    }
  return n;
}

const sorted = (t: Topology) => arrange(t, catalog, SIZE);

/** Gemessene Größen je Modus (Einfach: Basis plus Kartenmarken; Erweitert: Schätzung; Groß: Zuschlag). */
const MODI = {
  einfach: (n: Topology["nodes"][number]) => ({
    width: SIZE.width,
    height: SIZE.height + 25 * (n.cards?.length ?? 0),
  }),
  erweitert: (n: Topology["nodes"][number]) => tileSize(n, catalog, SIZE),
  gross: (n: Topology["nodes"][number]) => ({
    width: SIZE.width + 20,
    height: tileSize(n, catalog, SIZE).height + 40,
  }),
};
const rects = (
  t: Topology,
  measured: Map<string, ReturnType<typeof tileSize>>,
) =>
  t.nodes.map((n) => {
    const s = tileSize(n, catalog, SIZE, measured.get(n.id));
    return { id: n.id, ...n.position, w: s.width, h: s.height };
  });
const pos = (t: Topology, id: string) => center(t, id);

describe("T-720a Sortieren (FR-16)", () => {
  // Die Presets sind seit T-724b mit „Sortieren“ angeordnet (Software und Rechner). Das Verfahren lässt Kanten übrig, die
  // nicht im Baum der Breitensuche liegen: timc1-tim1 (Gerät ohne Weg zur Wurzel
  // unten links, Fachdienst rechts) und im Klinikum die Querverbindungen zu kis1.
  // Orthogonale Führung (T-713b) und Anschlusspunkte (#106) sind nicht Teil von T-720a.
  it.each([
    ["praxis", 1, 1],
    ["apotheke", 0, 0],
    ["krankenhaus", 1, 1],
    ["klinikum", 7, 7],
  ])("T-720a Kreuzungen %s: vorher %i, nachher %i", (id, vorher, nachher) => {
    expect(crossings(preset(id))).toBe(vorher);
    expect(crossings(sorted(preset(id)))).toBe(nachher);
  });

  it.each(["praxis", "apotheke", "krankenhaus", "klinikum"])(
    "T-720a keine Überlappung, Abstand Zeile 30 und Spalte 80 (%s, alle Modi)",
    (id) => {
      for (const sizeOf of Object.values(MODI)) {
        const measured = new Map(
          preset(id).nodes.map((n) => [n.id, sizeOf(n)]),
        );
        const r = arrange(preset(id), catalog, SIZE, measured);
        const rs = rects(r, measured);
        for (const a of rs)
          for (const b of rs) {
            if (a.id >= b.id) continue;
            const gx = Math.max(a.x - (b.x + b.w), b.x - (a.x + a.w));
            const gy = Math.max(a.y - (b.y + b.h), b.y - (a.y + a.h));
            // Spalten liegen mindestens 80 auseinander, Zeilen in einer Spalte mindestens 30
            expect(Math.max(gx, gy), `${a.id}/${b.id}`).toBeGreaterThanOrEqual(
              30,
            );
            if (gy < 30)
              expect(gx, `${a.id}/${b.id}`).toBeGreaterThanOrEqual(80);
          }
      }
    },
  );

  it.each(["praxis", "apotheke", "krankenhaus", "klinikum"])(
    "T-720a Zonenrahmen überdecken kein fremdes Gerät (%s)",
    (id) => {
      const t = preset(id);
      const r = sorted(t);
      t.zones.forEach((z, i) => {
        const vorher = new Set(
          containedNodes(z, t.nodes, SIZE).map((n) => n.id),
        );
        const zone = r.zones[i];
        if (!zone) throw new Error("Zone fehlt");
        const nachher = containedNodes(zone, r.nodes, SIZE).map((n) => n.id);
        expect(nachher.filter((n) => !vorher.has(n))).toEqual([]);
      });
    },
  );

  it("T-720a Spalten: gleiche Tiefe gleiche x, Eltern mittig über den Kindern", () => {
    const t: Topology = {
      ...preset("praxis"),
      zones: [],
    };
    const r = sorted(t);
    const cat = (type: string) =>
      catalog.deviceTypes.find((d) => d.id === type)?.category;
    const spalten = [
      ...new Set(
        r.nodes
          .filter((n) => cat(n.type) !== "service")
          .map((n) => n.position.x),
      ),
    ];
    for (const x of spalten) expect((x - 40) % (SIZE.width + 118)).toBe(0);
    const vpn = r.nodes.find((n) => n.type === "vpn");
    expect(vpn?.position.x).toBe(Math.max(...spalten));
    const par = sorted({
      ...emptyOf(),
      nodes: ["w", "a", "b"].map((id, i) => ({
        id,
        // Server statt PC: gleich hohe Kachel wie der VPN-Zugang (der PC hat seit T-724c fünf Anschlüsse)
        type: id === "w" ? "vpn" : "server",
        fault: false,
        position: { x: i * 10, y: 0 },
      })),
      edges: ["a", "b"].map((k) => ({
        id: `e${k}`,
        fault: false,
        ends: [
          { node: "w", port: "x" },
          { node: k, port: "y" },
        ] as [{ node: string; port: string }, { node: string; port: string }],
      })),
    });
    const mid = (pos(par, "a").y + pos(par, "b").y) / 2;
    expect(pos(par, "w").y).toBe(mid);
    expect(pos(par, "a").x).toBe(pos(par, "b").x);
    expect(pos(par, "a").x).toBeLessThan(pos(par, "w").x);
  });

  it("T-720a Zone zieht mit: Geräte der Zone liegen danach in ihr, Zonen bleiben erhalten", () => {
    const t = preset("klinikum");
    const r = sorted(t);
    expect(r.zones).toHaveLength(t.zones.length);
    t.zones.forEach((z, i) => {
      const alt = t.nodes.filter((n) => {
        const cx = n.position.x + SIZE.width / 2;
        const cy = n.position.y + SIZE.height / 2;
        return (
          cx >= z.area.x &&
          cx <= z.area.x + z.area.w &&
          cy >= z.area.y &&
          cy <= z.area.y + z.area.h
        );
      });
      const a = r.zones[i]?.area;
      expect(a).toBeDefined();
      for (const n of alt) {
        const c = center(r, n.id);
        expect(c.x).toBeGreaterThanOrEqual(a?.x ?? Infinity);
        expect(c.x).toBeLessThanOrEqual((a?.x ?? 0) + (a?.w ?? 0));
        expect(c.y).toBeGreaterThanOrEqual(a?.y ?? Infinity);
        expect(c.y).toBeLessThanOrEqual((a?.y ?? 0) + (a?.h ?? 0));
      }
    });
  });

  it("T-720a überlappende Zonen: jede umschließt danach ihre Mitglieder", () => {
    const t = preset("praxis");
    const ids = t.nodes.slice(0, 4).map((n) => n.id);
    const nodes = t.nodes.map((n) => ({
      ...n,
      position: ids.includes(n.id) ? { x: 100, y: 100 } : { x: 3000, y: 3000 },
    }));
    const zone = (id: string) => ({
      id,
      area: { x: 0, y: 0, w: 400, h: 400 },
      tone: "sage" as const,
    });
    const r = sorted({ ...t, nodes, zones: [zone("a"), zone("b")] });
    for (const z of r.zones)
      for (const id of ids) {
        const c = center(r, id);
        expect(c.x).toBeGreaterThanOrEqual(z.area.x);
        expect(c.x).toBeLessThanOrEqual(z.area.x + z.area.w);
        expect(c.y).toBeGreaterThanOrEqual(z.area.y);
        expect(c.y).toBeLessThanOrEqual(z.area.y + z.area.h);
      }
  });

  it("T-720a Zone ohne Mitglieder bleibt unverändert", () => {
    const zone = {
      id: "z",
      area: { x: 5000, y: 5000, w: 100, h: 100 },
      tone: "sage" as const,
    };
    const t = { ...preset("praxis"), zones: [zone] };
    expect(sorted(t).zones).toEqual([zone]);
  });

  it("T-720a Gerät ohne Verbindung bleibt erhalten, leere Topologie bleibt gleich", () => {
    const t = preset("praxis");
    const lose = {
      ...t,
      nodes: [
        ...t.nodes,
        { id: "lose", type: "pc", fault: false, position: { x: 1, y: 1 } },
      ],
    };
    const r = sorted(lose);
    expect(r.nodes).toHaveLength(lose.nodes.length);
    const unten = Math.max(
      ...t.nodes.map(
        (n) => sorted(t).nodes.find((x) => x.id === n.id)?.position.y ?? 0,
      ),
    );
    expect(r.nodes.find((n) => n.id === "lose")?.position.y).toBeGreaterThan(
      unten - 1,
    );
    const leer = { ...t, nodes: [], edges: [], zones: [] };
    expect(sorted(leer)).toBe(leer);
  });

  it("T-720a Sortieren ist stabil (zweimal gleich)", () => {
    const r = sorted(preset("krankenhaus"));
    expect(sorted(r).nodes).toEqual(r.nodes);
  });
});

function emptyOf(): Topology {
  return { ...preset("praxis"), nodes: [], edges: [], zones: [] };
}
