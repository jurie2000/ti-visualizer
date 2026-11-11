import { create } from "zustand";
import { defaultConfig } from "../engine/config";
import { plugCard, unplugCard, type CardKind } from "../engine/cards";
import { autoPorts, validateConnection } from "../engine/rules";
import {
  configVariantOf,
  configVariants,
  LIMITS,
  type AnyCard,
  type Point,
  type Topology,
} from "../schema";
import { useCatalog } from "./catalogStore";

/** D25: so viele Schritte merkt sich Rückgängig. */
export const HISTORY_LIMIT = 80;

/** Ergebnis einer Aktion. Bei `ok: false` steht die Begründung für die Anzeige (Toast, T-204) bereit. */
export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; reason: string; ruleId?: string | undefined };

export const emptyTopology = (): Topology => ({
  name: "",
  description: "",
  simDate: new Date().toISOString().slice(0, 10),
  nodes: [],
  edges: [],
  zones: [],
});

interface TopologyState {
  topology: Topology;
  past: Topology[];
  future: Topology[];
  /** Neuer Stand ohne Verlauf (Programmstart). */
  reset: (topology: Topology) => void;
  /** Ersetzt die Topologie als ein Rückgängig-Schritt (Öffnen, Preset). */
  replace: (topology: Topology) => void;
  addNode: (type: string, position: Point) => ActionResult;
  /** Ein Schritt je Aufruf: die Canvas ruft es beim Loslassen, nicht bei jeder Mausbewegung. */
  moveNodes: (moves: Record<string, Point>) => void;
  removeNode: (id: string) => void;
  /** Ohne Anschlüsse wählt `autoPorts` das erste freie Paar (A-3). */
  connect: (
    a: string,
    b: string,
    ports?: { a: string; b: string },
  ) => ActionResult;
  removeEdge: (id: string) => void;
  plugCard: (nodeId: string, card: AnyCard) => ActionResult;
  unplugCard: (nodeId: string, kind: CardKind) => void;
  /** Setzt Felder der Geräteeinstellungen (Regelwerk 8); `undefined` leert ein Feld. Prüft gegen das Schema der Variante. */
  setConfig: (nodeId: string, patch: Record<string, unknown>) => ActionResult;
  /** Schaltet die Störung von Gerät oder Kante um. */
  toggleFault: (id: string) => void;
  /** Lehnt zu lange Texte ab (Grenzen aus `LIMITS`). */
  setMeta: (
    meta: Partial<Pick<Topology, "name" | "description">>,
  ) => ActionResult;
  undo: () => void;
  redo: () => void;
}

const clamp = (v: number) => Math.max(-LIMITS.coord, Math.min(LIMITS.coord, v));

const freeId = (prefix: string, t: Topology) => {
  const used = new Set([...t.nodes, ...t.edges, ...t.zones].map((e) => e.id));
  let n = 1;
  while (used.has(`${prefix}-${String(n)}`)) n++;
  return `${prefix}-${String(n)}`;
};

export const useTopology = create<TopologyState>((set, get) => {
  /** Übernimmt `next` als neuen Stand und merkt den alten für Rückgängig. */
  const commit = (next: Topology) => {
    // Aktionen ohne Wirkung (unbekannte ID, nichts zu ziehen) legen keinen Schritt an
    if (JSON.stringify(next) === JSON.stringify(get().topology)) return;
    set((s) => ({
      topology: next,
      past: [...s.past, s.topology].slice(-HISTORY_LIMIT),
      future: [],
    }));
  };
  const catalog = () => useCatalog.getState().catalog;
  const fail = (reason: string): ActionResult => ({ ok: false, reason });

  return {
    topology: emptyTopology(),
    past: [],
    future: [],
    reset: (topology) => {
      set({ topology, past: [], future: [] });
    },
    replace: commit,

    addNode: (type, position) => {
      const t = get().topology;
      const device = catalog().deviceTypes.find((d) => d.id === type);
      if (!device?.placeable) return fail("Dieses Gerät gibt es nicht.");
      if (t.nodes.length >= LIMITS.nodes)
        return fail(
          `Mehr als ${String(LIMITS.nodes)} Geräte sind nicht möglich.`,
        );
      const id = freeId(type, t);
      const config = defaultConfig(type, t, catalog());
      commit({
        ...t,
        nodes: [
          ...t.nodes,
          { id, type, position, fault: false, ...(config && { config }) },
        ],
      });
      return { ok: true, id };
    },

    moveNodes: (moves) => {
      const t = get().topology;
      commit({
        ...t,
        nodes: t.nodes.map((n) => {
          const position = moves[n.id];
          return position
            ? { ...n, position: { x: clamp(position.x), y: clamp(position.y) } }
            : n;
        }),
      });
    },

    removeNode: (id) => {
      const t = get().topology;
      commit({
        ...t,
        nodes: t.nodes.filter((n) => n.id !== id),
        edges: t.edges.filter((e) => e.ends.every((end) => end.node !== id)),
      });
    },

    connect: (a, b, ports) => {
      const t = get().topology;
      const c = catalog();
      const check = validateConnection(t, a, ports?.a, b, ports?.b, c);
      if (!check.ok)
        return {
          ok: false,
          reason: check.reason ?? "Verbindung nicht möglich.",
          ruleId: check.ruleId,
        };
      if (t.edges.length >= LIMITS.edges)
        return fail(
          `Mehr als ${String(LIMITS.edges)} Verbindungen sind nicht möglich.`,
        );
      const pair = ports ?? autoPorts(t, a, b, c);
      if (!pair) return fail("Kein freier Anschluss.");
      const id = freeId("e", t);
      commit({
        ...t,
        edges: [
          ...t.edges,
          {
            id,
            fault: false,
            ends: [
              { node: a, port: pair.a },
              { node: b, port: pair.b },
            ],
          },
        ],
      });
      return { ok: true, id };
    },

    removeEdge: (id) => {
      const t = get().topology;
      commit({ ...t, edges: t.edges.filter((e) => e.id !== id) });
    },

    plugCard: (nodeId, card) => {
      const r = plugCard(get().topology, nodeId, card, catalog());
      if (!r.ok) return fail(r.message);
      commit(r.topology);
      return { ok: true };
    },

    unplugCard: (nodeId, kind) => {
      commit(unplugCard(get().topology, nodeId, kind));
    },

    toggleFault: (id) => {
      const t = get().topology;
      const flip = <T extends { id: string; fault: boolean }>(e: T): T =>
        e.id === id ? { ...e, fault: !e.fault } : e;
      commit({ ...t, nodes: t.nodes.map(flip), edges: t.edges.map(flip) });
    },

    setConfig: (nodeId, patch) => {
      const t = get().topology;
      const c = catalog();
      const node = t.nodes.find((n) => n.id === nodeId);
      const type = c.deviceTypes.find((d) => d.id === node?.type);
      const variant = type && configVariantOf(type.capabilities);
      if (!node || !variant)
        return fail("Dieses Gerät hat keine Einstellungen.");
      const schema = configVariants[variant];
      const label = (field: string) =>
        c.configDefaults.find((d) => d.field === field)?.name ?? field;
      for (const field of Object.keys(patch))
        if (!Object.hasOwn(schema.shape, field))
          return fail(`${label(field)} gibt es bei diesem Gerät nicht.`);
      // `undefined` leert das Feld
      const config: Record<string, unknown> = Object.fromEntries(
        Object.entries({ ...node.config, ...patch }).filter(
          ([, v]) => v !== undefined,
        ),
      );
      const parsed = schema.strict().safeParse(config);
      if (!parsed.success) {
        const field = String(parsed.error.issues[0]?.path[0] ?? "");
        return fail(`${label(field)}: ungültiger Wert.`);
      }
      const partner = config["pairedWith"];
      if (typeof partner === "string" && !t.nodes.some((n) => n.id === partner))
        return fail(`${label("pairedWith")}: Das Gerät gibt es nicht.`);
      commit({
        ...t,
        nodes: t.nodes.map((n) =>
          n.id === nodeId ? { ...n, config: parsed.data } : n,
        ),
      });
      return { ok: true };
    },

    setMeta: (meta) => {
      if ((meta.name?.length ?? 0) > LIMITS.name)
        return fail(
          `Der Name darf höchstens ${String(LIMITS.name)} Zeichen haben.`,
        );
      if ((meta.description?.length ?? 0) > LIMITS.description)
        return fail(
          `Die Beschreibung darf höchstens ${String(LIMITS.description)} Zeichen haben.`,
        );
      commit({ ...get().topology, ...meta });
      return { ok: true };
    },

    undo: () => {
      set((s) => {
        const previous = s.past.at(-1);
        return previous
          ? {
              topology: previous,
              past: s.past.slice(0, -1),
              future: [s.topology, ...s.future],
            }
          : s;
      });
    },

    redo: () => {
      set((s) => {
        const [next, ...rest] = s.future;
        return next
          ? { topology: next, past: [...s.past, s.topology], future: rest }
          : s;
      });
    },
  };
});
