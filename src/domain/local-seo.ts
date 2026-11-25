export type SeoNap = {
  name: string;
  address: string;
  phone: string;
  website: string;
};
export type SeoTask = {
  id: string;
  title: string;
  priority: "high" | "medium";
  status: "todo" | "doing" | "done";
  evidence: string;
  updatedAt: string;
};
export type SeoCitation = {
  id: string;
  directory: string;
  url: string;
  nap: SeoNap;
  observedAt: string;
  status: "published" | "submitted" | "missing";
};
export type SeoCompetitor = {
  id: string;
  name: string;
  website: string;
  notes: string;
  observedAt: string;
};
export type SeoPlan = {
  id: string;
  title: string;
  content: string;
  scheduledAt: string;
  status: "draft" | "planned" | "completed";
};
export type SeoCampaign = {
  id: string;
  keyword: string;
  keywordId?: string;
  country?: string;
  engine: "google_maps" | "google_local";
  language: "en" | "es";
  center: { latitude: number; longitude: number };
  size: 3 | 5 | 7;
  spacingKm: number;
  depth: number;
  createdAt: string;
};
export type SeoCompetitorResult = {
  title: string;
  position: number;
  rating?: number;
  reviews?: number;
};
export type SeoPoint = {
  row: number;
  column: number;
  rank: number | null;
  evidence?: { searchId?: string; competitors: SeoCompetitorResult[] };
};
export type SeoRun = {
  id: string;
  campaignId: string;
  targetId: string;
  observedAt: string;
  source: {
    kind: "manual" | "brightlocal_export" | "other_export" | "serpapi";
    label: string;
    evidenceUrl: string;
    listingId?: string;
    listingName?: string;
  };
  points: SeoPoint[];
  createdAt: string;
};
export type SeoAuditCheck = {
  id: string;
  title: string;
  status: "pass" | "fail" | "unavailable";
  priority: "high" | "medium";
  detail: string;
};
export type SeoAudit = {
  id: string;
  createdAt: string;
  score: number;
  scope: "homeconnect";
  checks: SeoAuditCheck[];
  basis: {
    nap: SeoNap;
    description: string;
    photoCount: number;
    reviewCount: number;
    citationCount: number;
    citationObservations: SeoCitation[];
    profileName: string;
    descriptions: { es: string; en: string };
    publication: string;
    coverage: string[];
    serviceIds: string[];
    serviceAreaBusiness: boolean;
  };
};
export type SeoProject = {
  professionalId: string;
  nap: SeoNap;
  serviceAreaBusiness: boolean;
  reviewUrl: string;
  tasks: SeoTask[];
  citations: SeoCitation[];
  competitors: SeoCompetitor[];
  campaigns: SeoCampaign[];
  plans: SeoPlan[];
  status?: "configured" | "inactive";
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  exportAllowed?: boolean;
  legacyNap?: SeoNap;
  keywords?: SeoKeyword[];
  contents?: SeoContent[];
  listings?: SeoListing[];
};
export type SeoKeyword = {
  id: string;
  keyword: string;
  normalized: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
};
export type SeoContent = {
  id: string;
  type: "post" | "review" | "news";
  title: string;
  body: string;
  image: string;
  sourceUrl: string;
  targetUrl: string;
  keywordIds: string[];
  status: "draft" | "pending" | "published" | "archived" | "rejected";
  publishedAt: string;
  author: string;
  rating: number | null;
  reply: string;
  evidence: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
};
export type SeoDirectory = {
  id: string;
  name: string;
  url: string;
  description: string;
  active: boolean;
};
export type SeoListing = {
  id: string;
  directoryId: string;
  url: string;
  status:
    | "pending"
    | "in_progress"
    | "published"
    | "correction"
    | "not_applicable"
    | "unverified";
  verifiedAt: string;
  notes: string;
  evidence: string;
  updatedAt: string;
  createdAt: string;
  updatedBy: string;
};
export type SeoActivity = {
  id: string;
  at: string;
  actorId: string;
  action: string;
  detail: string;
  before?: unknown;
  after?: unknown;
};
export type SeoWorkspace = {
  permissions?: {
    manage: boolean;
    master: boolean;
    directories: boolean;
    export: boolean;
  };
  directories?: SeoDirectory[];
  business?: {
    id: string;
    name: string;
    city: string;
    region: string;
    country: string;
    postalCode?: string;
    location?: { latitude: number; longitude: number } | null;
    coverage: string[];
  };
  project: SeoProject;
  audits: SeoAudit[];
  runs: SeoRun[];
  activity: SeoActivity[];
  reputation: {
    count: number;
    average: number | null;
    unanswered: number;
    reviews: {
      id: string;
      rating: number;
      text: string;
      reply?: string;
      createdAt: string;
    }[];
  };
  metrics: {
    profileViews: number;
    websiteClicks: number;
    quoteRequests: number;
  };
  providers: {
    automaticRankings: boolean;
    mode: "evidence_import" | "serpapi";
    message: string;
  };
};

export function napDifferences(reference: SeoNap, observed: SeoNap) {
  const text = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]/gu, "");
  const phone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    return digits.length === 11 && digits.startsWith("1")
      ? digits.slice(1)
      : digits;
  };
  return (["name", "address", "phone"] as const).map((field) => ({
    field,
    status:
      !reference[field].trim() || !observed[field].trim()
        ? ("unknown" as const)
        : (
              field === "phone"
                ? phone(reference[field]) === phone(observed[field])
                : text(reference[field]) === text(observed[field])
            )
          ? ("match" as const)
          : ("different" as const),
  }));
}

export function gridPoints(campaign: SeoCampaign) {
  const radians = (angle: number) => (angle * Math.PI) / 180;
  const degrees = (angle: number) => (angle * 180) / Math.PI;
  const originLat = radians(campaign.center.latitude),
    originLon = radians(campaign.center.longitude);
  const middle = (campaign.size - 1) / 2;
  return Array.from({ length: campaign.size ** 2 }, (_, index) => {
    const row = Math.floor(index / campaign.size),
      column = index % campaign.size;
    const north = (middle - row) * campaign.spacingKm,
      east = (column - middle) * campaign.spacingKm;
    const distance = Math.hypot(north, east) / 6371.0088,
      bearing = Math.atan2(east, north);
    const latitude = Math.asin(
      Math.sin(originLat) * Math.cos(distance) +
        Math.cos(originLat) * Math.sin(distance) * Math.cos(bearing),
    );
    const longitude =
      originLon +
      Math.atan2(
        Math.sin(bearing) * Math.sin(distance) * Math.cos(originLat),
        Math.cos(distance) - Math.sin(originLat) * Math.sin(latitude),
      );
    return {
      row,
      column,
      latitude: degrees(latitude),
      longitude: ((degrees(longitude) + 540) % 360) - 180,
    };
  });
}

export function rankMetrics(run?: SeoRun) {
  if (!run?.points.length)
    return { measured: 0, found: 0, top3: null, averageFoundRank: null };
  const ranks = run.points.flatMap((point) =>
    point.rank === null ? [] : [point.rank],
  );
  return {
    measured: run.points.length,
    found: ranks.length,
    top3: (100 * ranks.filter((rank) => rank <= 3).length) / run.points.length,
    averageFoundRank: ranks.length
      ? ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length
      : null,
  };
}

export function comparableBaseline(latest: SeoRun, runs: SeoRun[]) {
  return runs
    .filter(
      (run) =>
        run.id !== latest.id &&
        run.campaignId === latest.campaignId &&
        run.targetId === latest.targetId &&
        run.source.kind === latest.source.kind &&
        run.source.label === latest.source.label &&
        run.source.listingId === latest.source.listingId &&
        run.observedAt < latest.observedAt &&
        run.points
          .map((p) => `${p.row}:${p.column}`)
          .sort()
          .join() ===
          latest.points
            .map((p) => `${p.row}:${p.column}`)
            .sort()
            .join(),
    )
    .sort((a, b) => b.observedAt.localeCompare(a.observedAt))[0];
}

export function parseRankCsv(csv: string): SeoPoint[] {
  // Deliberately a narrow interchange format, not a parser for proprietary exports.
  const lines = csv
    .replace(/^\uFEFF/, "")
    .trim()
    .split(/\r?\n/);
  if (lines.shift()?.trim().toLowerCase() !== "row,column,rank")
    throw Error("Cabecera requerida: row,column,rank");
  return lines
    .filter((line) => line.trim())
    .map((line) => {
      const cells = line.split(",").map((cell) => cell.trim());
      if (
        cells.length !== 3 ||
        !/^\d+$/.test(cells[0]) ||
        !/^\d+$/.test(cells[1]) ||
        (cells[2] !== "" && !/^\d+$/.test(cells[2]))
      )
        throw Error(
          "CSV inválido. Usa row,column,rank; rank vacío significa revisado sin posición encontrada.",
        );
      return {
        row: Number(cells[0]),
        column: Number(cells[1]),
        rank: cells[2] === "" ? null : Number(cells[2]),
      };
    });
}
