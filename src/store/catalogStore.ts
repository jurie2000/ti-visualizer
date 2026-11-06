import { create } from "zustand";
import { loadCatalog, type Catalog } from "../schema";

/** Der aktive Katalog, beim Start einmal geladen und geprüft. Zur Laufzeit unveränderlich (D1). */
export const useCatalog = create<{ catalog: Catalog }>(() => ({
  catalog: loadCatalog(),
}));
