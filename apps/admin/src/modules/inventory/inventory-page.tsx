import { useStore } from "@/domain/store";
import type { Language } from "@/domain/types";
import { useState } from "react";
import { PiPlus } from "react-icons/pi";
import { money } from "@/domain/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, Panel, copy } from "@/components/ecosystem/primitives";

export function SupplierPanel({ language }: { language: Language }) {
  const { state, send } = useStore();
  const t = copy(language);
  const [editing, setEditing] = useState<string | null>(null);
  const material = state.materials.find((m) => m.id === editing);
  return (
    <Panel title={t("Materiales e inventario", "Materials and inventory")}>
      <p className="eco-note">
        {t(
          "Inventario de demostración independiente de Odoo. Precios de muestra en USD.",
          "Demo inventory independent of Odoo. Sample prices in USD.",
        )}
      </p>
      <div className="table-scroll">
        <table className="eco-table">
          <thead>
            <tr>
              <th>{t("Material", "Material")}</th>
              <th>{t("Unidad", "Unit")}</th>
              <th>{t("Existencias", "Stock")}</th>
              <th>{t("Precio", "Price")}</th>
              <th>
                <span className="sr-only">{t("Acciones", "Actions")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {state.materials.map((m) => (
              <tr key={m.id}>
                <td>{m.name}</td>
                <td>{m.unit}</td>
                <td>{m.stock}</td>
                <td>{money(m.price, language)}</td>
                <td>
                  <Button variant="ghost" onClick={() => setEditing(m.id)}>
                    {t("Editar", "Edit")}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3 className="eco-subheading">
        {material
          ? t("Actualizar material", "Update material")
          : t("Añadir material", "Add material")}
      </h3>
      <form
        key={editing || "new"}
        className="eco-form"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const name = String(data.get("name")).trim();
          const unit = String(data.get("unit")).trim();
          const stock = Number(data.get("stock"));
          const price = Number(data.get("price"));
          if (
            !name ||
            !unit ||
            !Number.isInteger(stock) ||
            stock < 0 ||
            !Number.isFinite(price) ||
            price < 0
          )
            return;
          send({
            type: "material",
            materialId: editing || undefined,
            value: { name, unit, stock, price },
          });
          event.currentTarget.reset();
          setEditing(null);
        }}
      >
        <div className="eco-form-grid">
          <Field label={t("Nombre del material", "Material name")}>
            <Input
              name="name"
              defaultValue={material?.name}
              required
              maxLength={150}
            />
          </Field>
          <Field label={t("Unidad", "Unit")}>
            <Input
              name="unit"
              defaultValue={material?.unit}
              required
              maxLength={40}
            />
          </Field>
          <Field label={t("Existencias", "Stock")}>
            <Input
              type="number"
              min="0"
              step="1"
              name="stock"
              defaultValue={material?.stock || 0}
              required
            />
          </Field>
          <Field label={t("Precio · USD", "Price · USD")}>
            <Input
              type="number"
              min="0"
              step="0.01"
              name="price"
              defaultValue={material?.price || 0}
              required
            />
          </Field>
        </div>
        <div className="eco-actions">
          <Button type="submit">
            {material
              ? t("Guardar material", "Save material")
              : t("Añadir material", "Add material")}
            <PiPlus />
          </Button>
          {material && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditing(null)}
            >
              {t("Cancelar", "Cancel")}
            </Button>
          )}
        </div>
      </form>
    </Panel>
  );
}
