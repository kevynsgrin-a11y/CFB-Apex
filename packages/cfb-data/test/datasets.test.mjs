/**
 * Dataset-level assertions.
 *
 * `tools/etl/validate.py` checks the shape of the data; these check its
 * *meaning* through the reader the site actually uses — that a poll tie is a
 * tie, that a projected depth chart is labelled projected, that a neutral-site
 * game is not a home game, and that the places the sources stop are reported as
 * gaps rather than as zeroes.
 */

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { before, describe, it } from "node:test";

import { CfbDataClient, FileDataSource } from "../dist/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const DIST = join(here, "..", "..", "..", "data", "dist");
const skip = !existsSync(join(DIST, "teams.json")) && "data/dist not built";

describe("datasets", { skip }, () => {
  /** @type {CfbDataClient} */
  let client;
  before(() => {
    client = new CfbDataClient(new FileDataSource(DIST));
  });

  describe("polls", () => {
    it("reproduces the AP poll the document published", async () => {
      const ap = await client.poll("ap");
      assert.ok(ap);
      assert.equal(ap.rankings.length, 25);

      const first = ap.rankings[0];
      assert.equal(first.team_slug, "ohio-state");
      assert.equal(first.points, 1672);
      assert.equal(first.first_place_votes, 40);

      // The document states the first-place votes total 69.
      const votes = ap.rankings.reduce((sum, row) => sum + (row.first_place_votes ?? 0), 0);
      assert.equal(votes, 69);
    });

    it("keeps the BYU / USC tie at No. 14 as a tie", async () => {
      const ap = await client.poll("ap");
      const tied = ap.rankings.filter((row) => row.tied);
      assert.equal(tied.length, 2);
      assert.deepEqual(
        tied.map((row) => row.team_slug).sort(),
        ["byu", "usc"],
      );
      assert.ok(tied.every((row) => row.rank === 14));
    });

    it("resolves every ranked team and every others-receiving-votes team", async () => {
      for (const which of /** @type {const} */ (["ap", "coaches"])) {
        const poll = await client.poll(which);
        for (const row of poll.rankings) {
          assert.ok(row.team_slug, `${which}: unresolved ${row.team}`);
        }
        for (const row of poll.others_receiving_votes) {
          assert.ok(row.team_slug, `${which}: unresolved ${row.team}`);
        }
      }
    });

    it("treats an em dash in the first-place column as zero, not missing", async () => {
      const ap = await client.poll("ap");
      const georgia = ap.rankings.find((row) => row.team_slug === "georgia");
      assert.equal(georgia?.first_place_votes, 0);
    });
  });

  describe("depth charts", () => {
    it("labels a projected chart as projected", async () => {
      const chart = await client.depthChart("clemson");
      assert.equal(chart?.status, "PROJECTED");
      assert.equal(chart?.schemes.offense, "Air Raid");
      assert.equal(chart?.schemes.defense, "4-2-5");
    });

    it("orders the quarterback depth as the source does", async () => {
      const chart = await client.depthChart("clemson");
      const offense = chart.units.find((unit) => unit.unit === "offense");
      const qb = offense.positions.find((position) => position.position === "QB");
      assert.deepEqual(
        qb.depth.map((slot) => slot.players.map((player) => player.name)),
        [["Christopher Vizzina"], ["Tait Reynolds"], ["Trent Pearman"]],
      );
    });

    it("splits co-listed starters into separate players", async () => {
      const chart = await client.depthChart("boston-college");
      assert.equal(chart.status, "OFFICIAL");
      const offense = chart.units.find((unit) => unit.unit === "offense");
      const lt = offense.positions.find((position) => position.position === "LT");
      const starters = lt.depth.find((slot) => slot.rank === 1);
      assert.equal(starters.co_listed, true);
      assert.equal(starters.players.length, 2);
      // Each keeps its own class and hometown rather than sharing one row's.
      const [first, second] = starters.players;
      assert.equal(first.class_raw, "R-So.");
      assert.equal(second.class_raw, "R-Sr.");
      assert.notEqual(first.hometown, second.hometown);
    });

    it("never names a player with a gap marker", async () => {
      const index = await client.source.read("depth-charts/index");
      for (const row of index.teams) {
        const chart = await client.depthChart(row.slug);
        for (const unit of chart.units) {
          for (const position of unit.positions) {
            for (const slot of position.depth) {
              for (const player of slot.players) {
                assert.ok(
                  !["Not listed", "—", "--", "N/A"].includes(player.name),
                  `${row.slug} ${position.position}: player named ${player.name}`,
                );
              }
            }
          }
        }
      }
    });

    it("exposes flattened starters for a team page", async () => {
      const starters = await client.starters("clemson");
      assert.ok(starters.length > 20);
      assert.ok(starters.some((entry) => entry.name === "Christopher Vizzina"));
    });
  });

  describe("schedules", () => {
    it("covers all 138 teams", async () => {
      const index = await client.source.read("schedules/index");
      assert.equal(index.totals.teams, 138);
      assert.deepEqual(index.teams_without_schedule, []);
    });

    it("reads an unprefixed Big Ten opponent as a home game", async () => {
      const schedule = await client.schedule("illinois");
      const uab = schedule.games.find((game) => game.opponent_slug === "uab");
      assert.equal(uab.location, "home");
      const ohioState = schedule.games.find((game) => game.opponent_slug === "ohio-state");
      assert.equal(ohioState.location, "away");
    });

    it("marks a neutral-site game neutral on both teams", async () => {
      const nd = await client.schedule("notre-dame");
      const shamrock = nd.games.find((game) => game.opponent_slug === "wisconsin");
      assert.equal(shamrock.location, "neutral");
      assert.match(shamrock.site ?? "", /Lambeau/);

      const wisconsin = await client.schedule("wisconsin");
      const reverse = wisconsin.games.find((game) => game.opponent_slug === "notre-dame");
      assert.equal(reverse.location, "neutral");
    });

    it("keeps byes as byes and excludes them from the game count", async () => {
      const army = await client.schedule("army");
      const byes = army.games.filter((game) => game.type === "bye");
      assert.equal(byes.length, 3);
      assert.ok(byes.every((game) => game.opponent === null));
      assert.equal(army.counts.games, 12);
    });

    it("reports conference games as null where the source never labelled types", async () => {
      // The ACC / Big Ten / Big 12 / Pac-12 releases carry no Type column, so a
      // count of 0 would falsely say the team plays no conference games.
      const clemson = await client.schedule("clemson");
      assert.equal(clemson.counts.conference_games, null);
      const army = await client.schedule("army");
      assert.equal(army.counts.conference_games, 8);
    });

    it("puts every FBS matchup on both teams' schedules", async () => {
      // The strongest single check on the schedule data: if A's grid lists B,
      // B's grid must list A. It is what caught Pittsburgh's Miami (OH) game
      // being recorded against Miami (FL).
      const teams = await client.teams();
      const opponents = new Map();
      for (const team of teams) {
        const schedule = await client.schedule(team.slug);
        opponents.set(
          team.slug,
          new Set(
            (schedule?.games ?? [])
              .map((game) => game.opponent_slug)
              .filter((slug) => slug !== null),
          ),
        );
      }
      const asymmetric = [];
      for (const [slug, played] of opponents) {
        for (const opponent of played) {
          if (opponents.has(opponent) && !opponents.get(opponent).has(slug)) {
            asymmetric.push(`${slug} lists ${opponent}, but not the reverse`);
          }
        }
      }
      assert.deepEqual(asymmetric, []);
    });

    it("dates every game inside the season window", async () => {
      const season = await client.seasonSchedule();
      for (const game of season.all_games) {
        if (!game.date) continue;
        assert.ok(
          game.date >= "2026-08-01" && game.date <= "2027-02-01",
          `game outside the season: ${game.date}`,
        );
      }
    });
  });

  describe("coaching and schemes", () => {
    it("keeps co-coordinators as separate people", async () => {
      const staff = await client.coaching("clemson");
      assert.equal(staff.head_coach.name, "Dabo Swinney");
      const coOc = staff.staff.filter((member) => member.role_key === "co_oc");
      assert.deepEqual(
        coOc.map((member) => member.name).sort(),
        ["Kyle Richardson", "Matt Luke"],
      );
    });

    it("does not split a person on a semicolon inside their title", async () => {
      // Boston College's OC cell is an explanation containing a ";".
      const staff = await client.coaching("boston-college");
      const oc = staff.staff.filter((member) => member.role_key === "oc");
      assert.equal(oc.length, 1);
      assert.equal(oc[0].name, null);
      assert.match(oc[0].title_raw ?? "", /Not listed as a separate title/);
    });

    it("extracts a scheme only where the source names one", async () => {
      const fsu = await client.coaching("florida-state");
      assert.equal(fsu.schemes.defense.label, "3-3-5");

      const cal = await client.coaching("california");
      assert.equal(cal.schemes.defense.label, null);
      // The explanation is kept rather than a scheme being guessed.
      assert.ok(cal.schemes.defense.description);
      assert.equal(cal.head_coach.first_season, 1);
    });
  });

  describe("strength of schedule", () => {
    it("keeps the four metrics in separate fields", async () => {
      const asu = await client.sosFor("arizona-state");
      assert.equal(asu.espn_fpi_sos_rank, 28);
      assert.equal(asu.espn_fpi_rem_sos_rank, 31);
      assert.equal(asu.espn_fpi_rank, 45);
      assert.equal(asu.phil_steele_rank, 33);
      assert.ok(asu.sources.espn_fpi_sos_rank);
    });

    it("names the teams the package has no SOS for", async () => {
      const index = await client.source.read("sos/index");
      assert.equal(index.teams_without_sos.length, 32);
      assert.ok(index.teams_without_sos.includes("boise-state"));
      assert.equal(await client.sosFor("boise-state"), null);
    });
  });

  describe("statistics", () => {
    it("ships at least the ten seasons the site needs", async () => {
      const seasons = await client.seasons();
      for (const season of [2015, 2018, 2021, 2025]) {
        assert.ok(seasons.includes(season), `missing season ${season}`);
      }
      assert.ok(seasons.length >= 10);
    });

    it("reproduces a team's season totals", async () => {
      const stats = await client.historicalTeamStats(2025);
      const northTexas = stats.teams.find((team) => team.slug === "north-texas");
      assert.equal(northTexas.offense.total["Tot Pts"], 631);
      assert.equal(northTexas.offense.total["TotYds"], 7019);
      assert.equal(northTexas.offense.total["Pts/G"], 45.1);
    });

    it("keeps non-numeric stat values as the source wrote them", async () => {
      const leaders = await client.historicalIndividualStats(2025);
      const passing = leaders.categories.passing_yards.leaders[0];
      assert.equal(passing.player, "Drew Mestemaker");
      assert.equal(passing.team_slug, "north-texas");
      assert.equal(passing.values.Yds, 4369);
      // "84t" is a touchdown-long, not a number.
      assert.equal(passing.values.Lg, "84t");
    });

    it("has all eight Week 0 games and says most teams have none", async () => {
      const index = await client.source.read("stats/2026/index");
      assert.equal(index.results, 8);
      assert.equal(index.games, 8);
      assert.equal(index.teams_with_games.length, 16);
      assert.match(index.coverage_note, /no games played/);
    });

    it("reproduces the Dublin game in full", async () => {
      const game = await client.source.read(
        "stats/2026/games/2026-08-29-north-carolina-vs-tcu",
      );
      assert.equal(game.neutral_site, true);
      assert.equal(game.scoring_plays.length, 6);
      const unc = game.line_score.find((row) => row.team_slug === "north-carolina");
      assert.deepEqual(unc.quarters, [10, 2, 3, 0]);
      assert.equal(unc.final, 15);
      const passers = game.leaders.passing;
      assert.equal(passers.length, 2, "leader rows must not be duplicated");
      assert.equal(passers[0].player, "Billy Edwards Jr.");
      assert.equal(passers[0].values.Yds, "232");
    });
  });

  describe("injuries", () => {
    it("carries the coverage caveat that absence is not health", async () => {
      const index = await client.source.read("injuries/index");
      assert.match(index.coverage_caveat, /conference games/i);
      assert.ok(index.teams_not_covered.length > 100);
    });

    it("does not change a published status", async () => {
      const fsu = await client.injuriesFor("florida-state");
      const markey = fsu.players.find((player) => player.name === "Gavin Markey");
      assert.equal(markey.status_raw, "Doubtful");
      assert.equal(markey.status, "doubtful");
    });
  });

  describe("rosters", () => {
    it("carries the fields a recruiting-facing roster page needs", async () => {
      const roster = await client.roster("clemson");
      const burroughs = roster.players.find((player) => player.name === "Naeem Burroughs");
      assert.equal(burroughs.stars, 4);
      assert.equal(burroughs.position, "WR");
      assert.equal(burroughs.high_school, "The Bolles School");
      assert.equal(burroughs.city, "Jacksonville");
      assert.equal(burroughs.state, "Fla.");
    });

    it("records transfers without leaving them in the school field", async () => {
      const roster = await client.roster("clemson");
      const brown = roster.players.find((player) => player.name === "Colson Brown");
      assert.equal(brown.previous_schools, "Georgia Tech // Anderson");
      assert.equal(brown.high_school, "North Augusta HS");
    });
  });
});
