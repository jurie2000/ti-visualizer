import { beforeEach, describe, expect, it } from "vitest";
import { LIMITS } from "../schema";
import { emptyTopology, useTopology } from "./topologyStore";

const s = () => useTopology.getState();
const zones = () => s().topology.zones;
const area = { x: 0, y: 0, w: 400, h: 300 };
const zone = () => {
  const r = s().addZone(area);
  if (!r.ok || !r.id) throw new Error("addZone");
  return r.id;
};
const device = (x: number, y: number) => {
  const r = s().addNode("pc", { x, y });
  if (!r.ok || !r.id) throw new Error("addNode");
  return r.id;
};
const pos = (id: string) =>
  s().topology.nodes.find((n) => n.id === id)?.position;

beforeEach(() => {
  s().reset(emptyTopology());
});

describe("FR-15 Zonen im Store", () => {
  it("legt eine benannte Zone in einem Rückgängig-Schritt an", () => {
    s().addZone(area, "Apotheke am Markt");
    expect(zones()[0]?.label).toBe("Apotheke am Markt");
    s().undo();
    expect(zones()).toHaveLength(0);
  });

  it("legt Zonen mit eindeutiger ID an und macht es rückgängig", () => {
    expect(zone()).toBe("zone-1");
    expect(zone()).toBe("zone-2");
    s().undo();
    expect(zones().map((z) => z.id)).toEqual(["zone-1"]);
  });

  it("lehnt die 51. Zone ab", () => {
    for (let i = 0; i < LIMITS.zones; i++) zone();
    expect(s().addZone(area).ok).toBe(false);
    expect(zones()).toHaveLength(LIMITS.zones);
  });

  it("benennt: entfernt Steuer- und Formatzeichen, leerer Name löscht ihn", () => {
    const id = zone();
    expect(s().setZone(id, { label: "  Pra\u202eis\u0000  " }).ok).toBe(true);
    expect(zones()[0]?.label).toBe("Prais");
    s().setZone(id, { label: " " });
    expect(zones()[0]).not.toHaveProperty("label");
  });

  it("lehnt zu lange Namen und ungültige Größen ab", () => {
    const id = zone();
    expect(s().setZone(id, { label: "x".repeat(LIMITS.name + 1) }).ok).toBe(
      false,
    );
    expect(s().setZone(id, { w: 0 }).ok).toBe(false);
    expect(s().setZone(id, { h: Number.NaN }).ok).toBe(false);
    expect(s().setZone("nix", { label: "a" }).ok).toBe(false);
    expect(zones()[0]?.area).toEqual(area);
  });

  it("färbt nur mit festen Tönen und macht es rückgängig", () => {
    const id = zone();
    s().setZone(id, { tone: "accent" });
    expect(zones()[0]?.tone).toBe("accent");
    s().undo();
    expect(zones()[0]?.tone).toBe("sage");
  });

  it("verschiebt die Zone samt Geräten darin als ein Schritt, Geräte außerhalb bleiben", () => {
    const id = zone();
    const inside = device(50, 50);
    const outside = device(900, 50);
    const before = s().past.length;
    s().moveZone(id, { x: 100, y: 20 });
    expect(zones()[0]?.area).toMatchObject({ x: 100, y: 20 });
    expect(pos(inside)).toEqual({ x: 150, y: 70 });
    expect(pos(outside)).toEqual({ x: 900, y: 50 });
    expect(s().past.length).toBe(before + 1);
    s().undo();
    expect(pos(inside)).toEqual({ x: 50, y: 50 });
    expect(zones()[0]?.area.x).toBe(0);
  });

  it("entfernt nur die Zone, Geräte bleiben, rückgängig bringt sie zurück", () => {
    const id = zone();
    device(50, 50);
    s().removeZone(id);
    expect(zones()).toEqual([]);
    expect(s().topology.nodes).toHaveLength(1);
    s().undo();
    expect(zones()).toHaveLength(1);
  });

  it("T-715: Form bei Anlegen und Ändern, ohne Angabe bleibt sie leer (= Rechteck)", () => {
    const plain = zone();
    expect(zones().find((z) => z.id === plain)).not.toHaveProperty("shape");
    s().addZone(area, undefined, "ellipse");
    expect(zones().at(-1)?.shape).toBe("ellipse");
    s().setZone(plain, { shape: "ellipse" });
    expect(zones().find((z) => z.id === plain)?.shape).toBe("ellipse");
    s().undo();
    expect(zones().find((z) => z.id === plain)).not.toHaveProperty("shape");
  });
});
