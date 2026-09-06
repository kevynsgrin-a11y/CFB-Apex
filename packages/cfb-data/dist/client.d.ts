/**
 * Typed reader for the CFB Apex 2026 dataset.
 *
 * This is the module the site imports instead of its fixture pack. Everything
 * it returns came from a published source document; nothing is synthesised. Any
 * field the sources left blank arrives as `null`, and the UI is expected to say
 * "Not listed" rather than invent a zero.
 */
import type { CoachingStaff, Conference, DatasetMeta, DepthChart, Envelope, HistoricalIndex, HistoricalIndividualSeason, HistoricalTeamSeason, InjuryReport, Poll, PollEntry, Polls, Roster, RosterIndex, Schedule, SosTeam, StrengthOfSchedule, Team, TeamProfile } from "./types.js";
import type { DataSource } from "./source.js";
export interface DatasetIndex extends Envelope {
    datasets: Record<string, {
        counts: Record<string, number>;
        artifacts: number;
    }>;
    team_count: number;
    missing_parsers: string[];
    warning_count: number;
}
/** Thrown when a dataset artifact the site depends on is absent. */
export declare class DatasetError extends Error {
    constructor(path: string);
}
export declare class CfbDataClient {
    #private;
    readonly source: DataSource;
    constructor(source: DataSource);
    /** Build manifest: which datasets exist and how much of each. */
    index(): Promise<DatasetIndex>;
    teams(): Promise<Team[]>;
    conferences(): Promise<Conference[]>;
    team(slug: string): Promise<Team | null>;
    teamsByConference(conferenceSlug: string): Promise<Team[]>;
    /**
     * Best-effort lookup by any spelling a page might carry in a URL or query.
     * Falls back to a case-insensitive school-name match; returns `null` rather
     * than a wrong team when nothing matches cleanly.
     */
    findTeam(query: string): Promise<Team | null>;
    roster(slug: string): Promise<Roster | null>;
    rosterIndex(): Promise<RosterIndex | null>;
    depthChart(slug: string): Promise<DepthChart | null>;
    /** Starters only, flattened — what a team page's "projected starters" needs. */
    starters(slug: string): Promise<Array<{
        unit: string;
        position: string;
        name: string;
        stars: number | null;
    }>>;
    schedule(slug: string): Promise<Schedule | null>;
    seasonSchedule(): Promise<(Envelope & Record<string, unknown>) | null>;
    /** Every game on or after `isoDate`, across all teams, soonest first. */
    upcomingGames(isoDate: string, limit?: number): Promise<Record<string, unknown>[]>;
    polls(): Promise<Polls | null>;
    poll(which: "ap" | "coaches"): Promise<Poll | null>;
    top25(which?: "ap" | "coaches"): Promise<PollEntry[]>;
    /** A team's current rank in each poll, `null` when unranked. */
    ranksFor(slug: string): Promise<{
        ap: PollEntry | null;
        coaches: PollEntry | null;
    }>;
    strengthOfSchedule(season?: number | string): Promise<StrengthOfSchedule | null>;
    sosFor(slug: string, season?: number | string): Promise<SosTeam | null>;
    coaching(slug: string): Promise<CoachingStaff | null>;
    coachingIndex(): Promise<(Envelope & Record<string, unknown>) | null>;
    currentSeasonStats(): Promise<(Envelope & Record<string, unknown>) | null>;
    historicalIndex(): Promise<HistoricalIndex | null>;
    historicalTeamStats(season: number): Promise<HistoricalTeamSeason | null>;
    historicalIndividualStats(season: number): Promise<HistoricalIndividualSeason | null>;
    historicalAdvancedStats(season: number): Promise<(Envelope & Record<string, unknown>) | null>;
    /** One team's season-by-season team stats across every season shipped. */
    teamHistory(slug: string, seasons?: number[]): Promise<{
        slug: string | null;
        team_raw: string;
        games: number | null;
        offense: Record<string, Record<string, number | string | null>>;
        defense: Record<string, Record<string, number | string | null>>;
        season: number;
    }[]>;
    /** Seasons with historical team stats, newest first. */
    seasons(): Promise<number[]>;
    injuries(): Promise<InjuryReport | null>;
    injuriesFor(slug: string): Promise<{
        slug: string | null;
        team_raw: string;
        conference_slug: import("./types.js").ConferenceSlug | null;
        opponent_context: string | null;
        players: import("./types.js").InjuryEntry[];
    } | null>;
    /** Everything one team page needs, fetched concurrently. */
    teamProfile(slug: string): Promise<TeamProfile | null>;
    /**
     * Provenance for a dataset, so a "where did this come from" link can be
     * rendered next to any figure on the site.
     */
    provenance(path: string): Promise<DatasetMeta | null>;
}
export declare function createClient(source: DataSource): CfbDataClient;
