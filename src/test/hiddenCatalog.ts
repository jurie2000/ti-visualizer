import type { Catalog } from "../schema";

/**
 * Typen, die der Modus Einfach bis T-725a ausblendete. Hält die Tests der
 * Ausblendefunktion (Sammelkanten) am Leben, bis T-725b sie samt Tests entfernt.
 */
const FORMERLY_HIDDEN = [
  "ris",
  "lis",
  "pc",
  "server",
  "tab",
  "kimcm",
  "switch",
  "router",
  "ap",
  "fw",
  "internet",
  "zentral",
  "dns",
  "ntp",
  "vzd",
  "tsl",
  "idpsek",
  "popp",
  "epaapp",
];

export const withHiddenTypes = (catalog: Catalog): Catalog => ({
  ...catalog,
  deviceTypes: catalog.deviceTypes.map((d) =>
    FORMERLY_HIDDEN.includes(d.id) ? { ...d, visibleSimple: false } : d,
  ),
});
