/**
 * Shapes of the CFB Apex 2026 dataset.
 *
 * Every one of these mirrors an artifact under `data/dist`, which is generated
 * from the research package by `tools/etl`. Two conventions run through all of
 * them and matter more than any individual field:
 *
 *   1. `null` means the source did not publish a value. It never means zero,
 *      empty, or "we could not be bothered". Render it as "Not listed", not "0".
 *   2. Every artifact carries a `meta` block naming the source documents it was
 *      built from, so any number on the site can be traced to a document.
 */

/** Provenance attached to every artifact. */
export interface DatasetMeta {
  dataset: string;
  schema_version: string;
  /** Package-relative paths of the source documents. */
  sources: string[];
  /** The date the underlying research was current as of, ISO `YYYY-MM-DD`. */
  as_of?: string;
  notes?: string[];
}

export interface Envelope {
  meta: DatasetMeta;
}

export type ConferenceSlug =
  | "aac"
  | "acc"
  | "big-ten"
  | "big12"
  | "cusa"
  | "mac"
  | "mountain-west"
  | "pac12"
  | "sec"
  | "sun-belt"
  | "independents";

export interface Team {
  slug: string;
  school: string;
  nickname: string | null;
  display_name: string;
  conference: string;
  conference_slug: ConferenceSlug;
  conference_short: string;
  /** Sun Belt only; `null` for every other league. */
  division: string | null;
  /** Football-only member of its conference (NIU, NDSU, Sacramento State). */
  football_only: boolean;
}

export interface Conference {
  slug: ConferenceSlug;
  name: string;
  short: string;
  teams: string[];
  team_count: number;
}

/* ------------------------------------------------------------------ rosters */

export interface Player {
  name: string;
  position: string | null;
  position_group: string | null;
  /** Recruiting stars, 1-5. `null` when the source did not list a rating. */
  stars: number | null;
  /** Canonical class code, e.g. `SR`, `RFR`, `5TH`. */
  class: string | null;
  /** The source's own wording, which carries nuance the code drops. */
  class_raw: string | null;
  jersey: number | null;
  height: string | null;
  weight: string | null;
  high_school: string | null;
  city: string | null;
  state: string | null;
  hometown: string | null;
  /** Transfer history, as the roster recorded it ("Georgia Tech // Anderson"). */
  previous_schools: string | null;
  /** False for players a source listed but the official athletics roster did not. */
  on_official_roster: boolean;
  notes: string | null;
}

export interface PositionGroup {
  name: string;
  players: Player[];
}

export interface Roster extends Envelope {
  team: Pick<Team, "slug" | "school" | "conference" | "conference_slug">;
  head_coach: string | null;
  source_notes: string[];
  position_groups: PositionGroup[];
  players: Player[];
  counts: {
    players: number;
    with_stars: number;
    with_high_school: number;
    with_hometown: number;
    with_class: number;
  };
}

export interface RosterIndex extends Envelope {
  teams: Array<{
    slug: string;
    school: string;
    conference_slug: ConferenceSlug;
    players: number;
    with_stars: number;
    with_high_school: number;
    source: string;
  }>;
  /** Leagues the research package has no roster files for. Stated, not hidden. */
  conferences_without_rosters: ConferenceSlug[];
}

/* ------------------------------------------------------------- depth charts */

export type DepthChartStatus = "OFFICIAL" | "MIXED" | "PROJECTED";

export interface DepthPlayer {
  name: string;
  stars: number | null;
  class: string | null;
  class_raw: string | null;
  high_school: string | null;
  city: string | null;
  state: string | null;
  hometown: string | null;
  previous_schools: string | null;
  note: string | null;
}

export interface DepthSlot {
  rank: number;
  players: DepthPlayer[];
  /** True when the chart co-lists competitors ("A OR B") at this rank. */
  co_listed: boolean;
}

export interface DepthPosition {
  position: string;
  depth: DepthSlot[];
}

export interface DepthUnit {
  unit: "offense" | "defense" | "special_teams";
  scheme: string | null;
  positions: DepthPosition[];
}

export interface DepthChart extends Envelope {
  team: Pick<Team, "slug" | "school" | "conference_slug">;
  status: DepthChartStatus | null;
  status_caveat: string | null;
  schemes: {
    offense: string | null;
    defense: string | null;
    special_teams: string | null;
  };
  units: DepthUnit[];
  /** Positions where the two source documents disagree, both values kept. */
  conflicts: Array<{
    position: string;
    unit: string;
    per_source: Record<string, string>;
  }>;
  injury_notes: string[];
  suspension_notes: string[];
}

/* ---------------------------------------------------------------- schedules */

export type GameLocation = "home" | "away" | "neutral";

export interface ScheduledGame {
  /** ISO date. The season spans Aug 2026 to Jan 2027, so January dates are 2027. */
  date: string | null;
  date_raw: string;
  week: number | null;
  opponent: string;
  /** `null` for non-FBS opponents, which is correct rather than a gap. */
  opponent_slug: string | null;
  location: GameLocation | null;
  site: string | null;
  type: "conference" | "non-conference" | "bye" | null;
  notes: string | null;
  source: string;
}

export interface Schedule extends Envelope {
  team: Pick<Team, "slug" | "school" | "conference_slug">;
  games: ScheduledGame[];
  counts: {
    games: number;
    conference_games: number;
    byes: number;
  };
}

/* -------------------------------------------------------------------- polls */

export interface PollEntry {
  rank: number;
  rank_raw: string;
  tied: boolean;
  team: string;
  team_slug: string | null;
  record: { wins: number; losses: number } | null;
  points: number | null;
  first_place_votes: number | null;
  previous_rank: number | null;
}

export interface Poll {
  poll: "ap" | "coaches";
  name: string;
  release_date: string | null;
  voters: number | null;
  panel: string | null;
  points_system: string | null;
  next_release: string | null;
  rankings: PollEntry[];
  others_receiving_votes: Array<{
    team: string;
    team_slug: string | null;
    points: number | null;
  }>;
  sources: Array<{ title: string; url: string }>;
}

export interface Polls extends Envelope {
  polls: Poll[];
  status?: {
    preseason: boolean;
    next_update: string | null;
    note: string;
  };
}

/* ---------------------------------------------------------------------- SOS */

export interface SosMetricDefinition {
  key: string;
  label: string;
  definition: string;
  timing: string | null;
  direction: "rank_asc" | "rating_desc";
}

export interface SosTeam {
  slug: string;
  team_raw: string;
  conference: string | null;
  espn_fpi_sos_rank: number | null;
  espn_fpi_rem_sos_rank: number | null;
  espn_fpi_rank: number | null;
  phil_steele_rank: number | null;
  opponent_win_pct_rank: number | null;
  opponent_record: { wins: number; losses: number } | null;
  opponent_win_pct: number | null;
  teamrankings_rank: number | null;
  teamrankings_rating: number | null;
  sources: Record<string, string>;
}

export interface StrengthOfSchedule extends Envelope {
  metric_definitions: SosMetricDefinition[];
  teams: SosTeam[];
  conflicts?: Array<Record<string, unknown>>;
}

/* ----------------------------------------------------------------- coaching */

export type CoachRole =
  | "hc"
  | "oc"
  | "co_oc"
  | "dc"
  | "co_dc"
  | "stc"
  | "qb"
  | "rb"
  | "wr"
  | "other";

export interface StaffMember {
  role_key: CoachRole;
  role_raw: string;
  name: string | null;
  title_raw: string | null;
}

export interface Scheme {
  /** Short label such as `Air Raid`, `4-2-5`, `Triple Option`. */
  label: string | null;
  /** The source's full sentence, including its attribution. */
  description: string | null;
}

export interface CoachingStaff extends Envelope {
  team: Pick<Team, "slug" | "school" | "conference_slug">;
  head_coach: {
    name: string | null;
    title_raw: string | null;
    first_season: number | null;
  };
  staff: StaffMember[];
  schemes: { offense: Scheme; defense: Scheme };
  sources: Array<{ title: string; url: string }>;
}

/* -------------------------------------------------------------------- stats */

export interface HistoricalTeamSeason extends Envelope {
  teams: Array<{
    slug: string | null;
    team_raw: string;
    games: number | null;
    offense: Record<string, Record<string, number | string | null>>;
    defense: Record<string, Record<string, number | string | null>>;
  }>;
}

export interface HistoricalIndividualSeason extends Envelope {
  categories: Record<
    string,
    {
      columns: string[];
      leaders: Array<{
        rank: number;
        player: string;
        team_slug: string | null;
        team_code: string | null;
        values: Record<string, number | string | null>;
      }>;
    }
  >;
}

export interface HistoricalIndex extends Envelope {
  seasons: Array<{
    season: number;
    has_team: boolean;
    has_individual: boolean;
    has_advanced: boolean;
    team_rows: number;
    individual_categories: number;
    teams_resolved: number;
    teams_unresolved: number;
  }>;
}

/* ----------------------------------------------------------------- injuries */

export interface InjuryEntry {
  name: string;
  position: string | null;
  status: string | null;
  status_raw: string | null;
  injury: string | null;
  source: string | null;
}

export interface InjuryReport extends Envelope {
  as_of: string;
  teams: Array<{
    slug: string | null;
    team_raw: string;
    conference_slug: ConferenceSlug | null;
    opponent_context: string | null;
    players: InjuryEntry[];
  }>;
}

/* -------------------------------------------------------------- aggregation */

/** Everything the site needs to render one team page, in a single object. */
export interface TeamProfile {
  team: Team;
  roster: Roster | null;
  depth_chart: DepthChart | null;
  schedule: Schedule | null;
  coaching: CoachingStaff | null;
  sos: SosTeam | null;
  poll: { ap: PollEntry | null; coaches: PollEntry | null };
  injuries: InjuryReport["teams"][number] | null;
  /** Seasons for which historical stats exist for this team. */
  historical_seasons: number[];
}
