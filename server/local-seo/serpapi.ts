import { z } from "zod";
import {
  gridPoints,
  type SeoCampaign,
  type SeoPoint,
} from "../../src/domain/local-seo";

export function serpApiConfigured() {
  return Boolean(process.env.SERPAPI_API_KEY?.trim());
}

export class SerpApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export const listingSchema = z.object({
  title: z.string().trim().min(1).max(300),
  placeId: z
    .string()
    .regex(/^[\w-]{1,300}$/)
    .optional(),
  cid: z
    .string()
    .regex(/^\d{1,25}$/)
    .optional(),
});
type Listing = z.infer<typeof listingSchema>;
type Coordinates = SeoCampaign["center"];

const resultSchema = z.object({
  position: z.number().int().positive().optional(),
  title: z.string().optional(),
  address: z.string().optional(),
  place_id: z.string().optional(),
  data_cid: z.string().optional(),
  rating: z.number().min(0).max(5).optional().catch(undefined),
  reviews: z.number().int().nonnegative().optional().catch(undefined),
});
const payloadSchema = z.object({
  error: z.string().optional(),
  search_metadata: z
    .object({ status: z.string(), id: z.string().max(120).optional() })
    .optional(),
  search_information: z
    .object({ local_results_state: z.string().optional() })
    .optional(),
  local_results: z
    .union([
      z.array(z.unknown()),
      z.object({ places: z.array(z.unknown()).optional() }),
    ])
    .optional(),
  place_results: z.unknown().optional(),
});

// Reserve requests before sending them. The counter is shared by all tenants in this process.
let usage = { day: "", requests: 0 };
function reserve(requests: number) {
  const today = new Date().toISOString().slice(0, 10);
  if (usage.day !== today) usage = { day: today, requests: 0 };
  const configured = Number(process.env.SERPAPI_DAILY_LIMIT ?? 100);
  const limit =
    Number.isSafeInteger(configured) && configured > 0 ? configured : 100;
  if (usage.requests + requests > limit)
    throw new SerpApiError(
      "Se alcanzó el límite diario de consultas de SerpApi.",
      429,
    );
  usage.requests += requests;
}

async function search(params: URLSearchParams, signal?: AbortSignal) {
  const apiKey = process.env.SERPAPI_API_KEY?.trim();
  if (!apiKey)
    throw new SerpApiError("SerpApi está pendiente de configuración.", 503);
  const url = new URL("https://serpapi.com/search.json");
  url.search = params.toString();
  url.searchParams.set("api_key", apiKey);
  let response: Response;
  try {
    const timeout = AbortSignal.timeout(8_000);
    response = await fetch(url, {
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      redirect: "error",
    });
  } catch {
    throw new SerpApiError("SerpApi no respondió a tiempo.", 502);
  }
  if ([401, 403].includes(response.status))
    throw new SerpApiError("SerpApi rechazó la credencial configurada.", 503);
  if (response.status === 429)
    throw new SerpApiError(
      "SerpApi alcanzó la cuota o el límite de solicitudes.",
      429,
    );
  if (!response.ok && response.status !== 404)
    throw new SerpApiError("SerpApi no completó la consulta.", 502);
  const parsed = payloadSchema.safeParse(
    await response.json().catch(() => null),
  );
  if (!parsed.success)
    throw new SerpApiError("SerpApi devolvió datos inválidos.", 502);
  const payload = parsed.data;
  if (payload.search_information?.local_results_state === "Fully empty")
    return payload;
  if (
    !response.ok ||
    payload.error ||
    payload.search_metadata?.status !== "Success"
  )
    throw new SerpApiError("SerpApi no completó la consulta.", 502);
  return payload;
}

function mapParams(
  keyword: string,
  { latitude, longitude }: Coordinates,
  language: string,
) {
  return new URLSearchParams({
    engine: "google_maps",
    type: "search",
    q: keyword,
    hl: language,
    ll: `@${latitude.toFixed(6)},${longitude.toFixed(6)},15z`,
  });
}

function mapResults(payload: Awaited<ReturnType<typeof search>>) {
  const results = Array.isArray(payload.local_results)
    ? payload.local_results
    : [];
  return results.flatMap((row) => {
    const parsed = resultSchema.safeParse(row);
    return parsed.success ? [parsed.data] : [];
  });
}

export async function findSerpListings(
  keyword: string,
  coordinates: Coordinates,
  language: string,
) {
  if (!serpApiConfigured())
    throw new SerpApiError("SerpApi está pendiente de configuración.", 503);
  reserve(1);
  const payload = await search(mapParams(keyword, coordinates, language));
  const place = resultSchema.safeParse(payload.place_results);
  const results = place.success
    ? [place.data, ...mapResults(payload)]
    : mapResults(payload);
  return results.slice(0, 20).flatMap((result) => {
    const listing = listingSchema.safeParse({
      title: result.title,
      placeId: result.place_id,
      cid: result.data_cid,
    });
    return listing.success && (listing.data.placeId || listing.data.cid)
      ? [
          {
            ...listing.data,
            address: result.address?.slice(0, 300),
            position: result.position,
            rating: result.rating,
            reviews: result.reviews,
          },
        ]
      : [];
  });
}

export function serpApiDepth(campaign: SeoCampaign) {
  return campaign.engine === "google_maps" ? 20 : 3;
}

export async function scanSerpGrid(campaign: SeoCampaign, listing: Listing) {
  if (!serpApiConfigured())
    throw new SerpApiError("SerpApi está pendiente de configuración.", 503);
  const maps = campaign.engine === "google_maps";
  const listingId = maps ? (listing.placeId ?? listing.cid) : listing.cid;
  if (!listingId)
    throw new SerpApiError(
      "Selecciona una ficha que tenga identificador para este motor.",
      400,
    );
  if (campaign.depth > serpApiDepth(campaign))
    throw new SerpApiError(
      `Para medir con SerpApi, crea una campaña con profundidad de hasta ${serpApiDepth(campaign)}.`,
      400,
    );
  const points = gridPoints(campaign);
  reserve(points.length);
  const measured: SeoPoint[] = [];
  const deadline = AbortSignal.timeout(42_000);
  let failure: SerpApiError | undefined;
  for (let start = 0; start < points.length && !deadline.aborted; start += 10) {
    const batch = await Promise.allSettled(
      points.slice(start, start + 10).map(async (point) => {
        const params = maps
          ? mapParams(campaign.keyword, point, campaign.language)
          : new URLSearchParams({
              engine: "google",
              q: campaign.keyword,
              hl: campaign.language,
              gl: (campaign.country || "US").toLowerCase(),
              lat: point.latitude.toFixed(6),
              lon: point.longitude.toFixed(6),
            });
        const payload = await search(params, deadline);
        // A single place detail has no ranked list. Keep this point unmeasured.
        if (
          maps &&
          !Array.isArray(payload.local_results) &&
          payload.search_information?.local_results_state !== "Fully empty"
        )
          throw new SerpApiError(
            "Google Maps no entregó una lista de resultados para ese punto.",
            502,
          );
        const results = maps
          ? mapResults(payload)
          : (!Array.isArray(payload.local_results)
              ? (payload.local_results?.places ?? [])
              : payload.local_results
            ).flatMap((row) => {
              const parsed = resultSchema.safeParse(row);
              return parsed.success ? [parsed.data] : [];
            });
        const matches = (result: z.infer<typeof resultSchema>) =>
          maps
            ? (listing.placeId && result.place_id === listing.placeId) ||
              (listing.cid && result.data_cid === listing.cid)
            : result.place_id === listing.cid;
        const ranked = results.filter(
          (result) => result.position && result.position <= campaign.depth,
        );
        const rank = ranked.find(matches)?.position ?? null;
        const competitors = ranked
          .filter((result) => !matches(result))
          .slice(0, 10)
          .flatMap(({ title, position, rating, reviews }) =>
            title && position
              ? [{ title: title.slice(0, 300), position, rating, reviews }]
              : [],
          );
        return {
          row: point.row,
          column: point.column,
          rank,
          evidence: { searchId: payload.search_metadata?.id, competitors },
        };
      }),
    );
    for (const result of batch) {
      if (result.status === "fulfilled") measured.push(result.value);
      else if (result.reason instanceof SerpApiError) {
        if (!failure || result.reason.status !== 502) failure = result.reason;
      }
    }
    if (failure?.status === 429 || failure?.status === 503) break;
  }
  if (!measured.length)
    throw (
      failure ??
      new SerpApiError(
        "SerpApi no pudo medir los puntos de la cuadrícula.",
        502,
      )
    );
  return { measured, listingId };
}
