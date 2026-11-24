import { test, expect, origins } from "./fixtures";
import {
  comparableBaseline,
  gridPoints,
  napDifferences,
  parseRankCsv,
  rankMetrics,
  type SeoCampaign,
  type SeoRun,
} from "../src/domain/local-seo";
import { csvCell } from "../src/modules/local-seo/export";
import { Database } from "../server/database/database";
import { findSerpListings, scanSerpGrid } from "../server/local-seo/serpapi";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const campaign: SeoCampaign = {
  id: "a",
  keyword: "plumber",
  engine: "google_maps",
  language: "en",
  center: { latitude: 34, longitude: -84 },
  size: 3,
  spacingKm: 1,
  depth: 20,
  createdAt: "2026-11-01T00:00:00Z",
};
const run: SeoRun = {
  id: "new",
  campaignId: "a",
  targetId: "business",
  observedAt: "2026-11-18T00:00:00Z",
  createdAt: "2026-11-18T00:00:00Z",
  source: { kind: "manual", label: "Procedimiento A", evidenceUrl: "" },
  points: [
    { row: 0, column: 0, rank: 2 },
    { row: 0, column: 1, rank: null },
    { row: 0, column: 2, rank: 5 },
  ],
};
test("SEO: los puntos no medidos y los no encontrados no son posiciones inventadas", () => {
  expect(rankMetrics()).toEqual({
    measured: 0,
    found: 0,
    top3: null,
    averageFoundRank: null,
  });
  const metrics = rankMetrics(run);
  expect(metrics.measured).toBe(3);
  expect(metrics.found).toBe(2);
  expect(metrics.top3).toBeCloseTo(100 / 3);
  expect(metrics.averageFoundRank).toBe(3.5);
  expect(
    rankMetrics({ ...run, points: [{ row: 0, column: 0, rank: null }] }),
  ).toEqual({ measured: 1, found: 0, top3: 0, averageFoundRank: null });
  const points = gridPoints(campaign);
  expect(points).toHaveLength(9);
  expect(points[4].latitude).toBeCloseTo(34, 8);
  expect(points[4].longitude).toBeCloseTo(-84, 8);
  expect(points[1].latitude).toBeGreaterThan(points[7].latitude);
  expect(points[3].longitude).toBeLessThan(points[5].longitude);
});

test("SEO: comparación longitudinal exige misma fuente, objetivo, campaña y puntos", () => {
  const baseline = { ...run, id: "old", observedAt: "2026-11-01T00:00:00Z" };
  expect(comparableBaseline(run, [baseline])?.id).toBe("old");
  for (const incompatible of [
    { ...baseline, source: { ...baseline.source, label: "Otra fuente" } },
    { ...baseline, source: { ...baseline.source, listingId: "otra-ficha" } },
    { ...baseline, campaignId: "other" },
    { ...baseline, targetId: "competitor" },
    { ...baseline, points: baseline.points.slice(0, 1) },
  ])
    expect(comparableBaseline(run, [incompatible])).toBeUndefined();
});

test("SerpApi conserva posiciones, identificadores y puntos fallidos por separado", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.SERPAPI_API_KEY;
  const requests: URL[] = [];
  const listing = {
    title: "Example Plumbing",
    place_id: "ChIJfixture",
    data_cid: "17522713506209577164",
    position: 2,
  };
  process.env.SERPAPI_API_KEY = "serp-test-key";
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    requests.push(url);
    if (requests.length === 2) return new Response(null, { status: 500 });
    if (url.searchParams.get("engine") === "google") {
      return Response.json({
        search_metadata: { status: "Success" },
        local_results: { places: [{ ...listing, place_id: listing.data_cid }] },
      });
    }
    const local =
      requests.length === 3
        ? [{ ...listing, place_id: "ChIJdifferent", data_cid: "123" }]
        : [listing];
    return Response.json({
      search_metadata: { status: "Success" },
      local_results: local,
    });
  };
  try {
    const [target] = await findSerpListings(
      "Example Plumbing",
      campaign.center,
      "en",
    );
    expect(target).toMatchObject({
      placeId: listing.place_id,
      cid: listing.data_cid,
    });
    const maps = await scanSerpGrid(campaign, target);
    expect(maps.measured).toHaveLength(8);
    expect(maps.measured[0]).toEqual({ row: 0, column: 1, rank: null });
    expect(maps.measured.at(-1)?.rank).toBe(2);
    expect(
      new Set(requests.slice(1, 10).map((url) => url.searchParams.get("ll")))
        .size,
    ).toBe(9);
    const local = await scanSerpGrid(
      { ...campaign, engine: "google_local", depth: 3 },
      target,
    );
    expect(local.measured.every((point) => point.rank === 2)).toBe(true);
    expect(local.listingId).toBe(listing.data_cid);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.SERPAPI_API_KEY;
    else process.env.SERPAPI_API_KEY = originalKey;
  }
});

test("SEO: NAP desconocido no es coincidencia y el CSV evita fórmulas ejecutables", () => {
  const nap = {
    name: "Construcciones Ruiz",
    address: "",
    phone: "+1 (404) 555-1234",
    website: "",
  };
  expect(
    napDifferences(nap, { ...nap, phone: "4045551234" }).map(
      (field) => field.status,
    ),
  ).toEqual(["match", "unknown", "match"]);
  expect(napDifferences(nap, { ...nap, phone: "4045559999" })[2].status).toBe(
    "different",
  );
  expect(parseRankCsv("row,column,rank\n0,0,2\n0,1,\n")).toEqual(
    run.points.slice(0, 2),
  );
  expect(() => parseRankCsv("row,column,rank\n0,0,=bad")).toThrow();
  expect(csvCell('=HYPERLINK("x")')).toContain("'=HYPERLINK");
});

async function token(
  request: any,
  demoSession: string,
  role: "web" | "contractor" | "admin",
) {
  const email =
    role === "web"
      ? "carolina@example.test"
      : role === "admin"
        ? "admin@example.test"
        : "ruiz@example.test";
  const response = await request.post(
    `http://127.0.0.1:5197/api/auth/login?session=${demoSession}`,
    { data: { email, password: "Servinexo2026!", application: role } },
  );
  expect(response.status()).toBe(200);
  return (await response.json()).token as string;
}

test("SEO API: roles, aislamiento por negocio y namespace, auditoría persistente y tareas", async ({
  request,
  demoSession,
}) => {
  const endpoint = (path: string, business = "ruiz", namespace = demoSession) =>
    `http://127.0.0.1:5197/api/local-seo/${path}?professional=${business}&session=${namespace}`;
  expect((await request.get(endpoint("workspace"))).status()).toBe(401);
  const owner = await token(request, demoSession, "web"),
    contractor = await token(request, demoSession, "contractor"),
    admin = await token(request, demoSession, "admin");
  expect(
    (
      await request.get(endpoint("workspace"), {
        headers: { Authorization: "Bearer " + owner },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.get(endpoint("workspace", "peachtree"), {
        headers: { Authorization: "Bearer " + contractor },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.get(endpoint("workspace", "ruiz", "another-session"), {
        headers: { Authorization: "Bearer " + contractor },
      })
    ).status(),
  ).toBe(401);
  const headers = { Authorization: "Bearer " + admin };
  expect(
    (
      await request.post(endpoint("audit"), {
        headers: { Authorization: "Bearer " + contractor },
        data: {},
      })
    ).status(),
  ).toBe(403);
  const post = (path: string, data: unknown) =>
    request.post(endpoint(path), { headers, data });
  let response = await post("audit", {});
  expect(response.status()).toBe(200);
  const first = (await response.json()).audit;
  expect(first.scope).toBe("homeconnect");
  expect(first.checks.find((check: any) => check.id === "gbp").status).toBe(
    "unavailable",
  );
  expect(
    (
      await post("task", { id: "phone", status: "done", evidence: "" })
    ).status(),
  ).toBe(400);
  const nap = {
    name: "Construcciones Ruiz",
    address: "",
    phone: "4045551234",
    website: "https://example.com",
  };
  expect(
    (
      await post("master", {
        ...nap,
        postalCode: "",
        serviceAreaBusiness: true,
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await post("citation", {
        directory: "Directorio de prueba",
        url: "https://example.com/ficha",
        nap: { ...nap, phone: "4045559999" },
        observedAt: "2026-11-01T00:00:00Z",
        status: "published",
      })
    ).status(),
  ).toBe(200);
  response = await post("audit", {});
  const audit = (await response.json()).audit;
  expect(
    audit.checks.find((check: any) => check.id === "citations").status,
  ).toBe("fail");
  expect(audit.basis.citationObservations).toHaveLength(1);
  const snapshot = await (
    await request.get(endpoint("workspace"), { headers })
  ).json();
  expect(snapshot.audits).toHaveLength(2);
  expect(
    snapshot.audits.find((audit: any) => audit.id === first.id).basis.nap.phone,
  ).toBe("");
  expect(snapshot.activity.length).toBeGreaterThanOrEqual(4);
  expect(
    (
      await request.get(endpoint("workspace", "peachtree"), {
        headers: { Authorization: "Bearer " + admin },
      })
    ).status(),
  ).toBe(200);
});

test("SEO API: importación validada y competidores separados del negocio propio", async ({
  request,
  demoSession,
}) => {
  const headers = {
    Authorization: "Bearer " + (await token(request, demoSession, "admin")),
  };
  const endpoint = (path: string) =>
    `http://127.0.0.1:5197/api/local-seo/${path}?professional=ruiz&session=${demoSession}`;
  const post = (path: string, data: unknown) =>
    request.post(endpoint(path), { headers, data });
  const { id, createdAt, ...input } = campaign;
  await post("keywords", { lines: input.keyword });
  const initial = await (
    await request.get(endpoint("workspace"), { headers })
  ).json();
  expect(
    (
      await post("campaign", {
        ...input,
        keywordId: initial.project.keywords[0].id,
      })
    ).status(),
  ).toBe(200);
  let snapshot = await (
    await request.get(endpoint("workspace"), { headers })
  ).json();
  expect(snapshot.runs).toHaveLength(0);
  expect(snapshot.providers.automaticRankings).toBe(false);
  const campaignId = snapshot.project.campaigns[0].id;
  const measurement = {
    campaignId,
    targetId: "business",
    observedAt: run.observedAt,
    source: run.source,
    points: run.points,
  };
  expect(
    (
      await post("run", {
        ...measurement,
        points: [run.points[0], run.points[0]],
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await post("run", {
        ...measurement,
        points: [{ row: 0, column: 0, rank: 21 }],
      })
    ).status(),
  ).toBe(400);
  expect((await post("run", measurement)).status()).toBe(200);
  expect(
    (
      await post("competitor", {
        name: "Competidor documentado",
        website: "",
        notes: "Observación manual en condiciones de prueba",
        observedAt: run.observedAt,
      })
    ).status(),
  ).toBe(200);
  snapshot = await (
    await request.get(endpoint("workspace"), { headers })
  ).json();
  const targetId = snapshot.project.competitors[0].id;
  expect((await post("run", { ...measurement, targetId })).status()).toBe(200);
  expect(
    (await post("remove", { kind: "competitors", id: targetId })).status(),
  ).toBe(409);
  snapshot = await (
    await request.get(endpoint("workspace"), { headers })
  ).json();
  expect(snapshot.runs).toHaveLength(2);
  expect(new Set(snapshot.runs.map((run: SeoRun) => run.targetId)).size).toBe(
    2,
  );
  expect(snapshot.reputation.average).toBeNull();
});

test("SEO SQL: diagnóstico y medición sobreviven al reinicio sin modificar la muestra del directorio", async () => {
  test.setTimeout(60000);
  const directory = mkdtempSync(join(tmpdir(), "homeconnect-seo-"));
  let db = new Database(directory);
  try {
    await db.initialize();
    await db.sql.query(
      "INSERT INTO local_seo_rank_run(namespace,id,professional_id,data) VALUES($1,$2,$3,$4)",
      ["test", run.id, "ruiz", JSON.stringify(run)],
    );
    await db.close();
    db = new Database(directory);
    await db.initialize();
    const saved = await db.sql.query<{ data: SeoRun }>(
      "SELECT data FROM local_seo_rank_run WHERE namespace=$1 AND professional_id=$2",
      ["test", "ruiz"],
    );
    expect(saved.rows[0].data).toEqual(run);
  } finally {
    await db.close();
  }
});
