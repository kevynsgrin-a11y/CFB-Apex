import assert from "node:assert/strict";
import test from "node:test";
import {
  easternDate,
  easternKickoff,
  gameKey,
  seasonWeek,
} from "../lib/game-calendar.ts";
import {
  games,
  pollTables,
  teams,
  verifiedRefresh,
} from "../lib/cfb-dataset.ts";
import { homepageData, tickerGames } from "../lib/homepage-data.ts";
import { dateLabel, featuredGame, weekGames } from "../lib/homepage.ts";

test("Eastern dates keep Friday finals and late Saturday games on the correct day", () => {
  assert.equal(easternDate("2026-10-03T00:00Z"), "2026-10-02");
  assert.match(dateLabel("2026-10-03T00:00Z"), /Fri, Oct 2/);
  assert.equal(easternDate("2026-10-04T03:59Z"), "2026-10-03");
  assert.equal(seasonWeek("2026-10-03T00:00Z"), 5);
  assert.equal(seasonWeek("2026-10-03T19:30Z"), 5);
  assert.equal(
    easternKickoff("2026-10-03", "11:00"),
    "2026-10-03T15:00:00.000Z",
  );
  assert.equal(
    easternKickoff("2026-11-07", "12:00"),
    "2026-11-07T17:00:00.000Z",
  );
});

test("the weekly board and ticker share the verified Week 6 snapshot", () => {
  const slate = weekGames(games, homepageData.referenceDate);
  assert.equal(slate.filter((game) => game.status === "final").length, 0);
  assert.equal(slate.filter((game) => game.status === "scheduled").length, 56);
  assert.equal(
    new Set(
      slate.map((game) => gameKey(game.date, game.awayTeamId, game.homeTeamId)),
    ).size,
    slate.length,
  );
  assert.equal(tickerGames.filter((game) => game.status === "final").length, 0);
  assert.ok(
    tickerGames.some((game) => game.awayTeamId === "southern-miss"),
  );
  assert.ok(slate.every((game) => games.find((row) => row.id === game.id)?.week === 6));
  assert.ok(
    tickerGames.every((game) => slate.some((row) => row.id === game.id)),
  );
  assert.equal(featuredGame(slate, teams)?.id, "2026-10-10-georgia-at-alabama");
});

test("published assignments override stale dates without duplicate scheduled finals", () => {
  const slate = weekGames(games, "2026-10-03");
  assert.equal(slate.length, 56);
  assert.ok(slate.every((game) => game.status === "final"));
  assert.equal(
    slate.filter(
      (game) =>
        game.awayTeamId === "penn-state" && game.homeTeamId === "northwestern",
    ).length,
    1,
  );
  assert.equal(
    slate.find((game) => game.awayTeamId === "memphis")?.date,
    "2026-10-03T15:00Z",
  );
  assert.equal(
    slate.filter(
      (game) =>
        game.awayTeamId === "fresno-state" &&
        game.homeTeamId === "washington-state",
    ).length,
    1,
  );
  assert.ok(
    slate
      .filter((game) => game.status === "scheduled")
      .every((game) => game.homeScore == null && game.awayScore == null),
  );
});

test("source dates and unknown records remain honest while Miami resolves to ACC", () => {
  const miami = pollTables
    .find((poll) => poll.poll === "ap")
    ?.rankings.find((row) => row.rank === 4);
  assert.equal(miami?.team_slug, "miami-fl");
  assert.equal(
    teams.find((team) => team.slug === miami?.team_slug)?.conference,
    "Atlantic Coast Conference",
  );
  assert.equal(homepageData.portalAsOf, "2026-09-07");
  assert.equal(verifiedRefresh?.metrics.through_games, "2026-10-03");
  assert.equal(
    verifiedRefresh?.metrics.categories[0].rows.find(
      (row) => row.name === "Kevin Jennings",
    )?.value,
    1588,
  );
  assert.equal(teams.find((team) => team.slug === "penn-state")?.record, "3–2");
  assert.equal(
    teams.find((team) => team.slug === "fiu")?.record,
    "Not published",
  );
});
