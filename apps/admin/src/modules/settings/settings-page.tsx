import { useStore } from "@/domain/store";
import type { Language } from "@/domain/types";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Panel, copy } from "@/components/ecosystem/primitives";

export function DemoSettings({ language }: { language: Language }) {
  const { send } = useStore();
  const t = copy(language);
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <Panel title={t("Datos de demostración", "Demo data")}>
      <p className="eco-body">
        {t(
          "Los datos se guardan en el servicio local compartido. Restablecer la muestra afecta a las tres aplicaciones; las cuentas registradas se conservan. Odoo y pagos siguen pendientes.",
          "Data is saved in the shared local service. Resetting sample data affects all three applications; registered accounts are preserved. Odoo and payments remain pending.",
        )}
      </p>
      {confirm ? (
        <div className="eco-reset-confirm">
          <p>
            {t(
              "Se eliminarán solicitudes, propuestas, mensajes y cambios locales. Se restaurará la muestra inicial.",
              "Requests, proposals, messages and local changes will be removed. The initial sample will be restored.",
            )}
          </p>
          <div className="eco-actions">
            <Button
              onClick={() => {
                send({ type: "reset" });
                setConfirm(false);
                setDone(true);
              }}
            >
              {t("Confirmar restablecimiento", "Confirm reset")}
            </Button>
            <Button variant="outline" onClick={() => setConfirm(false)}>
              {t("Cancelar", "Cancel")}
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" onClick={() => setConfirm(true)}>
          {t("Restablecer demostración", "Reset demo")}
        </Button>
      )}
      {done && (
        <p role="status" className="eco-success">
          {t("Demostración restablecida.", "Demo reset.")}
        </p>
      )}
    </Panel>
  );
}
