import {
  mergeNcaafFeeds,
  windowThisWeek,
  type NcaafScoreboardPayload,
  type TsdbRawEvent,
} from "@/lib/ncaaf-scoreboard";

/**
 * Live NCAAF scoreboard for TheSportsDB league 4479 (NCAA Division 1
 * Football). Serves the compact event shape consumed by the WeekGames
 * widget on team pages.
 *
 * Caching: a module-scope isolate cache serves repeats for 60 seconds, so
 * team-page bursts and widget refetches cost at most one upstream pair per
 * isolate per minute. Browsers additionally keep the response for 30s via
 * Cache-Control.
 *
 * Degradation is by design: missing key, upstream failure, or malformed
 * payloads return 200 with an empty event list so the widget hides its
 * section instead of surfacing an error.
 */

const CACHE_TTL_MS = 60_000;
const UPSTREAM_TIMEOUT_MS = 6_000;
const TSDB_LEAGUE_NCAAF = "4479";

let cached: { at: number; payload: NcaafScoreboardPayload } | null = null;

function degradedPayload(nowMs: number): NcaafScoreboardPayload {
  return {
    events: [],
    asOf: new Date(nowMs).toISOString(),
    source: "none",
    degraded: true,
  };
}

async function fetchFeed(
  baseUrl: string,
  endpoint: string,
): Promise<TsdbRawEvent[] | null> {
  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    const events = (body as { events?: unknown } | null)?.events;
    if (!Array.isArray(events)) return null;
    // Non-object entries are dropped downstream; keep only plausibly shaped ones.
    return events.filter(
      (event): event is TsdbRawEvent => typeof event === "object" && event !== null,
    );
  } catch {
    return null;
  }
}

/**
 * TrueAPI ingest first (ingest.oakandmain.dev): the portfolio's KV cache holds
 * the last-good league feeds, so when TheSportsDB's live endpoint drops
 * results mid-Saturday churn (observed 2026-10-03: direct past-league served
 * ~1 event while the cached copy held 15 scored finals) the board keeps its
 * finals instead of going hollow. A cold/failed ingest read falls back to the
 * direct key call per feed. Envelope shape: { data: { events: [...] } }.
 */
const INGEST_BASE =
  process.env.TRUEAPI_INGEST_BASE || "https://ingest.oakandmain.dev";

async function fetchIngestFeed(endpoint: string): Promise<TsdbRawEvent[] | null> {
  try {
    const response = await fetch(
      `${INGEST_BASE}/data/thesportsdb${endpoint}`,
      { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) },
    );
    if (!response.ok) return null;
    const body: unknown = await response.json();
    const events = (body as { data?: { events?: unknown } } | null)?.data
      ?.events;
    if (!Array.isArray(events)) return null;
    return events.filter(
      (event): event is TsdbRawEvent => typeof event === "object" && event !== null,
    );
  } catch {
    return null;
  }
}

async function resolveFeed(
  key: string,
  endpoint: string,
): Promise<TsdbRawEvent[] | null> {
  const cached = await fetchIngestFeed(endpoint);
  if (cached && cached.length > 0) return cached;
  const baseUrl = `https://www.thesportsdb.com/api/v1/json/${key}`;
  return fetchFeed(baseUrl, endpoint);
}

async function fetchScoreboard(key: string, nowMs: number): Promise<NcaafScoreboardPayload> {
  const [next, past] = await Promise.all([
    resolveFeed(key, `/eventsnextleague.php?id=${TSDB_LEAGUE_NCAAF}`),
    resolveFeed(key, `/eventspastleague.php?id=${TSDB_LEAGUE_NCAAF}`),
  ]);
  if (!next && !past) return degradedPayload(nowMs);
  const events = windowThisWeek(mergeNcaafFeeds(next ?? [], past ?? []), nowMs);
  return {
    events,
    asOf: new Date(nowMs).toISOString(),
    source: "thesportsdb",
    // One feed alone still renders; flagged so operators can see the gap.
    degraded: next == null || past == null,
  };
}

export async function GET() {
  const nowMs = Date.now();
  if (cached && nowMs - cached.at < CACHE_TTL_MS) {
    return Response.json(cached.payload, {
      headers: { "Cache-Control": "public, max-age=30" },
    });
  }
  const key = process.env.THESPORTSDB_API_KEY;
  const payload = key
    ? await fetchScoreboard(key, nowMs)
    : degradedPayload(nowMs);
  cached = { at: nowMs, payload };
  return Response.json(payload, {
    headers: { "Cache-Control": "public, max-age=30" },
  });
}
