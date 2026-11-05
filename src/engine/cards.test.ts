import { describe, expect, it } from "vitest";
import { Topology, loadCatalog, type AnyCard } from "../schema";
import { MESSAGES, cardState, plugCard, unplugCard } from "./cards";

const catalog = loadCatalog();

const node = (id: string, type: string, cards?: AnyCard[]) => ({
  id,
  type,
  fault: false,
  position: { x: 0, y: 0 },
  ...(cards && { cards }),
});
const topo = (...nodes: ReturnType<typeof node>[]): Topology => ({
  name: "t",
  description: "",
  simDate: "2026-11-01",
  nodes,
  edges: [],
  zones: [],
});

const egk: AnyCard = { kind: "egk", expires: "2029-12-31", pinActive: true };
const hba: AnyCard = { kind: "hba", expires: "2029-12-31", unlocked: true };
const smcb: AnyCard = { kind: "smcb", expires: "2029-12-31", unlocked: true };

function plugged(t: Topology, id: string, card: AnyCard) {
  const r = plugCard(t, id, card, catalog);
  if (!r.ok) throw new Error(r.message);
  return r.topology;
}
const fail = (t: Topology, id: string, card: AnyCard) => {
  const r = plugCard(t, id, card, catalog);
  return r.ok ? "ok" : r.message;
};

describe("Karten-Engine (T-106)", () => {
  it("[K-1] Karten stecken nur in Geräten mit cardSlots, je Art eine", () => {
    const t = topo(
      node("kt1", "kt"),
      node("mkt1", "mkt"),
      node("r1", "router"),
    );
    expect(plugged(t, "kt1", hba).nodes[0]?.cards).toEqual([hba]);
    expect(plugged(t, "mkt1", smcb).nodes[1]?.cards).toEqual([smcb]);
    expect(fail(t, "r1", egk)).toBe(MESSAGES.noSlot);
    expect(t.nodes[0]?.cards).toBeUndefined();
  });

  it("[K-2] Stecken legt nur eine fehlende Art an, Ziehen entfernt sie", () => {
    const t = plugged(topo(node("kt1", "kt")), "kt1", egk);
    expect(fail(t, "kt1", { ...egk, expires: "2030-01-01" })).toBe(
      "Alle Kartenarten stecken bereits in diesem Terminal.",
    );
    const both = plugged(t, "kt1", hba);
    expect(both.nodes[0]?.cards).toHaveLength(2);
    expect(unplugCard(both, "kt1", "egk").nodes[0]?.cards).toEqual([hba]);
    expect(
      cardState(unplugCard(both, "kt1", "egk"), "kt1", "egk").plugged,
    ).toBe(false);
  });

  it("[K-3] abgelaufene Karte: Meldung mit Datum, zählt als nicht gesteckt", () => {
    const old: AnyCard = { kind: "egk", expires: "2026-10-31" };
    const t = topo(node("kt1", "kt", [old]));
    const s = cardState(t, "kt1", "egk");
    expect(s.plugged).toBe(false);
    expect(s.state).toBe("expired");
    expect(s.message).toBe("eGK ist seit 31.10.2026 abgelaufen.");
    // am Ablauftag selbst noch gültig, verglichen wird mit simDate, nicht mit der Uhr
    expect(
      cardState(
        topo(node("kt1", "kt", [{ ...old, expires: "2026-11-01" }])),
        "kt1",
        "egk",
      ).plugged,
    ).toBe(true);
  });

  it("abgelaufene Karte zählt als nicht gesteckt", () => {
    const t = topo(
      node("kt1", "kt", [
        { kind: "hba", expires: "2020-01-01", unlocked: true },
      ]),
    );
    expect(cardState(t, "kt1", "hba")).toMatchObject({
      plugged: false,
      state: "expired",
    });
  });

  it("[K-4] HBA und SMC-B brauchen die PIN-Freischaltung", () => {
    const t = topo(
      node("kt1", "kt", [
        { kind: "hba", expires: "2029-12-31" },
        { kind: "smcb", expires: "2029-12-31", unlocked: false },
      ]),
    );
    expect(cardState(t, "kt1", "hba").message).toBe(
      "HBA ist nicht freigeschaltet.",
    );
    expect(cardState(t, "kt1", "smcb")).toMatchObject({
      state: "locked",
      message: "SMC-B ist nicht freigeschaltet.",
    });
    expect(
      cardState(plugged(topo(node("kt1", "kt")), "kt1", hba), "kt1", "hba")
        .state,
    ).toBe("ready");
  });

  it("[K-5] SMC-B steckt dauerhaft: bleibt gesteckt, ohne Meldung; Ziehen nur ausdrücklich", () => {
    const t = plugged(topo(node("kt1", "kt")), "kt1", smcb);
    expect(cardState(t, "kt1", "smcb")).toMatchObject({
      plugged: true,
      state: "ready",
    });
    expect(cardState(t, "kt1", "smcb").message).toBeUndefined();
    // Auslegung: unplugCard zieht die SMC-B auf ausdrücklichen Wunsch (Herausforderung „SMC-B fehlt“)
    expect(cardState(unplugCard(t, "kt1", "smcb"), "kt1", "smcb").plugged).toBe(
      false,
    );
  });

  it("[K-1] Datei mit zwei Karten einer Art oder doppelter Karten-id wird abgelehnt", () => {
    const twice = topo(
      node("kt1", "kt", [hba, { ...hba, expires: "2030-01-01" }]),
    );
    expect(Topology.safeParse(twice).success).toBe(false);
    const same: AnyCard = { ...egk, id: "c1" };
    const two = topo(node("kt1", "kt", [same]), node("kt2", "kt", [same]));
    expect(Topology.safeParse(two).success).toBe(false);
    expect(
      Topology.safeParse(topo(node("kt1", "kt", [hba, smcb]))).success,
    ).toBe(true);
  });

  it("[K-6] NFC-Geräte nehmen nur die eGK, ohne PIN", () => {
    const t = topo(node("cl", "cardlink"), node("app", "erpapp"));
    expect(plugged(t, "cl", egk).nodes[0]?.cards).toEqual([egk]);
    expect(plugged(t, "app", egk).nodes[1]?.cards).toEqual([egk]);
    expect(fail(t, "cl", hba)).toBe(
      "Über eHealth-CardLink wird nur die eGK gelesen, ohne PIN. HBA und SMC-B gehören in ein stationäres Kartenterminal.",
    );
    expect(fail(t, "app", smcb)).toBe(MESSAGES.nfcOnlyEgk);
  });

  it("[K-7] abgeschaltete eGK-PIN: Meldung für den Medikationsplan", () => {
    const off = topo(node("kt1", "kt", [{ ...egk, pinActive: false }]));
    expect(cardState(off, "kt1", "egk").empMessage).toBe(
      "Für den Medikationsplan ist die PIN der eGK nötig.",
    );
    expect(cardState(off, "kt1", "egk").plugged).toBe(true);
    const on = topo(node("kt1", "kt", [egk]));
    expect(cardState(on, "kt1", "egk").empMessage).toBeUndefined();
    const unset = topo(
      node("kt1", "kt", [{ kind: "egk", expires: "2029-12-31" }]),
    );
    expect(cardState(unset, "kt1", "egk").empMessage).toBeUndefined();
  });

  it("[K-8] Karten nie an Konnektor, Primärsystem oder Fachdienst", () => {
    const t = topo(node("k", "kon"), node("p", "pvs"));
    const msg =
      "Smartcards werden nur in ein Kartenterminal gesteckt, nie direkt an Konnektor, Primärsystem oder Fachdienst.";
    expect(fail(t, "k", smcb)).toBe(msg);
    expect(fail(t, "p", egk)).toBe(msg);
  });

  it("[K-9] eine Karte steckt in genau einem Gerät", () => {
    const card: AnyCard = { ...hba, id: "hba-1" };
    const t = plugged(topo(node("kt1", "kt"), node("kt2", "kt")), "kt1", card);
    expect(fail(t, "kt2", card)).toBe(
      "Diese Karte steckt bereits in einem anderen Terminal.",
    );
    const moved = plugged(unplugCard(t, "kt1", "hba"), "kt2", card);
    expect(moved.nodes[0]?.cards).toEqual([]);
    expect(moved.nodes[1]?.cards).toEqual([card]);
  });

  it("[K-9] dieselbe Karte erneut ins selbe Terminal: Meldung aus K-2", () => {
    const card: AnyCard = { ...hba, id: "hba-1" };
    const t = plugged(topo(node("kt1", "kt")), "kt1", card);
    expect(fail(t, "kt1", card)).toBe(MESSAGES.full);
  });

  it("Stecken in unbekanntes Gerät wird abgelehnt", () => {
    expect(fail(topo(), "x", egk)).toBe("Gerät nicht gefunden.");
  });
});
