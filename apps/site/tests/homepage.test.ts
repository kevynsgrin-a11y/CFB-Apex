import assert from "node:assert/strict";
import test from "node:test";
import {
  dateLabel,
  featuredGame,
  kickoffTime,
  playerSlug,
  published,
  weekGames,
  type BroadcastGame,
  type BroadcastTeam,
} from "../lib/homepage.ts";

const teams: BroadcastTeam[] = [
  {
    slug: "away",
    name: "Away",
    shortName: "Away",
    abbreviation: "AWY",
    conference: "SEC",
    rank: 1,
    record: "1–0",
    color: "#f5b942",
  },
  {
    slug: "home",
    name: "Home",
    shortName: "Home",
    abbreviation: "HME",
    conference: "Big Ten",
    rank: 5,
    record: "1–0",
    color: "#66d1e5",
  },
];
const game: BroadcastGame = {
  id: "matchup",
  date: "2026-09-12T17:00:00.000Z",
  kickoffLabel: "Sat · 2026-09-12 · 7:30 PM ET",
  status: "scheduled",
  statusDetail: "Kickoff scheduled",
  awayTeamId: "away",
  homeTeamId: "home",
  venue: "Home stadium",
  broadcast: "ABC",
  neutralSite: false,
};

test("unpublished data is never replaced with zero", () => {
  for (const value of [null, undefined, ""])
    assert.equal(published(value), "Not published");
  assert.equal(published(0), "0");
  assert.equal(published(27), "27");
});

test("kickoff comes only from a published time, not a synthetic date timestamp", () => {
  assert.equal(kickoffTime(game), "7:30 PM ET");
  assert.equal(
    kickoffTime({ ...game, kickoffLabel: "Sat · 2026-09-12" }),
    "Not published",
  );
});

test("weekly slate uses Monday to Sunday UTC boundaries without mutating source", () => {
  const source = [
    game,
    { ...game, id: "before", date: "2026-09-06T23:59:59Z" },
    { ...game, id: "after", date: "2026-09-14T00:00:00Z" },
    { ...game, id: "sunday", date: "2026-09-13T23:59:59Z" },
  ];
  assert.deepEqual(
    weekGames(source, "2026-09-08").map((row) => row.id),
    ["matchup", "sunday"],
  );
  assert.deepEqual(
    source.map((row) => row.id),
    ["matchup", "before", "after", "sunday"],
  );
  assert.deepEqual(weekGames(source, "invalid"), []);
});

test("hero prefers upcoming games and excludes canceled or unknown matchups", () => {
  const canceled = { ...game, id: "canceled", status: "canceled" as const };
  const final = { ...game, id: "final", status: "final" as const };
  const unknown = { ...game, id: "unknown", homeTeamId: "missing" };
  assert.equal(
    featuredGame([canceled, final, unknown, game], teams)?.id,
    "matchup",
  );
  assert.equal(featuredGame([canceled, unknown], teams), undefined);
  assert.equal(featuredGame([], teams), undefined);
});

test("display dates are deterministic and reject invalid values", () => {
  assert.equal(dateLabel("2026-09-12"), "Sat, Sep 12");
  assert.equal(dateLabel("invalid"), "Not published");
});

test("player links follow the existing dataset slug convention", () => {
  assert.equal(playerSlug("Arch Manning"), "arch-manning");
  assert.equal(playerSlug("Ryan Coleman-Williams"), "ryan-colemanwilliams");
});
