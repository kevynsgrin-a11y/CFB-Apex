import { isCurrentEspnInjury } from "./injury-freshness.mjs";
import type { EspnInjuryEntry, InjuryStatus } from "./injury-report.ts";

const STATUS_MAP: Record<string, InjuryStatus> = {
  "Injured Reserve": "IR", Out: "OUT", Questionable: "QUESTIONABLE",
  Doubtful: "DOUBTFUL", Suspension: "SUSPENSION", Active: "ACTIVE",
};
export function parseEspnInjuryFeed(doc: unknown, teams: ReadonlyMap<string, string>, nowMs: number) {
  if (!doc || typeof doc !== "object" || !Array.isArray((doc as { injuries?: unknown }).injuries)) {
    throw new Error("ESPN injury feed has no valid injuries collection");
  }
  const data = doc as { timestamp?: unknown; injuries: Array<{ displayName?: string; injuries?: Array<Record<string, unknown>> }> };
  const entries: EspnInjuryEntry[] = [];
  let excludedCount = 0;
  for (const block of data.injuries) {
    if (!block || typeof block !== "object" || !Array.isArray(block.injuries)) { excludedCount += 1; continue; }
    const teamSlug = teams.get(String(block.displayName ?? "").toLowerCase()) ?? null;
    for (const row of block.injuries ?? []) {
      if (!row || typeof row !== "object") { excludedCount += 1; continue; }
      const status = STATUS_MAP[String(row.status)];
      const athlete = (row.athlete ?? {}) as { displayName?: string; position?: { abbreviation?: string } };
      if (!status || !teamSlug || !athlete.displayName || !isCurrentEspnInjury(typeof row.date === "string" ? row.date : null, nowMs)) {
        excludedCount += 1;
        continue;
      }
      entries.push({ player: athlete.displayName, teamSlug, position: athlete.position?.abbreviation ?? null,
        status, detail: typeof row.shortComment === "string" ? row.shortComment : typeof row.longComment === "string" ? row.longComment : null,
        asOf: (row.date as string).slice(0, 10) });
    }
  }
  const timestamp = typeof data.timestamp === "string" && Number.isFinite(Date.parse(data.timestamp)) ? data.timestamp : null;
  return { entries, asOf: timestamp, excludedCount };
}

/** An incomplete feed cannot erase still-valid rows by omission. */
export function mergeValidatedEspnInjuries(previous: readonly EspnInjuryEntry[], incoming: readonly EspnInjuryEntry[], nowMs: number): EspnInjuryEntry[] {
  const rows = new Map<string, EspnInjuryEntry>();
  for (const row of [...previous, ...incoming]) {
    if (!isCurrentEspnInjury(row.asOf, nowMs)) continue;
    const key = `${row.teamSlug}:${row.player}`;
    const prior = rows.get(key);
    if (!prior || (row.asOf ?? "") >= (prior.asOf ?? "")) rows.set(key, row);
  }
  return [...rows.values()];
}
