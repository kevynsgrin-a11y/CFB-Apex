/**
 * Weekly Injury Report — data layer (college football).
 *
 * Two layers, kept separate on purpose:
 *  1. ESPN BASE — injury statuses fetched at build time from ESPN's free
 *     college football feed. Always attributed to ESPN.
 *  2. EDITORIAL RESEARCH — practice participation, likelihood-to-play with
 *     confidence, and sourced sentiment from beat reporting + verified
 *     social accounts. Ingested weekly from data/injury-research/current.json
 *     via scripts/ingest-injury-research.mjs. Absent file = nothing published.
 *
 * Long-term ledger = out for the season or expected out MORE than 2 weeks.
 * Everything uncertain lives in the week-to-week watch.
 * Null means not published — never zero, never guessed.
 */

import bundle from "./cfb-2026.generated.ts";
import { teams } from "./cfb-dataset.ts";
import type { Team } from "./types";

/* ------------------------------------------------------------------ types */

export type InjuryStatus = "IR" | "OUT" | "QUESTIONABLE" | "DOUBTFUL" | "SUSPENSION" | "ACTIVE";
export type PracticeStatus = "DNP" | "LP" | "FP";
export type Likelihood = "likely" | "questionable" | "doubtful" | "unlikely";
export type Confidence = "high" | "medium" | "low";

/** One player's injury as ESPN publishes it (build snapshot). */
export interface EspnInjuryEntry {
  player: string;
  teamSlug: string | null;
  position: string | null;
  status: InjuryStatus;
  detail: string | null;
  asOf: string | null;
}

/** Editorial long-term entry — season/career or expected out more than 2 weeks. */
export interface InjuryLedgerEntry {
  player: string;
  teamSlug: string;
  position: string | null;
  injury: string | null;
  status: "IR" | "OUT";
  /** Expected weeks remaining out; must be > 2 for a non-season entry. */
  weeksOut: number | null;
  detail: string | null;
  sources: string[];
  social: string[];
  confidence: Confidence | null;
}

/** Editorial week-to-week watch entry. */
export interface InjuryWatchEntry {
  player: string;
  teamSlug: string;
  position: string | null;
  injury: string | null;
  practice: { wed: PracticeStatus | null; thu: PracticeStatus | null; fri: PracticeStatus | null; sat: PracticeStatus | null };
  likelihood: Likelihood | null;
  confidence: Confidence | null;
  note: string | null;
  sources: string[];
  social: string[];
}

export interface InjuryResearchDoc {
  week: number | null;
  asOf: string | null;
  ledger: InjuryLedgerEntry[];
  watch: InjuryWatchEntry[];
}

/* ------------------------------------------------- editorial (vendored doc) */

interface GeneratedInjuryResearch {
  week?: number | null;
  as_of?: string | null;
  ledger?: unknown[];
  watch?: unknown[];
}

const researchDoc = ((bundle as Record<string, unknown>).injuryResearch ?? {}) as GeneratedInjuryResearch;

function mapPractice(row: Record<string, unknown>): InjuryWatchEntry["practice"] {
  const norm = (value: unknown): PracticeStatus | null =>
    value === "DNP" || value === "LP" || value === "FP" ? value : null;
  return {
    wed: norm(row.practice_wed),
    thu: norm(row.practice_thu),
    fri: norm(row.practice_fri),
    sat: norm(row.practice_sat),
  };
}

export const injuryResearch: InjuryResearchDoc = {
  week: researchDoc.week ?? null,
  asOf: researchDoc.as_of ?? null,
  ledger: ((researchDoc.ledger ?? []) as Array<Record<string, unknown>>).map((row) => ({
    player: String(row.player ?? ""),
    teamSlug: String(row.team_slug ?? ""),
    position: (row.position as string | null) ?? null,
    injury: (row.injury as string | null) ?? null,
    status: row.status === "IR" ? ("IR" as const) : ("OUT" as const),
    weeksOut: typeof row.weeks_out === "number" ? row.weeks_out : null,
    detail: (row.detail as string | null) ?? null,
    sources: (row.sources as string[]) ?? [],
    social: (row.social as string[]) ?? [],
    confidence: (row.confidence as Confidence | null) ?? null,
  })),
  watch: ((researchDoc.watch ?? []) as Array<Record<string, unknown>>).map((row) => ({
    player: String(row.player ?? ""),
    teamSlug: String(row.team_slug ?? ""),
    position: (row.position as string | null) ?? null,
    injury: (row.injury as string | null) ?? null,
    practice: mapPractice(row),
    likelihood: (row.likelihood as Likelihood | null) ?? null,
    confidence: (row.confidence as Confidence | null) ?? null,
    note: (row.note as string | null) ?? null,
    sources: (row.sources as string[]) ?? [],
    social: (row.social as string[]) ?? [],
  })),
};

/* ----------------------------------------------------- ESPN base (snapshot) */

interface GeneratedEspnInjuries {
  asOf?: string | null;
  entries?: unknown[];
}

const espnDoc = ((bundle as Record<string, unknown>).espnInjuries ?? { entries: [] }) as GeneratedEspnInjuries;

export const espnInjuries: EspnInjuryEntry[] = ((espnDoc.entries ?? []) as Array<Record<string, unknown>>).map(
  (row) => ({
    player: String(row.player ?? ""),
    teamSlug: (row.team_slug as string | null) ?? null,
    position: (row.position as string | null) ?? null,
    status: row.status as InjuryStatus,
    detail: (row.detail as string | null) ?? null,
    asOf: (row.as_of as string | null) ?? null,
  }),
);

export const espnInjuriesAsOf: string | null = espnDoc.asOf ?? null;

export const ESPN_INJURY_FEED =
  "https://site.api.espn.com/apis/site/v2/sports/football/college-football/injuries";

/* ------------------------------------------------------------ long-term rule */

export const LONG_TERM_MIN_WEEKS = 3; // "more than 2 weeks"

export function isLongTerm(entry: {
  status: InjuryStatus | "IR" | "OUT";
  weeksOut?: number | null;
}): boolean {
  if (entry.status === "IR") return true;
  if (entry.weeksOut != null && entry.weeksOut >= LONG_TERM_MIN_WEEKS) return true;
  return false;
}

/** ESPN base entries that qualify for the long-term ledger on their own. */
export function espnLedgerEntries(): EspnInjuryEntry[] {
  return espnInjuries.filter((entry) => entry.status === "IR");
}

/** ESPN base entries for the week-to-week board (uncertain statuses only). */
export function espnWatchEntries(): EspnInjuryEntry[] {
  return espnInjuries.filter(
    (entry) => entry.status === "QUESTIONABLE" || entry.status === "DOUBTFUL" || entry.status === "OUT",
  );
}

/* ------------------------------------------------ deterministic likelihood */

/**
 * Fallback likelihood model from the latest published practice status.
 * Editorial research always overrides this — the model exists so every
 * watch row shows an explainable basis when no analyst note exists.
 */
export function likelihoodFromPractice(practice: InjuryWatchEntry["practice"]): {
  likelihood: Likelihood | null;
  confidence: Confidence | null;
  basis: string | null;
} {
  const days = (
    [
      ["wed", practice.wed],
      ["thu", practice.thu],
      ["fri", practice.fri],
      ["sat", practice.sat],
    ] as Array<[keyof InjuryWatchEntry["practice"], PracticeStatus | null]>
  ).filter((pair): pair is [keyof InjuryWatchEntry["practice"], PracticeStatus] => pair[1] != null);
  if (days.length === 0) return { likelihood: null, confidence: null, basis: null };
  const [latestDay, latest] = days[days.length - 1];
  const basis = `Latest reported status (${latestDay.toUpperCase()}): ${latest}`;
  if (latest === "FP") return { likelihood: "likely", confidence: "high", basis };
  if (latest === "LP") return { likelihood: "questionable", confidence: "medium", basis };
  if (latestDay === "wed") return { likelihood: "questionable", confidence: "low", basis };
  return { likelihood: "doubtful", confidence: latestDay === "sat" ? "high" : "medium", basis };
}

/* --------------------------------------------------------- publishing slots */

export interface InjurySlot {
  id: string;
  label: string;
  /** 0=Sunday … 6=Saturday */
  weekday: number;
  /** Minutes after midnight, Pacific Time. */
  minuteOfDay: number;
  scope: string;
}

export const INJURY_CADENCE: InjurySlot[] = [
  { id: "tuesday-main", label: "Weekly main report", weekday: 2, minuteOfDay: 9 * 60, scope: "Full ledger + watch, built from the week's research (posts Wednesday when Monday data runs long)" },
  { id: "saturday-morning", label: "Saturday morning update", weekday: 6, minuteOfDay: 8 * 60 + 30, scope: "Game-day actives/inactives as Saturday squads release them" },
  { id: "saturday-noon", label: "Saturday midday update", weekday: 6, minuteOfDay: 12 * 60 + 30, scope: "Final calls for afternoon and evening kickoffs" },
];

export function nextInjurySlot(now: Date = new Date()): { slot: InjurySlot; at: Date } {
  // Pacific Time offset in hours: PDT (UTC-7) roughly Mar–Nov, PST (UTC-8) otherwise.
  const month = now.getUTCMonth();
  const ptHours = month >= 2 && month <= 10 ? 7 : 8;
  let best: { slot: InjurySlot; at: Date } | null = null;
  for (let dayAhead = 0; dayAhead <= 7; dayAhead += 1) {
    const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + dayAhead));
    for (const slot of INJURY_CADENCE) {
      if (day.getUTCDay() !== slot.weekday) continue;
      const at = new Date(day.getTime() + slot.minuteOfDay * 60_000 + ptHours * 3_600_000);
      if (at.getTime() <= now.getTime()) continue;
      if (!best || at.getTime() < best.at.getTime()) best = { slot, at };
    }
  }
  if (!best) throw new Error("injury cadence produced no next slot");
  return best;
}

/* -------------------------------------------------------------- page helpers */

export function teamBySlugForInjuries(): Map<string, Team> {
  return new Map(teams.map((team) => [team.slug, team]));
}

export function injuryCounts() {
  return {
    espnLedger: espnLedgerEntries().length,
    espnWatch: espnWatchEntries().length,
    researchLedger: injuryResearch.ledger.length,
    researchWatch: injuryResearch.watch.length,
    researchAsOf: injuryResearch.asOf,
  };
}

export const INJURY_METHOD = {
  ledger: "The long-term ledger lists players out for the season or expected out more than 2 weeks — game-time decisions never belong here.",
  watch: "The watch carries verified practice participation and availability notes plus likelihood to play, graded with a stated confidence and sourced from beat reporting, team releases, and verified player social accounts (X, Instagram).",
  sentiment: "Sentiment is evidence, not vibes: a likelihood call must cite a beat report, team release, or verified-account post. Unverified aggregators and speculation accounts are never sources.",
  schedule: "The ESPN base refreshes with every scheduled rebuild; the editorial layer publishes on the posted schedule and is locked once Saturday kickoffs begin.",
} as const;
