/**
 * Typed reader for the CFB Apex 2026 dataset.
 *
 * This is the module the site imports instead of its fixture pack. Everything
 * it returns came from a published source document; nothing is synthesised. Any
 * field the sources left blank arrives as `null`, and the UI is expected to say
 * "Not listed" rather than invent a zero.
 */

import type {
  CoachingStaff,
  Conference,
  DatasetMeta,
  DepthChart,
  Envelope,
  HistoricalIndex,
  HistoricalIndividualSeason,
  HistoricalTeamSeason,
  InjuryReport,
  Poll,
  PollEntry,
  Polls,
  Roster,
  RosterIndex,
  Schedule,
  SosTeam,
  StrengthOfSchedule,
  Team,
  TeamProfile,
} from "./types.js";
import type { DataSource } from "./source.js";

export interface DatasetIndex extends Envelope {
  datasets: Record<string, { counts: Record<string, number>; artifacts: number }>;
  team_count: number;
  missing_parsers: string[];
  warning_count: number;
}

interface TeamsFile extends Envelope {
  teams: Team[];
}

interface ConferencesFile extends Envelope {
  conferences: Conference[];
}

/** Thrown when a dataset artifact the site depends on is absent. */
export class DatasetError extends Error {
  constructor(path: string) {
    super(
      `dataset artifact missing: ${path}. ` +
        `Run 'python3 tools/etl/build.py' and commit data/dist.`,
    );
    this.name = "DatasetError";
  }
}

export class CfbDataClient {
  readonly source: DataSource;
  #teams: Promise<Team[]> | null = null;
  #conferences: Promise<Conference[]> | null = null;

  constructor(source: DataSource) {
    this.source = source;
  }

  async #require<T>(path: string): Promise<T> {
    const value = await this.source.read<T>(path);
    if (value === null) {
      throw new DatasetError(path);
    }
    return value;
  }

  /* ------------------------------------------------------------- registry */

  /** Build manifest: which datasets exist and how much of each. */
  index(): Promise<DatasetIndex> {
    return this.#require<DatasetIndex>("index");
  }

  teams(): Promise<Team[]> {
    this.#teams ??= this.#require<TeamsFile>("teams").then((file) => file.teams);
    return this.#teams;
  }

  conferences(): Promise<Conference[]> {
    this.#conferences ??= this.#require<ConferencesFile>("conferences").then(
      (file) => file.conferences,
    );
    return this.#conferences;
  }

  async team(slug: string): Promise<Team | null> {
    const teams = await this.teams();
    return teams.find((team) => team.slug === slug) ?? null;
  }

  async teamsByConference(conferenceSlug: string): Promise<Team[]> {
    const teams = await this.teams();
    return teams.filter((team) => team.conference_slug === conferenceSlug);
  }

  /**
   * Best-effort lookup by any spelling a page might carry in a URL or query.
   * Falls back to a case-insensitive school-name match; returns `null` rather
   * than a wrong team when nothing matches cleanly.
   */
  async findTeam(query: string): Promise<Team | null> {
    const needle = query.trim().toLowerCase();
    if (!needle) return null;
    const teams = await this.teams();
    return (
      teams.find((team) => team.slug === needle) ??
      teams.find((team) => team.school.toLowerCase() === needle) ??
      teams.find((team) => team.display_name.toLowerCase() === needle) ??
      null
    );
  }

  /* --------------------------------------------------------------- rosters */

  roster(slug: string): Promise<Roster | null> {
    return this.source.read<Roster>(`rosters/${slug}`);
  }

  rosterIndex(): Promise<RosterIndex | null> {
    return this.source.read<RosterIndex>("rosters/index");
  }

  depthChart(slug: string): Promise<DepthChart | null> {
    return this.source.read<DepthChart>(`depth-charts/${slug}`);
  }

  /** Starters only, flattened — what a team page's "projected starters" needs. */
  async starters(slug: string): Promise<
    Array<{ unit: string; position: string; name: string; stars: number | null }>
  > {
    const chart = await this.depthChart(slug);
    if (!chart) return [];
    const out: Array<{
      unit: string;
      position: string;
      name: string;
      stars: number | null;
    }> = [];
    for (const unit of chart.units) {
      for (const position of unit.positions) {
        const first = position.depth.find((slot) => slot.rank === 1);
        for (const player of first?.players ?? []) {
          out.push({
            unit: unit.unit,
            position: position.position,
            name: player.name,
            stars: player.stars,
          });
        }
      }
    }
    return out;
  }

  /* ------------------------------------------------------------- schedules */

  schedule(slug: string): Promise<Schedule | null> {
    return this.source.read<Schedule>(`schedules/${slug}`);
  }

  seasonSchedule(): Promise<(Envelope & Record<string, unknown>) | null> {
    return this.source.read("schedules/season");
  }

  /** Every game on or after `isoDate`, across all teams, soonest first. */
  async upcomingGames(isoDate: string, limit = 25) {
    const season = await this.seasonSchedule();
    const games = (season?.all_games as Array<Record<string, unknown>>) ?? [];
    return games
      .filter((game) => typeof game.date === "string" && game.date >= isoDate)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .slice(0, limit);
  }

  /* ----------------------------------------------------------------- polls */

  polls(): Promise<Polls | null> {
    return this.source.read<Polls>("polls/latest");
  }

  async poll(which: "ap" | "coaches"): Promise<Poll | null> {
    const polls = await this.polls();
    return polls?.polls.find((entry) => entry.poll === which) ?? null;
  }

  async top25(which: "ap" | "coaches" = "ap"): Promise<PollEntry[]> {
    return (await this.poll(which))?.rankings ?? [];
  }

  /** A team's current rank in each poll, `null` when unranked. */
  async ranksFor(slug: string): Promise<{ ap: PollEntry | null; coaches: PollEntry | null }> {
    const polls = await this.polls();
    const find = (which: "ap" | "coaches") =>
      polls?.polls
        .find((entry) => entry.poll === which)
        ?.rankings.find((row) => row.team_slug === slug) ?? null;
    return { ap: find("ap"), coaches: find("coaches") };
  }

  /* ------------------------------------------------------------------- SOS */

  strengthOfSchedule(season: number | string = 2026): Promise<StrengthOfSchedule | null> {
    return this.source.read<StrengthOfSchedule>(`sos/${season}`);
  }

  async sosFor(slug: string, season: number | string = 2026): Promise<SosTeam | null> {
    const sos = await this.strengthOfSchedule(season);
    return sos?.teams.find((team) => team.slug === slug) ?? null;
  }

  /* -------------------------------------------------------------- coaching */

  coaching(slug: string): Promise<CoachingStaff | null> {
    return this.source.read<CoachingStaff>(`coaching/${slug}`);
  }

  coachingIndex(): Promise<(Envelope & Record<string, unknown>) | null> {
    return this.source.read("coaching/index");
  }

  /* ----------------------------------------------------------------- stats */

  currentSeasonStats(): Promise<(Envelope & Record<string, unknown>) | null> {
    return this.source.read("stats/2026/season");
  }

  historicalIndex(): Promise<HistoricalIndex | null> {
    return this.source.read<HistoricalIndex>("stats/historical/index");
  }

  historicalTeamStats(season: number): Promise<HistoricalTeamSeason | null> {
    return this.source.read<HistoricalTeamSeason>(`stats/historical/team/${season}`);
  }

  historicalIndividualStats(season: number): Promise<HistoricalIndividualSeason | null> {
    return this.source.read<HistoricalIndividualSeason>(
      `stats/historical/individual/${season}`,
    );
  }

  historicalAdvancedStats(season: number): Promise<(Envelope & Record<string, unknown>) | null> {
    return this.source.read(`stats/historical/advanced/${season}`);
  }

  /** One team's season-by-season team stats across every season shipped. */
  async teamHistory(slug: string, seasons?: number[]) {
    const available = seasons ?? (await this.seasons());
    const rows = await Promise.all(
      available.map(async (season) => {
        const file = await this.historicalTeamStats(season);
        const row = file?.teams.find((team) => team.slug === slug);
        return row ? { season, ...row } : null;
      }),
    );
    return rows.filter((row): row is NonNullable<typeof row> => row !== null);
  }

  /** Seasons with historical team stats, newest first. */
  async seasons(): Promise<number[]> {
    const index = await this.historicalIndex();
    return (index?.seasons ?? [])
      .filter((entry) => entry.has_team)
      .map((entry) => entry.season)
      .sort((a, b) => b - a);
  }

  /* -------------------------------------------------------------- injuries */

  injuries(): Promise<InjuryReport | null> {
    return this.source.read<InjuryReport>("injuries/latest");
  }

  async injuriesFor(slug: string) {
    const report = await this.injuries();
    return report?.teams.find((team) => team.slug === slug) ?? null;
  }

  /* ----------------------------------------------------------- aggregation */

  /** Everything one team page needs, fetched concurrently. */
  async teamProfile(slug: string): Promise<TeamProfile | null> {
    const team = await this.team(slug);
    if (!team) return null;
    const [roster, depth_chart, schedule, coaching, sos, poll, injuries, seasons] =
      await Promise.all([
        this.roster(slug),
        this.depthChart(slug),
        this.schedule(slug),
        this.coaching(slug),
        this.sosFor(slug),
        this.ranksFor(slug),
        this.injuriesFor(slug),
        this.seasons(),
      ]);
    return {
      team,
      roster,
      depth_chart,
      schedule,
      coaching,
      sos,
      poll,
      injuries,
      historical_seasons: seasons,
    };
  }

  /**
   * Provenance for a dataset, so a "where did this come from" link can be
   * rendered next to any figure on the site.
   */
  async provenance(path: string): Promise<DatasetMeta | null> {
    const file = await this.source.read<Envelope>(path);
    return file?.meta ?? null;
  }
}

export function createClient(source: DataSource): CfbDataClient {
  return new CfbDataClient(source);
}
