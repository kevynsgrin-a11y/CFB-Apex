/**
 * Typed reader for the CFB Apex 2026 dataset.
 *
 * This is the module the site imports instead of its fixture pack. Everything
 * it returns came from a published source document; nothing is synthesised. Any
 * field the sources left blank arrives as `null`, and the UI is expected to say
 * "Not listed" rather than invent a zero.
 */
/** Thrown when a dataset artifact the site depends on is absent. */
export class DatasetError extends Error {
    constructor(path) {
        super(`dataset artifact missing: ${path}. ` +
            `Run 'python3 tools/etl/build.py' and commit data/dist.`);
        this.name = "DatasetError";
    }
}
export class CfbDataClient {
    source;
    #teams = null;
    #conferences = null;
    constructor(source) {
        this.source = source;
    }
    async #require(path) {
        const value = await this.source.read(path);
        if (value === null) {
            throw new DatasetError(path);
        }
        return value;
    }
    /* ------------------------------------------------------------- registry */
    /** Build manifest: which datasets exist and how much of each. */
    index() {
        return this.#require("index");
    }
    teams() {
        this.#teams ??= this.#require("teams").then((file) => file.teams);
        return this.#teams;
    }
    conferences() {
        this.#conferences ??= this.#require("conferences").then((file) => file.conferences);
        return this.#conferences;
    }
    async team(slug) {
        const teams = await this.teams();
        return teams.find((team) => team.slug === slug) ?? null;
    }
    async teamsByConference(conferenceSlug) {
        const teams = await this.teams();
        return teams.filter((team) => team.conference_slug === conferenceSlug);
    }
    /**
     * Best-effort lookup by any spelling a page might carry in a URL or query.
     * Falls back to a case-insensitive school-name match; returns `null` rather
     * than a wrong team when nothing matches cleanly.
     */
    async findTeam(query) {
        const needle = query.trim().toLowerCase();
        if (!needle)
            return null;
        const teams = await this.teams();
        return (teams.find((team) => team.slug === needle) ??
            teams.find((team) => team.school.toLowerCase() === needle) ??
            teams.find((team) => team.display_name.toLowerCase() === needle) ??
            null);
    }
    /* --------------------------------------------------------------- rosters */
    roster(slug) {
        return this.source.read(`rosters/${slug}`);
    }
    rosterIndex() {
        return this.source.read("rosters/index");
    }
    depthChart(slug) {
        return this.source.read(`depth-charts/${slug}`);
    }
    /** Starters only, flattened — what a team page's "projected starters" needs. */
    async starters(slug) {
        const chart = await this.depthChart(slug);
        if (!chart)
            return [];
        const out = [];
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
    schedule(slug) {
        return this.source.read(`schedules/${slug}`);
    }
    seasonSchedule() {
        return this.source.read("schedules/season");
    }
    /** Every game on or after `isoDate`, across all teams, soonest first. */
    async upcomingGames(isoDate, limit = 25) {
        const season = await this.seasonSchedule();
        const games = season?.all_games ?? [];
        return games
            .filter((game) => typeof game.date === "string" && game.date >= isoDate)
            .sort((a, b) => String(a.date).localeCompare(String(b.date)))
            .slice(0, limit);
    }
    /* ----------------------------------------------------------------- polls */
    polls() {
        return this.source.read("polls/latest");
    }
    async poll(which) {
        const polls = await this.polls();
        return polls?.polls.find((entry) => entry.poll === which) ?? null;
    }
    async top25(which = "ap") {
        return (await this.poll(which))?.rankings ?? [];
    }
    /** A team's current rank in each poll, `null` when unranked. */
    async ranksFor(slug) {
        const polls = await this.polls();
        const find = (which) => polls?.polls
            .find((entry) => entry.poll === which)
            ?.rankings.find((row) => row.team_slug === slug) ?? null;
        return { ap: find("ap"), coaches: find("coaches") };
    }
    /* ------------------------------------------------------------------- SOS */
    strengthOfSchedule(season = 2026) {
        return this.source.read(`sos/${season}`);
    }
    async sosFor(slug, season = 2026) {
        const sos = await this.strengthOfSchedule(season);
        return sos?.teams.find((team) => team.slug === slug) ?? null;
    }
    /* -------------------------------------------------------------- coaching */
    coaching(slug) {
        return this.source.read(`coaching/${slug}`);
    }
    coachingIndex() {
        return this.source.read("coaching/index");
    }
    /* ----------------------------------------------------------------- stats */
    currentSeasonStats() {
        return this.source.read("stats/2026/season");
    }
    historicalIndex() {
        return this.source.read("stats/historical/index");
    }
    historicalTeamStats(season) {
        return this.source.read(`stats/historical/team/${season}`);
    }
    historicalIndividualStats(season) {
        return this.source.read(`stats/historical/individual/${season}`);
    }
    historicalAdvancedStats(season) {
        return this.source.read(`stats/historical/advanced/${season}`);
    }
    /** One team's season-by-season team stats across every season shipped. */
    async teamHistory(slug, seasons) {
        const available = seasons ?? (await this.seasons());
        const rows = await Promise.all(available.map(async (season) => {
            const file = await this.historicalTeamStats(season);
            const row = file?.teams.find((team) => team.slug === slug);
            return row ? { season, ...row } : null;
        }));
        return rows.filter((row) => row !== null);
    }
    /** Seasons with historical team stats, newest first. */
    async seasons() {
        const index = await this.historicalIndex();
        return (index?.seasons ?? [])
            .filter((entry) => entry.has_team)
            .map((entry) => entry.season)
            .sort((a, b) => b - a);
    }
    /* -------------------------------------------------------------- injuries */
    injuries() {
        return this.source.read("injuries/latest");
    }
    async injuriesFor(slug) {
        const report = await this.injuries();
        return report?.teams.find((team) => team.slug === slug) ?? null;
    }
    /* ----------------------------------------------------------- aggregation */
    /** Everything one team page needs, fetched concurrently. */
    async teamProfile(slug) {
        const team = await this.team(slug);
        if (!team)
            return null;
        const [roster, depth_chart, schedule, coaching, sos, poll, injuries, seasons] = await Promise.all([
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
    async provenance(path) {
        const file = await this.source.read(path);
        return file?.meta ?? null;
    }
}
export function createClient(source) {
    return new CfbDataClient(source);
}
//# sourceMappingURL=client.js.map