/**
 * Awards & NIL watches — typed layer over the weekly research compilations
 * baked into the generated bundle. Fail-closed: absent research exports
 * empty arrays so the pages render their honest "not published" shells.
 *
 * House rules carried through: odds and valuations are AS REPORTED by named
 * outlets (never computed), confidence is capped by sourcing, and null means
 * not published.
 */

import bundle from "./cfb-2026.generated.ts";

/* --------------------------------------------- athlete highlight & panel --- */

export interface HighlightEntry {
  player: string;
  team_slug: string;
  position: string;
  class: string;
  stat_line: string;
  opponent_slug: string;
  result: string;
  why: string;
  video_url?: string | null;
  sources?: string[];
}

export interface AthleteHighlight {
  as_of: string | null;
  week: number | null;
  window: string | null;
  athlete_of_the_week: HighlightEntry | null;
  runners_up: HighlightEntry[];
  honorable_mentions: HighlightEntry[];
  criteria_note: string | null;
  source_engines?: string | null;
}

export interface PanelTopic {
  id: string;
  question: string;
  traditionalist: string;
  analyst: string;
  evaluator: string;
  what_settles_it: string;
  sources: string[];
}

export interface PanelBrief {
  as_of: string | null;
  week: number | null;
  topics: PanelTopic[];
  also_on_the_desk: Array<{ question: string; one_liner: string }>;
  notes: string | null;
  source_engines?: string | null;
}

export type WatchConfidence = "high" | "medium" | "low";

export interface HeismanContender {
  player: string;
  team_slug: string;
  position: string;
  class: string;
  stat_line: string;
  odds_as_reported: Array<{ outlet: string; value: string }> | null;
  case_for: string;
  case_against: string;
  next_test: string;
  sources: string[];
  confidence: WatchConfidence;
}

export interface HeismanWatch {
  as_of: string | null;
  week: number | null;
  contenders: HeismanContender[];
  notes: string | null;
  source_engines?: string | null;
}

export interface NilDealEntry {
  player: string;
  team_slug: string;
  position: string | null;
  deal_summary: string;
  parties: string;
  announced_value: number | null;
  announced_by: string;
  sources: string[];
  confidence: WatchConfidence;
}

export interface NilValuationEntry {
  player: string;
  team_slug: string;
  valuation: { amount_reported: number | null; reported_by: string; reported_on: string };
  sources: string[];
  confidence: WatchConfidence;
}

export interface NilWatch {
  as_of: string | null;
  week: number | null;
  window: string | null;
  week_deals: NilDealEntry[];
  policy_notes: Array<{ title: string; body: string }>;
  watch_valuations: NilValuationEntry[];
  valuation_methodology: string | null;
  notes: string | null;
  source_engines?: string | null;
}

const heismanDoc = (bundle as Record<string, unknown>).heismanWatch as HeismanWatch | null;
const nilDoc = (bundle as Record<string, unknown>).nilWatch as NilWatch | null;
const highlightDoc = (bundle as Record<string, unknown>).athleteHighlight as AthleteHighlight | null;
const panelDoc = (bundle as Record<string, unknown>).panelBrief as PanelBrief | null;

export const heismanWatch: HeismanWatch = heismanDoc
  ? {
      as_of: heismanDoc.as_of ?? null,
      week: heismanDoc.week ?? null,
      contenders: Array.isArray(heismanDoc.contenders) ? heismanDoc.contenders : [],
      notes: heismanDoc.notes ?? null,
      source_engines: heismanDoc.source_engines ?? null,
    }
  : { as_of: null, week: null, contenders: [], notes: null };

export const nilWatch: NilWatch = nilDoc
  ? {
      as_of: nilDoc.as_of ?? null,
      week: nilDoc.week ?? null,
      window: nilDoc.window ?? null,
      week_deals: Array.isArray(nilDoc.week_deals) ? nilDoc.week_deals : [],
      policy_notes: Array.isArray(nilDoc.policy_notes) ? nilDoc.policy_notes : [],
      watch_valuations: Array.isArray(nilDoc.watch_valuations) ? nilDoc.watch_valuations : [],
      valuation_methodology: nilDoc.valuation_methodology ?? null,
      notes: nilDoc.notes ?? null,
      source_engines: nilDoc.source_engines ?? null,
    }
  : {
      as_of: null,
      week: null,
      window: null,
      week_deals: [],
      policy_notes: [],
      watch_valuations: [],
      valuation_methodology: null,
      notes: null,
    };

export const athleteHighlight: AthleteHighlight = highlightDoc
  ? {
      as_of: highlightDoc.as_of ?? null,
      week: highlightDoc.week ?? null,
      window: highlightDoc.window ?? null,
      athlete_of_the_week: highlightDoc.athlete_of_the_week ?? null,
      runners_up: Array.isArray(highlightDoc.runners_up) ? highlightDoc.runners_up : [],
      honorable_mentions: Array.isArray(highlightDoc.honorable_mentions)
        ? highlightDoc.honorable_mentions
        : [],
      criteria_note: highlightDoc.criteria_note ?? null,
      source_engines: highlightDoc.source_engines ?? null,
    }
  : {
      as_of: null,
      week: null,
      window: null,
      athlete_of_the_week: null,
      runners_up: [],
      honorable_mentions: [],
      criteria_note: null,
    };

export const panelBrief: PanelBrief = panelDoc
  ? {
      as_of: panelDoc.as_of ?? null,
      week: panelDoc.week ?? null,
      topics: Array.isArray(panelDoc.topics) ? panelDoc.topics : [],
      also_on_the_desk: Array.isArray(panelDoc.also_on_the_desk) ? panelDoc.also_on_the_desk : [],
      notes: panelDoc.notes ?? null,
      source_engines: panelDoc.source_engines ?? null,
    }
  : { as_of: null, week: null, topics: [], also_on_the_desk: [], notes: null };

/** Best (shortest) reported odds as a positive-integer number, for ordering. */
export function oddsRank(contender: HeismanContender): number {
  if (!contender.odds_as_reported || contender.odds_as_reported.length === 0) return 99_999;
  const values = contender.odds_as_reported
    .map((entry) => Number.parseInt(entry.value.replace(/[^0-9+]/g, ""), 10))
    .filter((value) => Number.isFinite(value) && value > 0);
  return values.length ? Math.min(...values) : 99_999;
}

/** Contenders ordered shortest reported odds first; unpriced by name. */
export function heismanBoard(): HeismanContender[] {
  return [...heismanWatch.contenders].sort(
    (a, b) => oddsRank(a) - oddsRank(b) || a.player.localeCompare(b.player),
  );
}

export function formatValuation(amount: number | null): string {
  if (amount == null) return "Not disclosed";
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    return `$${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}M`;
  }
  return `$${(amount / 1000).toFixed(0)}K`;
}

/* ------------------------------------------------------------- upset watch --- */

export type UpsetConfidence = "coin_flip" | "live_dog" | "long_fuse";

export interface UpsetPick {
  away_slug: string;
  home_slug: string;
  line: number | string | null; // as carried by the cited provider — never computed
  line_source: string | null;
  case: string | null;
  confidence: UpsetConfidence | null;
  race_effect: string | null;
  sources: string[];
}

export interface UpsetWatch {
  as_of: string | null;
  week: number | null;
  picks: UpsetPick[];
  trap: { away_slug: string; home_slug: string; why: string } | null;
  notes: string | null;
}

const upsetDoc = (bundle as Record<string, unknown>).upsetWatch as UpsetWatch | null;

export const upsetWatch: UpsetWatch = upsetDoc
  ? {
      as_of: upsetDoc.as_of ?? null,
      week: upsetDoc.week ?? null,
      picks: Array.isArray(upsetDoc.picks) ? upsetDoc.picks : [],
      trap: upsetDoc.trap ?? null,
      notes: upsetDoc.notes ?? null,
    }
  : { as_of: null, week: null, picks: [], trap: null, notes: null };
