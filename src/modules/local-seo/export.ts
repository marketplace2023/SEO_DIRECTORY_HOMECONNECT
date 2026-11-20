import { gridPoints, type SeoWorkspace } from "@/domain/local-seo";
export function download(
  name: string,
  content: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function csvCell(value: string | number | null) {
  if (value === null) return "";
  let text = String(value);
  if (typeof value === "string" && /^[\s]*[=+\-@]/.test(text))
    text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export function exportSeoJson(workspace: SeoWorkspace) {
  download(
    "homeconnect-seo-report.json",
    JSON.stringify(
      {
        schema: "homeconnect-local-seo/v1",
        generatedAt: new Date().toISOString(),
        scope:
          "Información propia, observaciones documentadas y mediciones importadas. No es un informe emitido por Google, Localo o BrightLocal.",
        ...workspace,
      },
      null,
      2,
    ),
  );
}
export function exportSeoCsv(workspace: SeoWorkspace) {
  const rows: (string | number | null)[][] = [
    [
      "keyword",
      "campaignId",
      "target",
      "targetId",
      "engine",
      "language",
      "observedAt",
      "sourceKind",
      "source",
      "evidenceUrl",
      "row",
      "column",
      "latitude",
      "longitude",
      "depth",
      "spacingKm",
      "rank",
    ],
  ];
  for (const run of workspace.runs) {
    const campaign = workspace.project.campaigns.find(
      (campaign) => campaign.id === run.campaignId,
    );
    const grid = campaign ? gridPoints(campaign) : [];
    for (const point of run.points) {
      const location = grid.find(
        (cell) => cell.row === point.row && cell.column === point.column,
      );
      rows.push([
        campaign?.keyword || "",
        run.campaignId,
        run.targetId === "business"
          ? workspace.project.nap.name
          : workspace.project.competitors.find(
              (competitor) => competitor.id === run.targetId,
            )?.name || run.targetId,
        run.targetId,
        campaign?.engine || "",
        campaign?.language || "",
        run.observedAt,
        run.source.kind,
        run.source.label,
        run.source.evidenceUrl,
        point.row,
        point.column,
        location?.latitude ?? null,
        location?.longitude ?? null,
        campaign?.depth ?? null,
        campaign?.spacingKm ?? null,
        point.rank,
      ]);
    }
  }
  download(
    "homeconnect-rankings.csv",
    rows.map((row) => row.map(csvCell).join(",")).join("\r\n"),
    "text/csv;charset=utf-8",
  );
}
