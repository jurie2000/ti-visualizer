import {
  configVariantOf,
  configVariants,
  type Catalog,
  type Node,
  type Topology,
} from "../schema";

type Config = NonNullable<Node["config"]>;

const NET = "192.168.10.";
// Regelwerk 8: TI-Gateway und Highspeed-Konnektor haben kein SIS.
const WITHOUT_SIS = new Set(["gateway", "hskon"]);

const lastOctet = (ip: string | undefined) =>
  ip?.startsWith(NET) ? Number(ip.slice(NET.length)) : NaN;

/** Router .1, Konnektor .2, sonst das erste freie ab .10 (Regelwerk 8). */
function freeIp(variant: string, topology: Topology) {
  const used = new Set(topology.nodes.map((n) => lastOctet(n.config?.ip)));
  const wanted = variant === "router" ? 1 : variant === "konnektor" ? 2 : 10;
  if (!used.has(wanted)) return `${NET}${String(wanted)}`;
  for (let i = 10; i < 255; i++) if (!used.has(i)) return `${NET}${String(i)}`;
  return undefined;
}

/** Standardwerte für ein neues Gerät (FR-17). Ohne `netConfig:`-Fähigkeit: `undefined`. */
export function defaultConfig(
  type: string,
  topology: Topology,
  catalog: Catalog,
): Config | undefined {
  const device = catalog.deviceTypes.find((d) => d.id === type);
  const variant = device && configVariantOf(device.capabilities);
  if (!variant) return undefined;

  const fields = Object.keys(configVariants[variant].shape);
  const config: Record<string, string | number | boolean> = {};
  for (const d of catalog.configDefaults)
    if (fields.includes(d.field) && d.default !== null)
      config[d.field] = d.default;
  if (WITHOUT_SIS.has(type)) delete config["sis"];

  const ip = freeIp(variant, topology);
  if (ip) config["ip"] = ip;
  if (fields.includes("lastTimeSync"))
    config["lastTimeSync"] = topology.simDate;

  // Gateway und DNS der Clients (nicht von Zugang und Router selbst): Reihe
  // der Zugang, Parallel der Router; DNS immer der Zugang. Mehrere Zugänge:
  // der erste, der Nutzer ändert es im Formular.
  const zugaenge = topology.nodes.filter((n) =>
    catalog.deviceTypes
      .find((d) => d.id === n.type)
      ?.capabilities.includes("zugang"),
  );
  const zugang = zugaenge[0];
  if (variant !== "konnektor" && variant !== "router") {
    const router = topology.nodes.find((n) => n.type === "router");
    const gateway = zugang?.config?.mode === "parallel" ? router : zugang;
    if (gateway?.config?.ip) config["gateway"] = gateway.config.ip;
    if (zugang?.config?.ip) config["dns"] = zugang.config.ip;
  }
  if (variant === "terminal" && zugaenge.length === 1 && zugang)
    config["pairedWith"] = zugang.id;

  return config;
}
