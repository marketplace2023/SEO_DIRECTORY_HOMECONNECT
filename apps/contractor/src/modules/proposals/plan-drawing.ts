import type {
  IArcEntity,
  ICircleEntity,
  ILineEntity,
  ILwpolylineEntity,
  IPolylineEntity,
} from "dxf-parser";

export type Point = { x: number; y: number };
export type PlanFormat = "pdf" | "dxf" | "ifc";
type Path = Point[];
const maxSegments = 150_000;

async function dxf(file: File) {
  const { DxfParser } = await import("dxf-parser");
  const model = new DxfParser().parseSync(await file.text());
  const paths: Path[] = [];
  let skipped = 0;
  let count = 0;
  for (const entity of model?.entities ?? []) {
    if (
      entity.type === "LINE" ||
      entity.type === "LWPOLYLINE" ||
      entity.type === "POLYLINE"
    ) {
      const line = entity as ILineEntity | ILwpolylineEntity | IPolylineEntity;
      const vertices = line.vertices.filter(
        ({ x, y }) => Number.isFinite(x) && Number.isFinite(y),
      );
      if (
        vertices.length < 2 ||
        vertices.some((vertex) => "bulge" in vertex && vertex.bulge)
      ) {
        skipped++;
        continue;
      }
      paths.push(
        "shape" in line && line.shape ? [...vertices, vertices[0]] : vertices,
      );
      count += vertices.length;
    } else if (entity.type === "CIRCLE" || entity.type === "ARC") {
      const circle = entity as ICircleEntity | IArcEntity;
      const start = "startAngle" in circle ? circle.startAngle : 0;
      const end =
        entity.type === "CIRCLE"
          ? start + Math.PI * 2
          : (circle as IArcEntity).endAngle;
      const sweep = end >= start ? end - start : end - start + Math.PI * 2;
      paths.push(
        Array.from({ length: 65 }, (_, index) => {
          const angle = start + (sweep * index) / 64;
          return {
            x: circle.center.x + circle.radius * Math.cos(angle),
            y: circle.center.y + circle.radius * Math.sin(angle),
          };
        }),
      );
      count += 64;
    } else skipped++;
    if (count > maxSegments)
      throw Error(
        "El plano supera el límite de geometría. Exporta solo el área de trabajo.",
      );
  }
  return { paths, skipped };
}

async function ifc(file: File) {
  const [{ IfcAPI }, { default: wasmUrl }] = await Promise.all([
    import("web-ifc"),
    import("web-ifc/web-ifc.wasm?url"),
  ]);
  const api = new IfcAPI();
  await api.Init(() => wasmUrl, true);
  try {
    const id = api.OpenModel(new Uint8Array(await file.arrayBuffer()), {
      COORDINATE_TO_ORIGIN: true,
    });
    if (id < 0) throw Error("No se pudo abrir el modelo IFC.");
    const paths: Path[] = [];
    let tooLarge = false;
    api.StreamAllMeshes(id, (mesh) => {
      if (tooLarge) return;
      for (let index = 0; index < mesh.geometries.size(); index++) {
        const placed = mesh.geometries.get(index);
        if (placed.geomType !== 0) continue;
        const geometry = api.GetGeometry(id, placed.geometryExpressID);
        try {
          const indices = api.GetIndexArray(
            geometry.GetIndexData(),
            geometry.GetIndexDataSize(),
          );
          if (indices.length + paths.length * 3 > maxSegments) {
            tooLarge = true;
            break;
          }
          const vertices = api.GetVertexArray(
            geometry.GetVertexData(),
            geometry.GetVertexDataSize(),
          );
          const m = placed.flatTransformation;
          function project(vertex: number) {
            const [x, y, z] = vertices.subarray(vertex * 6, vertex * 6 + 3);
            return {
              x: m[0] * x + m[4] * y + m[8] * z + m[12],
              y: m[2] * x + m[6] * y + m[10] * z + m[14],
            };
          }
          for (let offset = 0; offset + 2 < indices.length; offset += 3) {
            const a = project(indices[offset]);
            const b = project(indices[offset + 1]);
            const c = project(indices[offset + 2]);
            if (
              [a, b, c].every(
                ({ x, y }) => Number.isFinite(x) && Number.isFinite(y),
              )
            )
              paths.push([a, b, c, a]);
          }
        } finally {
          geometry.delete();
        }
      }
    });
    if (tooLarge)
      throw Error(
        "El modelo supera el límite de geometría. Exporta un IFC del área de trabajo.",
      );
    return { paths, skipped: 0 };
  } finally {
    api.Dispose();
  }
}

export async function openPlan(
  file: File,
  format: PlanFormat,
  pageNumber: number,
  canvas: HTMLCanvasElement,
) {
  const context = canvas.getContext("2d");
  if (!context) throw Error("El navegador no puede dibujar el plano.");
  if (format === "pdf") {
    const [pdfjs, { default: worker }] = await Promise.all([
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
    ]);
    pdfjs.GlobalWorkerOptions.workerSrc = worker;
    const task = pdfjs.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
      isEvalSupported: false,
    });
    try {
      const pdf = await task.promise;
      const page = await pdf.getPage(pageNumber);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({
        scale: Math.min(1450 / base.width, 1450 / base.height),
      });
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvas, canvasContext: context, viewport }).promise;
      return { pages: pdf.numPages, skipped: 0 };
    } finally {
      await task.destroy();
    }
  }
  const { paths, skipped } = await (format === "dxf" ? dxf(file) : ifc(file));
  if (!paths.length)
    throw Error("El archivo no contiene geometría compatible para dibujar.");
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const path of paths)
    for (const { x, y } of path) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  canvas.width = 1200;
  canvas.height = 800;
  const scale = Math.min(1140 / (maxX - minX), 740 / (maxY - minY));
  if (!Number.isFinite(scale))
    throw Error("La geometría no cubre un área visible.");
  context.fillStyle = "white";
  context.fillRect(0, 0, 1200, 800);
  context.strokeStyle = "#30343b";
  context.lineWidth = 1;
  context.beginPath();
  for (const path of paths)
    path.forEach(({ x, y }, index) => {
      const a = 30 + (x - minX) * scale;
      const b = 770 - (y - minY) * scale;
      if (index) context.lineTo(a, b);
      else context.moveTo(a, b);
    });
  context.stroke();
  return { pages: 1, skipped };
}
