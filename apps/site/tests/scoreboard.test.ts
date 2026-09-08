import assert from "node:assert/strict";
import test from "node:test";
import {
  appointmentGames,
  broadcastLabel,
  continuousWeeks,
  defaultScoreboardWeek,
  filterScoreboardGames,
  groupGamesByDate,
} from "../lib/scoreboard.ts";
import type { Game, Team } from "../lib/types.ts";

const provenance = {} as Game["provenance"];

function team(
  id: string,
  options: Partial<Pick<Team, "rank" | "conference" | "subdivision">> = {},
): Team {
  return {
    id,
    slug: id,
    name: id,
    shortName: id,
    abbreviation: id.slice(0, 3).toUpperCase(),
    monogram: id.slice(0, 1).toUpperCase(),
    conference: options.conference ?? "Southeastern Conference",
    subdivision: options.subdivision ?? "P4",
    rank: options.rank,
    record: "1–0",
    color: "#000000",
    strength: 0,
    returningProduction: 0,
    portalImpact: 0,
    playoffProbability: 0,
    provenance,
  };
}

function game(
  id: string,
  week: number,
  date: string,
  awayTeamId: string,
  homeTeamId: string,
  broadcast: string | null = null,
): Game {
  return {
    id,
    week,
    date: `${date}T17:00:00.000Z`,
    kickoffLabel: `Sat · ${date} · 7:30 PM ET`,
    status: "scheduled",
    statusDetail: "Kickoff scheduled",
    awayTeamId,
    homeTeamId,
    venueSlug: homeTeamId,
    venue: "Home stadium",
    city: "",
    broadcast,
    weather: null,
    neutralSite: false,
    modelHomeWinProbability: 0.5,
    modelUncertainty: 0,
    provenance,
  };
}

const teams = [
  team("ranked", { rank: 2 }),
  team("home"),
  team("other", { conference: "Big Ten Conference" }),
  team("fcs", { subdivision: "FCS", conference: "Missouri Valley" }),
];
const games = [
  game("week-one", 1, "2026-09-07", "other", "home", "ESPN"),
  game("ranked-game", 2, "2026-09-12", "ranked", "home", "ABC"),
  game("fcs-game", 2, "2026-09-12", "fcs", "other"),
  game("late-game", 3, "2026-09-19", "other", "home"),
];

test("week selector remains continuous and the next full Saturday is selected", () => {
  assert.deepEqual(continuousWeeks([0, 1, 2, 15]), Array.from({ length: 16 }, (_, index) => index));
  assert.equal(defaultScoreboardWeek(games, "2026-09-08"), 2);
});

test("scoreboard filters use supplied team metadata and favorite ids", () => {
  const week = games.filter((item) => item.week === 2);
  assert.deepEqual(
    filterScoreboardGames({ source: week, teams, filter: "fbs", conference: "", favorites: new Set() }).map((item) => item.id),
    ["ranked-game"],
  );
  assert.deepEqual(
    filterScoreboardGames({ source: week, teams, filter: "top-25", conference: "", favorites: new Set() }).map((item) => item.id),
    ["ranked-game"],
  );
  assert.deepEqual(
    filterScoreboardGames({ source: week, teams, filter: "conference", conference: "Big Ten Conference", favorites: new Set() }).map((item) => item.id),
    ["fcs-game"],
  );
  assert.deepEqual(
    filterScoreboardGames({ source: week, teams, filter: "my-teams", conference: "", favorites: new Set(["home"]) }).map((item) => item.id),
    ["ranked-game"],
  );
});

test("games group by published date and appointment order favors ranked broadcasts", () => {
  assert.deepEqual(groupGamesByDate(games).map((group) => [group.date, group.games.length]), [
    ["2026-09-07", 1],
    ["2026-09-12", 2],
    ["2026-09-19", 1],
  ]);
  assert.equal(appointmentGames(games, teams, 3)[0]?.id, "ranked-game");
});

test("a missing broadcast stays explicitly unassigned", () => {
  assert.equal(broadcastLabel(games[2]), "Network not assigned");
  assert.equal(broadcastLabel(games[1]), "ABC");
});
