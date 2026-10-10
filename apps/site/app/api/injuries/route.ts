import { teams } from "@/lib/cfb-dataset";
import { ESPN_INJURY_FEED, espnInjuries, espnInjuriesAsOf, type EspnInjuryEntry } from "@/lib/injury-report";
import { isCurrentEspnInjury } from "@/lib/injury-freshness.mjs";
import { parseEspnInjuryFeed, mergeValidatedEspnInjuries, espnInjuryCachePolicy } from "@/lib/espn-injuries";

export const revalidate = 0;
const teamSlugs = new Map(teams.flatMap((team) => [[team.name.toLowerCase(), team.slug], [team.shortName.toLowerCase(), team.slug]]));
interface Feed {
  asOf: string | null;
  fetchedAt: string | null;
  checkedAt: string;
  entries: EspnInjuryEntry[];
  excludedCount: number;
  degraded: boolean;
  detail: string;
}
let cache: { at: number; feed: Feed } | null = null;
function injuryResponse(feed: Feed) {
  return Response.json(
    { requestId: crypto.randomUUID(), source: "ESPN college football injuries feed", buildSnapshotAsOf: espnInjuriesAsOf, count: feed.entries.length, ...feed },
    { headers: { "Cache-Control": espnInjuryCachePolicy(feed.degraded).cacheControl } },
  );
}
function validatedFallback(nowMs: number, detail: string): Feed {
  const prior = cache?.feed;
  return {
    asOf: prior?.asOf ?? null,
    fetchedAt: prior?.fetchedAt ?? null,
    checkedAt: new Date(nowMs).toISOString(),
    entries: (prior?.entries ?? espnInjuries).filter((row) => isCurrentEspnInjury(row.asOf, nowMs)),
    excludedCount: prior?.excludedCount ?? 0,
    degraded: true,
    detail: `${detail} Only still-valid prior rows may be retained; missing rows do not imply availability.`,
  };
}
export async function GET() {
  const nowMs = Date.now();
  if (cache && nowMs - cache.at < espnInjuryCachePolicy(cache.feed.degraded).ttlMs) {
    const feed = { ...cache.feed, entries: cache.feed.entries.filter((row) => isCurrentEspnInjury(row.asOf, nowMs)) };
    return injuryResponse(feed);
  }
  let feed: Feed;
  try {
    const response = await fetch(ESPN_INJURY_FEED, {
      signal: AbortSignal.timeout(6000),
      headers: { accept: "application/json", "user-agent": "Mozilla/5.0", referer: "https://www.espn.com/" },
    });
    if (!response.ok) throw new Error(`ESPN injury feed unavailable: ${response.status}`);
    const parsed = parseEspnInjuryFeed(await response.json(), teamSlugs, nowMs);
    feed = parsed.entries.length === 0
      ? { ...validatedFallback(nowMs, "Upstream returned no usable rows; empty coverage is not an all-clear."), excludedCount: parsed.excludedCount }
      : { ...parsed, entries: mergeValidatedEspnInjuries(cache?.feed.entries ?? espnInjuries, parsed.entries, nowMs), fetchedAt: new Date(nowMs).toISOString(), checkedAt: new Date(nowMs).toISOString(), degraded: parsed.excludedCount > 0,
        detail: "Fetched on page load; source timestamp may be unknown. Valid row dates are shown separately. Partial feed, not a full availability report." };
  } catch (error) {
    feed = validatedFallback(nowMs, error instanceof Error ? error.message : "Live fetch failed.");
  }
  cache = { at: nowMs, feed };
  return injuryResponse(feed);
}
