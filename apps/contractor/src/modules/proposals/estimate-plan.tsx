import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Field, Panel, copy } from "@/components/ecosystem/primitives";
import type { WorkItem } from "@/domain/contractor-estimates";
import type { Language } from "@/domain/types";
import { openPlan, type PlanFormat, type Point } from "./plan-drawing";

const distance = ([a, b]: Point[]) =>
  a && b ? Math.hypot(b.x - a.x, b.y - a.y) : 0;
const area = (points: Point[]) =>
  points.length < 3
    ? 0
    : Math.abs(
        points.reduce((sum, p, i) => {
          const next = points[(i + 1) % points.length];
          return sum + p.x * next.y - p.y * next.x;
        }, 0),
      ) / 2;

export function EstimatePlan({
  language,
  items,
  save,
}: {
  language: Language;
  items: WorkItem[];
  save: (input: {
    itemId: string;
    location: string;
    factors: number[];
    source: { format: PlanFormat; label: string };
  }) => Promise<unknown>;
}) {
  const t = copy(language);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [file, setFile] = useState<File>();
  const [format, setFormat] = useState<PlanFormat>("pdf");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const [referenceUnit, setReferenceUnit] = useState("ft");
  const [anchor, setAnchor] = useState<Point[]>([]);
  const [points, setPoints] = useState<Point[]>([]);
  const [mode, setMode] = useState<"reference" | "length" | "area">(
    "reference",
  );
  const [itemId, setItemId] = useState("");
  const [location, setLocation] = useState("");
  const ratio = distance(anchor)
    ? (Number(reference) * (referenceUnit === "ft" ? 0.3048 : 1)) /
      distance(anchor)
    : 0;
  const quantityM =
    mode === "length"
      ? distance(points) * ratio
      : mode === "area"
        ? area(points) * ratio ** 2
        : 0;
  const candidates = items.filter(({ unit }) =>
    mode === "length"
      ? unit === "m" || unit === "lf"
      : mode === "area" && (unit === "m²" || unit === "ft²"),
  );
  const item = candidates.find(({ id }) => id === itemId) ?? candidates[0];
  const conversion =
    item?.unit === "lf"
      ? 1 / 0.3048
      : item?.unit === "ft²"
        ? 1 / 0.3048 ** 2
        : 1;
  const quantity = Math.round(quantityM * conversion * 1000) / 1000;
  const surface = canvas.current;

  async function draw(
    nextFile: File,
    nextFormat: PlanFormat,
    nextPage: number,
  ) {
    if (!canvas.current) return;
    setBusy(true);
    setError("");
    setPages(0);
    setAnchor([]);
    setPoints([]);
    setMode("reference");
    try {
      if (nextFile.size > 20_000_000)
        throw Error(t("El archivo supera 20 MB.", "The file exceeds 20 MB."));
      const result = await openPlan(
        nextFile,
        nextFormat,
        nextPage,
        canvas.current,
      );
      setPages(result.pages);
      setSkipped(result.skipped);
      setPage(nextPage);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title={t("Medir sobre un plano", "Measure on a drawing")}>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t(
            "Abre un PDF, DXF 2D o IFC en vista superior. Marca dos puntos de distancia conocida para calibrar, luego traza una longitud o un área. El archivo se procesa en tu navegador.",
            "Open a PDF, 2D DXF, or top-view IFC. Mark two points of a known distance to calibrate, then trace a length or area. The file is processed in your browser.",
          )}
        </p>
        <Field label={t("Plano PDF, DXF o IFC", "PDF, DXF or IFC drawing")}>
          <Input
            type="file"
            accept=".pdf,.dxf,.ifc"
            disabled={busy}
            onChange={(event) => {
              const selected = event.currentTarget.files?.[0];
              const extension = selected?.name.split(".").at(-1)?.toLowerCase();
              if (
                !selected ||
                !extension ||
                !["pdf", "dxf", "ifc"].includes(extension)
              ) {
                setPages(0);
                setFile(undefined);
                setError(
                  t(
                    "Selecciona un archivo PDF, DXF o IFC.",
                    "Choose a PDF, DXF or IFC file.",
                  ),
                );
                return;
              }
              setFile(selected);
              setFormat(extension as PlanFormat);
              void draw(selected, extension as PlanFormat, 1);
            }}
          />
        </Field>
        {pages > 1 && file && (
          <Field label={t("Página del PDF", "PDF page")}>
            <NativeSelect
              value={page}
              disabled={busy}
              onChange={(event) =>
                void draw(file, format, Number(event.target.value))
              }
            >
              {Array.from({ length: pages }, (_, index) => (
                <option value={index + 1} key={index}>
                  {index + 1}
                </option>
              ))}
            </NativeSelect>
          </Field>
        )}
        {skipped > 0 && pages > 0 && (
          <p className="text-sm text-amber-800">
            {t(
              "Elementos DXF omitidos por formato no compatible",
              "DXF elements skipped due to unsupported format",
            )}{" "}
            · {skipped}
          </p>
        )}
        {pages > 0 && (
          <div className="flex flex-wrap items-end gap-3">
            <Field label={t("Distancia de referencia", "Reference distance")}>
              <Input
                type="number"
                min="0.001"
                step="any"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
              />
            </Field>
            <Field label={t("Unidad de referencia", "Reference unit")}>
              <NativeSelect
                value={referenceUnit}
                onChange={(event) => setReferenceUnit(event.target.value)}
              >
                <option value="ft">ft</option>
                <option value="m">m</option>
              </NativeSelect>
            </Field>
            <Button
              type="button"
              variant={mode === "reference" ? "default" : "outline"}
              aria-pressed={mode === "reference"}
              onClick={() => {
                setMode("reference");
                setAnchor([]);
                setPoints([]);
              }}
            >
              {t("Calibrar", "Calibrate")} · {anchor.length}/2
            </Button>
            <Button
              type="button"
              disabled={!(ratio > 0)}
              variant={mode === "length" ? "default" : "outline"}
              aria-pressed={mode === "length"}
              onClick={() => {
                setMode("length");
                setPoints([]);
              }}
            >
              {t("Trazar longitud", "Trace length")}
            </Button>
            <Button
              type="button"
              disabled={!(ratio > 0)}
              variant={mode === "area" ? "default" : "outline"}
              aria-pressed={mode === "area"}
              onClick={() => {
                setMode("area");
                setPoints([]);
              }}
            >
              {t("Trazar área", "Trace area")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={mode === "reference" ? !anchor.length : !points.length}
              onClick={() =>
                mode === "reference"
                  ? setAnchor(anchor.slice(0, -1))
                  : setPoints(points.slice(0, -1))
              }
            >
              {t("Deshacer punto", "Undo point")}
            </Button>
            <Field label={t("Zoom del plano", "Drawing zoom")}>
              <NativeSelect
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
              >
                <option value={1}>{t("Ajustar", "Fit")}</option>
                <option value={2}>2×</option>
                <option value={3}>3×</option>
              </NativeSelect>
            </Field>
          </div>
        )}
        <div
          hidden={!pages}
          className="max-h-[70vh] overflow-auto rounded-md border bg-muted"
        >
          <div className="relative" style={{ width: `${zoom * 100}%` }}>
            <canvas
              ref={canvas}
              aria-label={t(
                "Plano para marcar puntos. El formulario manual está disponible encima de esta sección.",
                "Drawing for marking points. The manual form is available above this section.",
              )}
              className="block h-auto w-full cursor-crosshair"
              onClick={(event) => {
                if (busy) return;
                const frame = event.currentTarget.getBoundingClientRect();
                const point = {
                  x:
                    ((event.clientX - frame.x) * event.currentTarget.width) /
                    frame.width,
                  y:
                    ((event.clientY - frame.y) * event.currentTarget.height) /
                    frame.height,
                };
                if (mode === "reference")
                  setAnchor(anchor.length === 2 ? [point] : [...anchor, point]);
                else if (mode === "length")
                  setPoints(points.length === 2 ? [point] : [...points, point]);
                else if (points.length < 100) setPoints([...points, point]);
              }}
            />
            {surface && pages > 0 && (
              <svg
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full"
                viewBox={`0 0 ${surface.width} ${surface.height}`}
              >
                <polyline
                  points={anchor.map(({ x, y }) => `${x},${y}`).join(" ")}
                  fill="none"
                  stroke="#225ac2"
                  strokeWidth="3"
                />
                {mode === "area" && points.length >= 3 ? (
                  <polygon
                    points={points.map(({ x, y }) => `${x},${y}`).join(" ")}
                    fill="#ec001c33"
                    stroke="#e00019"
                    strokeWidth="3"
                  />
                ) : (
                  <polyline
                    points={points.map(({ x, y }) => `${x},${y}`).join(" ")}
                    fill="none"
                    stroke="#e00019"
                    strokeWidth="3"
                  />
                )}
                {anchor.map(({ x, y }, index) => (
                  <circle
                    key={`ref-${index}`}
                    cx={x}
                    cy={y}
                    r="5"
                    fill="#225ac2"
                  />
                ))}
                {points.map(({ x, y }, index) => (
                  <circle key={index} cx={x} cy={y} r="5" fill="#e00019" />
                ))}
              </svg>
            )}
          </div>
        </div>
        {pages > 0 && mode !== "reference" && (
          <form
            className="space-y-3"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!file || !item || !(quantity > 0)) return;
              setBusy(true);
              setError("");
              try {
                const suffix =
                  format === "pdf" ? ` · ${t("página", "page")} ${page}` : "";
                await save({
                  itemId: item.id,
                  factors: [quantity],
                  location: location.trim(),
                  source: {
                    format,
                    label: file.name.slice(0, 160 - suffix.length) + suffix,
                  },
                });
                setPoints([]);
                setLocation("");
              } catch (cause) {
                setError((cause as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {item ? (
              <>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field
                    label={t(
                      "Partida para la medición",
                      "Work item for takeoff",
                    )}
                  >
                    <NativeSelect
                      value={item.id}
                      onChange={(event) => setItemId(event.target.value)}
                    >
                      {candidates.map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {candidate.code} · {candidate.description} (
                          {candidate.unit})
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                  <Field label={t("Ubicación del trazo", "Trace location")}>
                    <Input
                      required
                      maxLength={160}
                      value={location}
                      onChange={(event) => setLocation(event.target.value)}
                    />
                  </Field>
                </div>
                <output className="block text-sm font-medium">
                  {t("Cantidad medida", "Measured quantity")} ·{" "}
                  {Number.isFinite(quantity) ? quantity : 0} {item.unit}
                </output>
                <Button
                  type="submit"
                  disabled={busy || !(quantity > 0 && quantity <= 1_000_000)}
                >
                  {t("Guardar medición del plano", "Save drawing takeoff")}
                </Button>
              </>
            ) : (
              <p className="text-sm">
                {mode === "length"
                  ? t(
                      "Activa una partida en lf o m.",
                      "Enable an item in lf or m.",
                    )
                  : t(
                      "Activa una partida en ft² o m².",
                      "Enable an item in ft² or m².",
                    )}
              </p>
            )}
          </form>
        )}
        {busy && (
          <p role="status" className="text-sm">
            {t("Procesando plano…", "Processing drawing…")}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    </Panel>
  );
}
