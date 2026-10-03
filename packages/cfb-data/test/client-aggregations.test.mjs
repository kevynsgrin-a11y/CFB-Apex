/**
 * Derivation and aggregation tests for `CfbDataClient`.
 *
 * These are the client's computed reads: filtering the season game list by date
 * and order, stitching a team's stats across seasons, listing the seasons a
 * team can actually be charted against, and assembling a team page. Two rules
 * are checked throughout, because breaking either produces a confidently wrong
 * number rather than a visible error:
 *
 *   1. A season or a file the dataset does not carry yields a shorter list, not
 *      a zero-filled row and not a throw.
 *   2. Absent provenance stays `null`; the site renders it as "Not listed" and
 *      would otherwise claim a source that never published the figure.
 *
 * Expected values are hand-computed from the fixtures below.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CfbDataClient, DatasetError, MemoryDataSource } from "../dist/index.js";

const client = (entries) => new CfbDataClient(new MemoryDataSource(entries));

/** The whole season in one file, deliberately not in date order. */
const SEASON = {
  meta: { dataset: "schedules", schema_version: "1.0.0", sources: ["test fixture"] },
  all_games: [
    { date: "2026-12-31", opponent_slug: "ohio-state", location: "neutral" },
    { date: "2026-08-29", opponent_slug: "tcu", location: "neutral" },
    { date: null, opponent_slug: null, location: null },
    { date: "2026-09-12", opponent_slug: "florida-state", location: "home" },
    { date: "2026-09-05", opponent_slug: "uab", location: "away" },
    // A source that wrote a date as a number must not be compared as a string.
    { date: 20260919, opponent_slug: "miami-fl", location: "home" },
  ],
};

const HISTORICAL_INDEX = {
  meta: { dataset: "stats", schema_version: "1.0.0", sources: ["test fixture"] },
  seasons: [
    { season: 2021, has_team: true, has_individual: true, has_advanced: true, team_rows: 130, individual_categories: 4, teams_resolved: 130, teams_unresolved: 0 },
    { season: 2024, has_team: true, has_individual: true, has_advanced: false, team_rows: 134, individual_categories: 4, teams_resolved: 134, teams_unresolved: 0 },
    // Individual leaders exist for 2025 but no team table, so it cannot be
    // charted for a team's history and must not appear in the season list.
    { season: 2025, has_team: false, has_individual: true, has_advanced: true, team_rows: 0, individual_categories: 4, teams_resolved: 0, teams_unresolved: 0 },
  ],
};

const TEAM_STATS = {
  2021: {
    meta: { dataset: "stats", schema_version: "1.0.0", sources: ["test fixture"] },
    teams: [
      {
        slug: "clemson",
        team_raw: "Clemson",
        games: 12,
        offense: { total: { "Tot Pts": 473, TotYds: 5021, "Pts/G": 39.4 } },
        defense: { total: { "Tot Pts": 218 } },
      },
      { slug: "ohio-state", team_raw: "Ohio State", games: 13, offense: { total: {} }, defense: { total: {} } },
    ],
  },
  2024: {
    meta: { dataset: "stats", schema_version: "1.0.0", sources: ["test fixture"] },
    teams: [
      {
        slug: "clemson",
        team_raw: "Clemson",
        games: 12,
        offense: { total: { "Tot Pts": 449, TotYds: 4877, "Pts/G": 37.4 } },
        defense: { total: { "Tot Pts": 246 } },
      },
    ],
  },
};

const stats = (entries) => ({
  "stats/historical/index": HISTORICAL_INDEX,
  "stats/historical/team/2021": TEAM_STATS[2021],
  "stats/historical/team/2024": TEAM_STATS[2024],
  ...entries,
});

describe("upcomingGames", () => {
  const dates = (games) => games.map((game) => game.date);
  const cfb = client({ "schedules/season": SEASON });

  it("returns games on or after the given date, soonest first", async () => {
    // From 2026-09-01: the Aug 29 game is past; the null and numeric dates are
    // not comparable, so only the three real ISO dates remain.
    assert.deepEqual(dates(await cfb.upcomingGames("2026-09-01")), [
      "2026-09-05",
      "2026-09-12",
      "2026-12-31",
    ]);
  });

  it("includes a game on the boundary date itself", async () => {
    assert.deepEqual(dates(await cfb.upcomingGames("2026-09-05")), [
      "2026-09-05",
      "2026-09-12",
      "2026-12-31",
    ]);
  });

  it("defaults to 25 games and honours an explicit limit", async () => {
    assert.equal((await cfb.upcomingGames("2026-01-01")).length, 4);
    assert.deepEqual(dates(await cfb.upcomingGames("2026-01-01", 2)), [
      "2026-08-29",
      "2026-09-05",
    ]);
    assert.deepEqual(await cfb.upcomingGames("2026-01-01", 0), []);
  });

  it("returns nothing once every game is in the past", async () => {
    assert.deepEqual(await cfb.upcomingGames("2027-01-01"), []);
  });

  it("leaves the season file in the order the build wrote it", async () => {
    // Sorting in place would corrupt the artifact every other page reads.
    const source = client({ "schedules/season": SEASON });
    await source.upcomingGames("2026-09-01");
    const games = await source.seasonSchedule();
    assert.deepEqual(games.all_games.map((game) => game.date), SEASON.all_games.map((g) => g.date));
  });

  it("reports no games when the season file is absent or carries none", async () => {
    assert.deepEqual(await client({}).upcomingGames("2026-01-01"), []);
    assert.deepEqual(await client({ "schedules/season": { meta: {} } }).upcomingGames("2026-01-01"), []);
  });
});

describe("seasons", () => {
  it("lists only seasons with a team table, newest first", async () => {
    assert.deepEqual(await client(stats()).seasons(), [2024, 2021]);
  });

  it("returns no seasons when the index is missing", async () => {
    assert.deepEqual(await client({}).seasons(), []);
  });
});

describe("teamHistory", () => {
  it("merges a season onto each stat row and drops seasons without the team", async () => {
    const history = await client(stats()).teamHistory("clemson");
    assert.deepEqual(history.map((row) => row.season), [2024, 2021]);
    assert.equal(history[0].offense.total["Tot Pts"], 449);
    assert.equal(history[1].offense.total["Pts/G"], 39.4);
  });

  it("skips a season whose file has no row for the team", async () => {
    // Miami is in neither fixture file: the history is shorter, not zeroed.
    assert.deepEqual(await client(stats()).teamHistory("miami-fl"), []);
  });

  it("honours an explicit season list and its order", async () => {
    const history = await client(stats()).teamHistory("clemson", [2021, 2024]);
    assert.deepEqual(history.map((row) => row.season), [2021, 2024]);
  });

  it("returns nothing for a season the dataset does not ship", async () => {
    assert.deepEqual(await client(stats()).teamHistory("clemson", [2015]), []);
  });
});

describe("strength of schedule and injuries", () => {
  const sos2026 = {
    meta: { dataset: "sos", schema_version: "1.0.0", sources: ["test fixture"] },
    teams: [
      { slug: "clemson", team_raw: "Clemson", espn_fpi_sos_rank: 4, phil_steele_rank: 6 },
      { slug: "ohio-state", team_raw: "Ohio State", espn_fpi_sos_rank: 1, phil_steele_rank: 2 },
    ],
  };
  const sos2025 = {
    meta: { dataset: "sos", schema_version: "1.0.0", sources: ["test fixture"] },
    teams: [{ slug: "clemson", team_raw: "Clemson", espn_fpi_sos_rank: 21, phil_steele_rank: 24 }],
  };
  const injuries = {
    meta: { dataset: "injuries", schema_version: "1.0.0", sources: ["test fixture"] },
    as_of: "2026-09-05",
    teams: [
      { slug: "clemson", team_raw: "Clemson", players: [] },
      { slug: null, team_raw: "Miami (FL)", players: [] },
    ],
  };
  const cfb = client({
    "sos/2026": sos2026,
    "sos/2025": sos2025,
    "injuries/latest": injuries,
  });

  it("finds a team's SOS row and defaults to the 2026 table", async () => {
    const row = await cfb.sosFor("clemson");
    assert.equal(row.espn_fpi_sos_rank, 4);
  });

  it("reads the season it is asked for rather than always the latest", async () => {
    assert.equal((await cfb.sosFor("clemson", 2025)).espn_fpi_sos_rank, 21);
    // The 2025 table has one row, so Ohio State is genuinely absent from it.
    assert.equal(await cfb.sosFor("ohio-state", 2025), null);
  });

  it("returns null for a team the SOS table does not cover", async () => {
    assert.equal(await cfb.sosFor("boise-state"), null);
    assert.equal(await new CfbDataClient(new MemoryDataSource({})).sosFor("clemson"), null);
  });

  it("finds a team's injuries but never an unresolved team row", async () => {
    assert.ok(await cfb.injuriesFor("clemson"));
    assert.equal(await cfb.injuriesFor("miami-fl"), null, "an unresolved slug must not match");
  });
});

describe("provenance", () => {
  it("returns the meta block of an artifact", async () => {
    const cfb = client(stats());
    const meta = await cfb.provenance("stats/historical/index");
    assert.equal(meta.dataset, "stats");
    assert.deepEqual(meta.sources, ["test fixture"]);
  });

  it("returns null for a missing artifact or an artifact with no meta", async () => {
    assert.equal(await client(stats()).provenance("stats/historical/nope"), null);
    assert.equal(await client({ "teams": { teams: [] } }).provenance("teams"), null);
  });
});

describe("teamProfile", () => {
  const cfb = client(
    stats({
      "teams.json": {
        meta: { dataset: "teams", schema_version: "1.0.0", sources: ["test fixture"] },
        teams: [
          {
            slug: "clemson",
            school: "Clemson",
            nickname: "Tigers",
            display_name: "Clemson Tigers",
            conference: "Atlantic Coast Conference",
            conference_slug: "acc",
            conference_short: "ACC",
            division: null,
            football_only: false,
          },
        ],
      },
      "rosters/clemson": { meta: {}, team: { slug: "clemson" }, players: [] },
      "depth-charts/clemson": { units: [] },
      "schedules/clemson": { meta: {}, games: [] },
      "sos/2026": { meta: {}, teams: [{ slug: "clemson", espn_fpi_sos_rank: 4 }] },
    }),
  );

  it("assembles a team page and keeps every optional part nullable", async () => {
    const profile = await cfb.teamProfile("clemson");
    assert.equal(profile.team.school, "Clemson");
    assert.ok(profile.roster, "the roster the fixture supplies is present");
    // No coaching file, poll or injury report in this fixture: those must be
    // null rather than an empty stand-in the page would render as real data.
    assert.equal(profile.coaching, null);
    assert.deepEqual(profile.poll, { ap: null, coaches: null });
    assert.equal(profile.injuries, null);
    assert.equal(profile.sos.espn_fpi_sos_rank, 4);
    assert.deepEqual(profile.historical_seasons, [2024, 2021]);
  });

  it("returns null for a team that is not in the registry", async () => {
    assert.equal(await cfb.teamProfile("red-mesa"), null);
  });
});

describe("DatasetError", () => {
  it("names the missing artifact and the command that builds it", async () => {
    const cfb = client({});
    const error = await cfb.conferences().catch((thrown) => thrown);
    assert.ok(error instanceof DatasetError);
    assert.equal(error.name, "DatasetError");
    assert.match(error.message, /dataset artifact missing: conferences/);
    assert.match(error.message, /python3 tools\/etl\/build\.py/);
  });

  it("carries no fabricated data when an artifact is absent", async () => {
    // The point of the error: the caller learns the dataset is not built rather
    // than receiving an empty conference list it would render as "no leagues".
    await assert.rejects(() => client({}).conferences(), DatasetError);
  });
});
