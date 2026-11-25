import { installCatalog, type Catalog } from "@/data/catalog";
import { apiEndpoint } from "./api";

export function startCatalogSync(render: () => void) {
  async function refresh(initial = false) {
    try {
      const response = await fetch(apiEndpoint("/api/catalog"), {
        signal: AbortSignal.timeout(3500),
      });
      if (!response.ok) throw Error("Catalog unavailable");
      const catalog: Catalog = await response.json();
      if (
        !Array.isArray(catalog.categories) ||
        !Array.isArray(catalog.subcategories) ||
        !Array.isArray(catalog.services)
      )
        return;
      installCatalog(catalog);
      if (!initial) render();
    } catch {
      // The bundled catalog remains available when the API is offline.
    } finally {
      if (initial) render();
    }
  }
  void refresh(true);
  window.addEventListener("focus", () => void refresh());
}
