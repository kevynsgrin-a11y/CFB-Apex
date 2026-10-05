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
  assert.equal(slate.filter((game) => game.status === "scheduled").length, 58);
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
  assert.equal(teams.find((team) => team.slug === "fiu")?.record, "2–2");
  assert.equal(
    teams.find((team) => team.slug === "appalachian-state")?.record,
    "3–1",
  );
});

test("the two wrongly excluded FBS games are restored with records and TV", () => {
  const slate = weekGames(games, homepageData.referenceDate);
  const nmsuFiu = slate.find(
    (game) => game.awayTeamId === "new-mexico-state" && game.homeTeamId === "fiu",
  );
  assert.ok(nmsuFiu, "New Mexico State at FIU is on the Week 6 board");
  assert.equal(nmsuFiu?.broadcast, "ESPN2");
  assert.equal(nmsuFiu?.date, "2026-10-07T23:30Z");
  const oduApp = slate.find(
    (game) => game.awayTeamId === "old-dominion" && game.homeTeamId === "appalachian-state",
  );
  assert.ok(oduApp, "Old Dominion at App State is on the Week 6 board");
  assert.equal(oduApp?.broadcast, "ESPN+");
  assert.equal(oduApp?.date, "2026-10-10T17:00Z");
  // Only true FCS-opponent games remain excluded, each with conference-id evidence.
  for (const row of verifiedRefresh?.excludedGames ?? []) {
    assert.ok(row.espn_conference_ids, `${row.name} carries exclusion evidence`);
  }
  assert.equal(verifiedRefresh?.excludedGames?.length, 3);
});

test("October 4 polls carry others receiving votes, movers, debuts and gaps", () => {
  const ap = pollTables.find((poll) => poll.poll === "ap")!;
  const coaches = pollTables.find((poll) => poll.poll === "coaches")!;
  assert.equal(ap.others.length, 10);
  assert.equal(coaches.others.length, 15);
  assert.equal(ap.others[0].team_slug, "kentucky");
  assert.equal(ap.others[0].points, 160);
  assert.equal(coaches.others[0].team_slug, "oklahoma-state");
  assert.equal(coaches.others[0].points, 187);
  const notes = verifiedRefresh?.poll_notes;
  assert.ok(notes, "poll notes published");
  const missouri = notes?.movers_ap.find((row) => row.team_slug === "missouri");
  assert.equal(missouri?.from, 25);
  assert.equal(missouri?.to, 14);
  assert.deepEqual(
    notes?.debuts_ap.map((row) => row.team_slug),
    ["pittsburgh"],
  );
  assert.deepEqual(
    notes?.dropped_out.ap.map((row) => row.team_slug),
    ["kentucky"],
  );
  assert.deepEqual(
    notes?.dropped_out.coaches.map((row) => row.team_slug).sort(),
    ["michigan", "penn-state"],
  );
  const apOnly = notes?.poll_gaps.ap_only.map((row) => row.team_slug).sort();
  assert.deepEqual(apOnly, ["boise-state", "oklahoma-state"]);
  const coachesOnly = notes?.poll_gaps.coaches_only.map((row) => row.team_slug).sort();
  assert.deepEqual(coachesOnly, ["duke", "kentucky"]);
});

test("verified additions: GameDay badge, ranked matchups, NDSU storyline, standings", () => {
  const gameday = verifiedRefresh?.broadcast_events?.find(
    (event) => event.type === "college-gameday",
  );
  assert.ok(gameday, "College GameDay event published");
  assert.equal(gameday?.game_provider_id, "401856712");
  assert.match(gameday?.badge ?? "", /Tuscaloosa/);
  const matchups = verifiedRefresh?.ranked_matchups ?? [];
  assert.ok(matchups.some((row) => /Georgia/.test(row.matchup) && /Alabama/.test(row.matchup)));
  assert.ok(matchups.some((row) => /UCLA/.test(row.matchup) && /Oregon/.test(row.matchup)));
  assert.ok(matchups.some((row) => row.polls.includes("Coaches only") && /Kentucky/.test(row.matchup)));
  assert.ok(
    verifiedRefresh?.storylines?.some((row) => row.id === "ndsu-first-fbs-season"),
  );
  const standings = verifiedRefresh?.retainedBaseline?.conferenceStandings ?? [];
  const sunBelt = standings.find((conf) => conf.slug === "sun-belt");
  assert.ok(sunBelt, "Sun Belt standings table present");
  assert.ok(sunBelt.rows.length >= 10);
  assert.ok(sunBelt.rows.every((row) => row.team_slug), "every Sun Belt row links to a team hub");
  const sec = standings.find((conf) => conf.slug === "sec");
  assert.equal(sec?.rows.find((row) => row.team_slug === "georgia")?.w, "5");
  for (const conf of standings) {
    assert.ok(conf.rows.every((row) => row.team_slug), `${conf.slug} rows all linked`);
  }
});

test("editorial composite follows the documented mean-rank and AP tie break without poll votes", () => {
  const ap = pollTables.find((poll) => poll.poll === "ap")!;
  const coaches = pollTables.find((poll) => poll.poll === "coaches")!;
  const composite = pollTables.find((poll) => poll.poll === "composite")!;
  const rank = (poll: typeof ap, slug: string | null) => poll.rankings.find((row) => row.team_slug === slug)?.rank ?? 26;
  const expected = [...new Set([...ap.rankings, ...coaches.rankings].map((row) => row.team_slug))]
    .sort((a, b) => (rank(ap, a) + rank(coaches, a)) - (rank(ap, b) + rank(coaches, b)) || rank(ap, a) - rank(ap, b));
  assert.deepEqual(composite.rankings.map((row) => row.team_slug), expected);
  assert.ok(composite.rankings.every((row) => row.points == null && row.first_place_votes == null));
});
