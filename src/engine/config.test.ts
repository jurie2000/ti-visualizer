import { describe, expect, it } from "vitest";
import regelwerk from "../../docu/001-ti-visualizer-baukasten/regelwerk.md?raw";
import {
  configVariants,
  loadCatalog,
  Topology,
  type Node,
  type Topology as T,
} from "../schema";
import { defaultConfig } from "./config";

const catalog = loadCatalog();
const empty: T = {
  name: "",
  description: "",
  simDate: "2026-11-01",
  nodes: [],
  edges: [],
  zones: [],
};
const node = (id: string, type: string, config?: Node["config"]): Node => ({
  id,
  type,
  position: { x: 0, y: 0 },
  fault: false,
  ...(config && { config }),
});
const withNodes = (...nodes: Node[]): T => ({ ...empty, nodes });

// Felder aus Regelwerk 8 (Spalte „Feld“, in Backticks)
const section = regelwerk.slice(
  regelwerk.indexOf("## 8. Konfiguration"),
  regelwerk.indexOf("## 9. "),
);
const regelwerkFields = section
  .split("\n")
  .filter(
    (l) =>
      l.startsWith("| ") &&
      !l.startsWith("| Einstellung") &&
      !l.startsWith("|---"),
  )
  .flatMap((l) =>
    [...(l.split("|")[2] ?? "").matchAll(/`(\w+)`/g)].map((m) => m[1]),
  );

describe("Geräteeinstellungen: Katalog und Standardwerte (T-502a, Regelwerk 8)", () => {
  it("[Regelwerk 8] jedes Feld steht im Katalog und in einer Variante des Schemas", () => {
    const inCatalog = catalog.configDefaults.map((d) => d.field);
    const inSchema = Object.values(configVariants).flatMap((v) =>
      Object.keys(v.shape),
    );
    expect(regelwerkFields.length).toBeGreaterThan(15);
    for (const f of regelwerkFields) {
      expect(inCatalog, f).toContain(f);
      expect(inSchema, f).toContain(f);
    }
  });

  it("[Regelwerk 8] Router .1, Konnektor .2, sonst ab .10 ohne Doppelvergabe", () => {
    const ip = (t: T, type: string) => defaultConfig(type, t, catalog)?.ip;
    expect(ip(empty, "router")).toBe("192.168.10.1");
    expect(ip(empty, "kon")).toBe("192.168.10.2");
    expect(ip(empty, "pc")).toBe("192.168.10.10");
    const t = withNodes(node("a", "pc", { ip: "192.168.10.10" }));
    expect(ip(t, "pc")).toBe("192.168.10.11");
    expect(ip(withNodes(node("k", "kon", { ip: "192.168.10.2" })), "kon")).toBe(
      "192.168.10.10",
    );
  });

  it("[Regelwerk 8] Standardwerte je Variante, SIS nur beim Konnektor", () => {
    const kon = defaultConfig("kon", empty, catalog);
    expect(kon).toMatchObject({
      mode: "reihe",
      sis: false,
      updateOk: true,
      certExpires: "2029-03-31",
      timeOffset: 0,
      lastTimeSync: "2026-11-01",
      vlan: "TI",
      mask: "255.255.255.0",
    });
    expect(defaultConfig("gateway", empty, catalog)).not.toHaveProperty("sis");
    expect(defaultConfig("switch", empty, catalog)).not.toHaveProperty("mode");
    expect(defaultConfig("erp", empty, catalog)).toBeUndefined();
  });

  it("[Regelwerk 8] Gateway Reihe: Zugang, Parallel: Router; DNS: Zugang; Pairing nur bei genau einem Zugang", () => {
    const reihe = withNodes(
      node("k", "kon", { ip: "192.168.10.2", mode: "reihe" }),
      node("r", "router", { ip: "192.168.10.1" }),
    );
    expect(defaultConfig("kt", reihe, catalog)).toMatchObject({
      gateway: "192.168.10.2",
      dns: "192.168.10.2",
      pairedWith: "k",
      paired: true,
    });
    const parallel = withNodes(
      node("k", "kon", { ip: "192.168.10.2", mode: "parallel" }),
      node("r", "router", { ip: "192.168.10.1" }),
    );
    expect(defaultConfig("pc", parallel, catalog)).toMatchObject({
      gateway: "192.168.10.1",
      dns: "192.168.10.2",
      routeTI: true,
    });
    const zwei = withNodes(
      node("k", "kon", { ip: "192.168.10.2" }),
      node("g", "gateway", { ip: "192.168.10.3" }),
    );
    expect(defaultConfig("kt", zwei, catalog)).not.toHaveProperty("pairedWith");
    expect(defaultConfig("kt", empty, catalog)).not.toHaveProperty("gateway");
  });

  it("[Regelwerk 8] Standardwerte erfüllen das Schema jeder Variante", () => {
    for (const d of catalog.deviceTypes.filter((x) => x.placeable)) {
      const config = defaultConfig(d.id, empty, catalog);
      if (!config) continue;
      const variant = d.capabilities
        .find((c) => c.startsWith("netConfig:"))
        ?.slice(10) as keyof typeof configVariants;
      expect(configVariants[variant].safeParse(config).success, d.id).toBe(
        true,
      );
      expect(
        Topology.safeParse(withNodes(node("x", d.id, config))).success,
        d.id,
      ).toBe(true);
    }
  });
});
