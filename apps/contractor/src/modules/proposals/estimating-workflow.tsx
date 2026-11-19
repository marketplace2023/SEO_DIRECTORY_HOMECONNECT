import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Field, Panel, copy } from "@/components/ecosystem/primitives";
import { budgetCents, budgetLines, lineCents } from "@/domain/estimating";
import { allowedRequests, useStore } from "@/domain/store";
import { money, type Language } from "@/domain/types";
import { navigate } from "@/lib/navigation";

const path = "/workspace/contractor/proposals";
const empty = { parts: [], measurements: [], valuations: [] };

export function EstimatingWorkflow({
  language,
  requestId,
}: {
  language: Language;
  requestId?: string;
}) {
  const { state, professionalId, send, syncError } = useStore();
  const t = copy(language);
  const [editing, setEditing] = useState("");
  const estimating = state.estimating ?? empty;
  const parts = estimating.parts.filter(
    (part) => part.professionalId === professionalId,
  );
  const editedPart = parts.find((part) => part.id === editing);
  const proposals = state.proposals.filter(
    (row) => row.professionalId === professionalId,
  );
  const eligible = allowedRequests(state, professionalId);
  const requests = state.requests.filter(
    (request) =>
      eligible.some((row) => row.id === request.id) ||
      proposals.some((row) => row.requestId === request.id),
  );
  const selected = requests.find((request) => request.id === requestId);
  const proposal = proposals.find((row) => row.requestId === selected?.id);
  const measurementRequest = proposal ? undefined : selected;
  const lines =
    proposal?.lines ??
    (measurementRequest
      ? budgetLines(estimating, professionalId, measurementRequest.id)
      : []);
  const cents = budgetCents(lines);
  const valuations = proposal
    ? estimating.valuations
        .filter((row) => row.proposalId === proposal.id)
        .sort((a, b) => a.progress - b.progress)
    : [];
  const progress = valuations.at(-1)?.progress ?? 0;
  const format = (cents: number) => money(cents / 100, language, 2);
  const savePart = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    send({
      type: "part",
      partId: editedPart?.id,
      value: {
        name: String(data.get("name")).trim(),
        unit: String(data.get("unit")).trim(),
        unitCents: Math.round(Number(data.get("price")) * 100),
      },
    });
    form.reset();
    setEditing("");
  };
  const saveMeasurement = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    send({
      type: "measurement",
      value: {
        requestId: selected.id,
        partId: String(data.get("part")),
        quantity: Number(data.get("quantity")),
      },
    });
    form.reset();
  };

  return (
    <div className="grid gap-5">
      {syncError && (
        <p role="alert" className="eco-error">
          {t(
            "Hay cambios pendientes de sincronizar con el servidor.",
            "Some changes have not synced with the server.",
          )}
        </p>
      )}
      <Panel title={t("1. Listado de partidas", "1. Price list")}>
        <p className="eco-note">
          {t(
            "Tu listado es privado y se reutiliza en tus presupuestos.",
            "Your list is private and can be reused in your estimates.",
          )}
        </p>
        <ul className="space-y-2">
          {parts.map((part) => (
            <li
              key={part.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b py-2"
            >
              <span>
                <strong>{part.name}</strong> · {format(part.unitCents)} /{" "}
                {part.unit}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(part.id)}
                aria-label={t(`Editar ${part.name}`, `Edit ${part.name}`)}
              >
                {t("Editar", "Edit")}
              </Button>
            </li>
          ))}
        </ul>
        <form
          key={editedPart?.id ?? "new"}
          className="eco-form"
          onSubmit={savePart}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={t("Nombre de la partida", "Line item name")}>
              <Input
                name="name"
                required
                pattern=".*\S.*"
                maxLength={150}
                defaultValue={editedPart?.name}
              />
            </Field>
            <Field label={t("Unidad", "Unit")}>
              <Input
                name="unit"
                required
                pattern=".*\S.*"
                maxLength={30}
                placeholder={t("Ej. m²", "E.g. sq ft")}
                defaultValue={editedPart?.unit}
              />
            </Field>
            <Field label={t("Precio unitario (USD)", "Unit price (USD)")}>
              <Input
                name="price"
                required
                type="number"
                min="0.01"
                max="1000000"
                step="0.01"
                defaultValue={
                  editedPart ? editedPart.unitCents / 100 : undefined
                }
              />
            </Field>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit">
              {editedPart
                ? t("Guardar partida", "Save line item")
                : t("Añadir partida", "Add line item")}
            </Button>
            {editedPart && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing("")}
              >
                {t("Cancelar edición", "Cancel editing")}
              </Button>
            )}
          </div>
        </form>
      </Panel>
      <Panel title={t("2. Mediciones", "2. Measurements")}>
        <Field
          label={t(
            "Solicitud para medir y presupuestar",
            "Request to measure and estimate",
          )}
        >
          <NativeSelect
            value={selected?.id ?? ""}
            onChange={(event) =>
              navigate(
                path,
                new URLSearchParams(
                  event.target.value ? { request: event.target.value } : {},
                ),
              )
            }
          >
            <option value="">
              {t("Selecciona una solicitud", "Select a request")}
            </option>
            {requests.map((request) => (
              <option key={request.id} value={request.id}>
                {request.title}
              </option>
            ))}
          </NativeSelect>
        </Field>
        {measurementRequest && parts.length > 0 ? (
          <form
            className="eco-form"
            key={selected?.id}
            onSubmit={saveMeasurement}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("Partida", "Line item")}>
                <NativeSelect name="part" required defaultValue="">
                  <option value="">
                    {t("Selecciona una partida", "Select a line item")}
                  </option>
                  {parts.map((part) => (
                    <option key={part.id} value={part.id}>
                      {part.name} ({part.unit})
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label={t("Cantidad medida", "Measured quantity")}>
                <Input
                  name="quantity"
                  type="number"
                  required
                  min="0"
                  max="1000000"
                  step="any"
                />
              </Field>
            </div>
            <div>
              <Button type="submit">
                {t("Guardar medición", "Save measurement")}
              </Button>
            </div>
            <p className="eco-note">
              {t(
                "Guarda otra cantidad para actualizar la medición. Usa 0 para retirarla.",
                "Save another quantity to update the measurement. Enter 0 to remove it.",
              )}
            </p>
          </form>
        ) : (
          !proposal && (
            <p className="eco-note">
              {t(
                "Añade partidas y elige la solicitud para registrar cantidades.",
                "Add line items and choose a request to record quantities.",
              )}
            </p>
          )
        )}
        {lines.length > 0 && (
          <ul className="space-y-2">
            {lines.map((line) => (
              <li key={line.partId}>
                {line.name} · {line.quantity} {line.unit}
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel title={t("3. Gestión de presupuesto", "3. Estimate management")}>
        {lines.length > 0 && (
          <ul className="space-y-2">
            {lines.map((line) => (
              <li key={line.partId}>
                {line.name} · {line.quantity} {line.unit} ×{" "}
                {format(line.unitCents)} ={" "}
                <strong>{format(lineCents(line))}</strong>
              </li>
            ))}
          </ul>
        )}
        {proposal ? (
          <>
            <p>
              <strong>
                {t("Total enviado", "Submitted total")}{" "}
                {money(proposal.amount, language, 2)}
              </strong>
            </p>
            <a
              className="text-link"
              href={`#/workspace/contractor/requests/${proposal.requestId}`}
            >
              {t("Ver propuesta y estado", "View proposal and status")}
            </a>
          </>
        ) : measurementRequest && Number.isSafeInteger(cents) && cents > 0 ? (
          <form
            className="eco-form"
            key={measurementRequest.id}
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              send({
                type: "budget",
                value: {
                  requestId: measurementRequest.id,
                  expectedCents: cents,
                  days: Number(data.get("days")),
                  description: String(data.get("description")).trim(),
                },
              });
            }}
          >
            <p>
              <strong>
                {t("Total del presupuesto", "Estimate total")} {format(cents)}
              </strong>
            </p>
            <Field
              label={t("Plazo estimado en días", "Estimated timeframe in days")}
            >
              <Input
                name="days"
                required
                type="number"
                min="1"
                max="3650"
                step="1"
              />
            </Field>
            <Field label={t("Alcance y condiciones", "Scope and terms")}>
              <Textarea name="description" required maxLength={3000} />
            </Field>
            <div>
              <Button type="submit">
                {t("Enviar presupuesto", "Submit estimate")}
              </Button>
            </div>
          </form>
        ) : (
          <p className="eco-note">
            {t(
              "Registra mediciones para calcular el presupuesto.",
              "Record measurements to calculate the estimate.",
            )}
          </p>
        )}
      </Panel>
      <Panel title={t("4. Valuaciones", "4. Progress valuations")}>
        {proposal?.status === "accepted" ? (
          <>
            <p className="eco-note">
              {t(
                "Registra el avance acumulado de obra. La diferencia frente a la valuación anterior es el importe del período.",
                "Record cumulative work progress. The difference from the previous valuation is the amount for this period.",
              )}
            </p>
            <ol className="space-y-2">
              {valuations.map((row, index) => {
                const total = Math.round(proposal.amount * row.progress);
                const previous = Math.round(
                  proposal.amount * (valuations[index - 1]?.progress ?? 0),
                );
                return (
                  <li key={row.id}>
                    <time dateTime={row.at}>
                      {new Date(row.at).toLocaleDateString(language)}
                    </time>{" "}
                    · {row.progress}% · {t("Período", "Period")}{" "}
                    {format(total - previous)} · {t("Acumulado", "Cumulative")}{" "}
                    {format(total)}
                  </li>
                );
              })}
            </ol>
            {progress < 100 && (
              <form
                className="eco-form"
                key={`${proposal.id}-${progress}`}
                onSubmit={(event) => {
                  event.preventDefault();
                  send({
                    type: "valuation",
                    value: {
                      proposalId: proposal.id,
                      progress: Number(
                        new FormData(event.currentTarget).get("progress"),
                      ),
                    },
                  });
                }}
              >
                <Field
                  label={t("Avance acumulado (%)", "Cumulative progress (%)")}
                >
                  <Input
                    name="progress"
                    required
                    type="number"
                    min={progress + 1}
                    max="100"
                    step="1"
                  />
                </Field>
                <div>
                  <Button type="submit">
                    {t("Registrar valuación", "Record valuation")}
                  </Button>
                </div>
              </form>
            )}
          </>
        ) : (
          <p className="eco-note">
            {t(
              "Las valuaciones se habilitan cuando el cliente acepta el presupuesto.",
              "Valuations become available after the customer accepts the estimate.",
            )}
          </p>
        )}
      </Panel>
    </div>
  );
}
