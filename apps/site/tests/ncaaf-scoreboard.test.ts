import assert from "node:assert/strict";
import test from "node:test";
import {
  eventInvolvesSchool,
  mapTsdbStatus,
  mergeNcaafFeeds,
  normalizeSchoolName,
  splitTeamWeek,
  tsdbEventToNcaafEvent,
  windowThisWeek,
  type NcaafGameEvent,
  type TsdbRawEvent,
} from "../lib/ncaaf-scoreboard.ts";

const NOW_MS = Date.parse("2026-09-23T18:00:00Z");

function fixture(overrides: Partial<TsdbRawEvent> = {}): TsdbRawEvent {
  return {
    idEvent: "2409-999",
    strTimestamp: "2026-09-26T19:00:00",
    dateEvent: "2026-09-26",
    strTime: "19:00:00",
    strHomeTeam: "Clemson",
    strAwayTeam: "Florida State",
    intHomeScore: null,
    intAwayScore: null,
    strStatus: "NS",
    strPostponed: null,
    strVenue: "Memorial Stadium",
    ...overrides,
  };
}

test("normalizes school names across diacritics, apostrophes, and parentheticals", () => {
  assert.equal(normalizeSchoolName("Hawai'i"), "hawaii");
  assert.equal(normalizeSchoolName("San José State"), "san jose state");
  assert.equal(normalizeSchoolName("Miami (FL)"), "miami fl");
  assert.equal(normalizeSchoolName("ULM"), "ulm");
});

test("alias groups match dataset schools to provider naming without cross-team leaks", () => {
  assert.equal(eventInvolvesSchool({ home: "Southern California", away: "Michigan" }, "USC"), true);
  assert.equal(eventInvolvesSchool({ home: "Miami", away: "Clemson" }, "Miami (FL)"), true);
  assert.equal(eventInvolvesSchool({ home: "Miami (OH)", away: "Clemson" }, "Miami (FL)"), false);
  assert.equal(eventInvolvesSchool({ home: "Louisiana Monroe", away: "Texas" }, "ULM"), true);
  assert.equal(eventInvolvesSchool({ home: "Ohio State", away: "Marshall" }, "Ohio"), false);
  assert.equal(eventInvolvesSchool({ home: "Hawaii", away: "UCLA" }, "Hawai'i"), true);
  assert.equal(eventInvolvesSchool({ home: "San Jose State", away: "Air Force" }, "San José State"), true);
});

test("maps provider statuses onto the compact state vocabulary", () => {
  assert.equal(mapTsdbStatus("NS", null).state, "scheduled");
  assert.equal(mapTsdbStatus("", null).state, "scheduled");
  assert.equal(mapTsdbStatus("FT", null).state, "final");
  assert.equal(mapTsdbStatus("HT", null).state, "halftime");
  assert.equal(mapTsdbStatus("1H", null).state, "live");
  assert.equal(mapTsdbStatus("58'", null).state, "live");
  assert.equal(mapTsdbStatus("PPD", null).state, "postponed");
  assert.equal(mapTsdbStatus("NS", "yes").state, "postponed");
  assert.equal(mapTsdbStatus("CANC", null).state, "canceled");
  assert.equal(mapTsdbStatus("WEIRD", null).state, "other");
  assert.equal(mapTsdbStatus("WEIRD", null).statusLabel, "WEIRD");
});

test("maps raw events to compact shape and drops unusable ones", () => {
  const event = tsdbEventToNcaafEvent(
    fixture({ intHomeScore: "31", intAwayScore: "24", strStatus: "FT" }),
  );
  assert.equal(event?.utc, "2026-09-26T19:00:00Z");
  assert.equal(event?.homeScore, 31);
  assert.equal(event?.awayScore, 24);
  assert.equal(event?.state, "final");
  assert.equal(event?.venue, "Memorial Stadium");

  assert.equal(
    tsdbEventToNcaafEvent(fixture({ strTimestamp: null, dateEvent: "2026-09-26", strTime: null }))?.utc,
    "2026-09-26T00:00:00Z",
  );
  // Garbage timestamps fall back to date+time; only unusable timing drops.
  assert.equal(tsdbEventToNcaafEvent(fixture({ strTimestamp: "not-a-date" }))?.utc, "2026-09-26T19:00:00Z");
  assert.equal(
    tsdbEventToNcaafEvent(fixture({ strTimestamp: "not-a-date", dateEvent: "soon" })),
    null,
  );
  assert.equal(tsdbEventToNcaafEvent(fixture({ idEvent: null })), null);
  assert.equal(tsdbEventToNcaafEvent(fixture({ intHomeScore: "x" }))?.homeScore, null);
});

test("merges next and past feeds with dedupe and kickoff order", () => {
  const events = mergeNcaafFeeds(
    [fixture({ idEvent: "a", strTimestamp: "2026-09-27T00:00:00" })],
    [
      fixture({ idEvent: "a", strTimestamp: "2026-09-27T00:00:00", strStatus: "FT" }),
      fixture({ idEvent: "b", strTimestamp: "2026-09-20T23:00:00" }),
    ],
  );
  assert.deepEqual(
    events.map((event) => event.id),
    ["b", "a"],
  );
  // The past-feed copy carries the final status for the shared id.
  assert.equal(events.find((event) => event.id === "a")?.state, "final");
});

test("windows the week around now and splits team games from the slate", () => {
  const slate: NcaafGameEvent[] = [
    { id: "old", utc: "2026-09-15T00:00:00Z", home: "Clemson", away: "Troy", homeScore: 40, awayScore: 10, state: "final", statusLabel: null, venue: null },
    { id: "recent-final", utc: "2026-09-21T00:00:00Z", home: "Liberty", away: "Coastal Carolina", homeScore: 10, awayScore: 26, state: "final", statusLabel: null, venue: null },
    { id: "team-next", utc: "2026-09-26T19:00:00Z", home: "Clemson", away: "Florida State", homeScore: null, awayScore: null, state: "scheduled", statusLabel: null, venue: null },
    { id: "far-future", utc: "2026-10-10T19:00:00Z", home: "Clemson", away: "Louisville", homeScore: null, awayScore: null, state: "scheduled", statusLabel: null, venue: null },
  ];
  const week = windowThisWeek(slate, NOW_MS);
  assert.deepEqual(
    week.map((event) => event.id),
    ["recent-final", "team-next"],
  );

  const { teamGames, otherGames } = splitTeamWeek(week, "Clemson");
  assert.deepEqual(
    teamGames.map((event) => event.id),
    ["team-next"],
  );
  assert.deepEqual(
    otherGames.map((event) => event.id),
    ["recent-final"],
  );
});
