import { useStore } from "@/domain/store";
import type { Language } from "@/domain/types";
import { categoryName } from "@/data/catalog";
import { Button } from "@/components/ui/button";
import { Panel, copy } from "@/components/ecosystem/primitives";

export function PublicationManager({ language }: { language: Language }) {
  const { state, send } = useStore();
  const t = copy(language);
  return (
    <Panel title={t("Perfiles y publicación", "Profiles and publication")}>
      <p className="eco-note">
        {t(
          "Los borradores se ocultan del catálogo público. Su historial y proyectos permanecen en las áreas de trabajo.",
          "Drafts are hidden from public listings. Their history and projects remain in workspaces.",
        )}
      </p>
      <div className="eco-records">
        {state.professionals.map((p) => (
          <div key={p.id} className="publication-row">
            <img src={p.img} alt="" />
            <div>
              <strong>{p.name}</strong>
              <p>
                {p.fur} · {categoryName(p.categoryId, language)}
              </p>
            </div>
            <span className={`eco-badge ${p.publication}`}>
              {p.publication === "published"
                ? t("Publicada", "Published")
                : t("Borrador", "Draft")}
            </span>
            <Button
              variant="outline"
              onClick={() =>
                send({ type: "publication", professionalId: p.id })
              }
            >
              {p.publication === "published"
                ? t("Retirar publicación", "Unpublish")
                : t("Publicar ficha", "Publish profile")}
            </Button>
          </div>
        ))}
      </div>
    </Panel>
  );
}
