import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { calculateBuyout } from "../lib/contracts.ts";
import {
  coaches,
  fantasyNotes,
  games,
  portalAsOf,
  portalEvents,
  preseasonRatings,
  providerHealth,
  scenarioGames,
  stadiums,
  teams,
} from "../lib/cfb-dataset.ts";
import { normalizeForcedOutcomes, runPlayoffSimulation } from "../lib/simulation.ts";

test("transfer portal ledger is complete, sourced, and slug-clean", () => {
  assert.ok(portalEvents.length >= 600, `expected a full portal ledger, got ${portalEvents.length}`);
  assert.match(portalAsOf ?? "", /^\d{4}-\d{2}-\d{2}$/);
  const slugs = new Set(teams.map((team) => team.id));
  for (const event of portalEvents) {
    assert.match(event.eventDate, /^\d{4}-\d{2}-\d{2}$/, event.player);
    assert.ok(event.toTeamId && slugs.has(event.toTeamId), `${event.player}: destination must be a dataset team`);
    // Origins may be external (a handful of FCS move-ins) but must be slugs.
    assert.match(event.fromTeamId, /^[a-z0-9-]+$/, event.player);
    assert.ok(["high", "medium", "low"].includes(event.confidence), event.player);
    assert.ok(event.impact === null, "impact is not modeled for this dataset");
  }
  const external = portalEvents.filter((event) => !slugs.has(event.fromTeamId));
  assert.ok(external.length <= 5, `unexpected number of external origins: ${external.length}`);
});

test("every team lists a head coach and contract data is never fabricated", () => {
  assert.equal(coaches.length, teams.length);
  const withSalary = coaches.filter((coach) => coach.annualSalary > 0);
  assert.ok(withSalary.length >= 60, `expected published salaries for most staffs, got ${withSalary.length}`);
  for (const coach of coaches) {
    if (coach.annualSalary > 0) {
      assert.ok(coach.contractAsOf, `${coach.name}: salary without an as-of date`);
      assert.ok((coach.contractSources ?? []).length > 0, `${coach.name}: salary without sources`);
    } else {
      // Unpublished terms stay zero/blank, never invented.
      assert.equal(coach.guaranteedRemaining, 0, coach.name);
      assert.equal(coach.totalValue ?? 0, 0, coach.name);
    }
  }
  const deBoer = coaches.find((coach) => coach.slug === "kalen-deboer");
  assert.ok(deBoer, "DeBoer contract record missing");
  assert.equal(deBoer.annualSalary, 12_500_000);
});

test("preseason ratings cover all 138 with honest nulls, TV times attach to games", () => {
  assert.equal(Object.keys(preseasonRatings).length, teams.length);
  for (const team of teams) {
    const rating = preseasonRatings[team.id];
    assert.ok(rating, `${team.slug}: missing ratings record`);
    assert.match(rating.as_of, /^\d{4}-\d{2}-\d{2}$/);
    if (rating.sp) {
      assert.ok(typeof rating.sp.rank === "number" && rating.sp.rank >= 1 && rating.sp.rank <= 138, team.slug);
      assert.ok(rating.sp.source.startsWith("http"), `${team.slug}: SP+ without source`);
    }
    if (rating.playoff?.value) assert.match(rating.playoff.value, /^\d+(\.\d+)?%$/, team.slug);
  }
  const alabama = preseasonRatings.alabama;
  assert.equal(alabama.sp?.rank, 13);
  assert.equal(alabama.sp?.overall, 17.6);
  assert.equal(alabama.playoff?.outlet, "ESPN");

  const withBroadcast = games.filter((game) => game.broadcast);
  assert.ok(withBroadcast.length >= 140, `expected TV designations, got ${withBroadcast.length}`);
  const withTime = games.filter((game) => game.kickoffLabel.includes("ET"));
  assert.ok(withTime.length >= 120, `expected kickoff times, got ${withTime.length}`);
  const ak = games.find((game) => game.id === "2026-09-12-alabama-at-kentucky");
  assert.equal(ak?.broadcast, "ABC");
  assert.match(ak?.kickoffLabel ?? "", /3:30 PM ET/);
});

test("fantasy notes are reported-only, slug-clean, and never invent projections", () => {
  assert.ok(fantasyNotes.length >= 200, `expected the Week 1 notes board, got ${fantasyNotes.length}`);
  const slugs = new Set(teams.map((team) => team.id));
  for (const note of fantasyNotes) {
    assert.ok(slugs.has(note.team), `${note.player}: unknown team ${note.team}`);
    assert.ok(["QB", "RB", "WR", "TE"].includes(note.position ?? ""), note.player);
    assert.ok(
      ["active", "questionable", "doubtful", "inactive", "suspended"].includes(note.availability ?? ""),
      `${note.player}: bad availability ${note.availability}`,
    );
    // A projection must always carry its outlet; reported ranks only, no invented points.
    if (note.projection) {
      assert.ok(note.projection.outlet, `${note.player}: projection without an outlet`);
      assert.ok(!/\d+\.\d+ pts/i.test(note.projection.value ?? ""), note.player);
    }
  }
  const smith = fantasyNotes.find((note) => note.player === "Jeremiah Smith");
  assert.equal(smith?.team, "ohio-state");
  assert.equal(smith?.projection?.value, "Week 1 WR rank No. 1");
});

test("affiliate and radio seams stay fail-closed until configured", async () => {
  const { ticketLinksForTeam, ticketAffiliatesConfigured } = await import("../lib/affiliates.ts");
  if (!ticketAffiliatesConfigured) {
    assert.deepEqual(ticketLinksForTeam("Alabama Crimson Tide"), []);
  } else {
    for (const link of ticketLinksForTeam("Alabama Crimson Tide")) {
      assert.match(link.url, /^https:\/\//);
      assert.ok(link.url.includes("url="), "CJ wrapper must encode the destination");
    }
  }
  const { radioStations } = await import("../lib/cfb-dataset.ts");
  assert.ok(Array.isArray(radioStations));
  for (const station of radioStations) {
    assert.match(station.team, /^[a-z0-9-]+$/);
  }
});

test("every program has a gameday guide and broadcasts attach to real games", () => {
  assert.equal(stadiums.length, teams.length);
  const guideTeams = new Set(stadiums.map((stadium) => stadium.teamId));
  for (const team of teams) {
    assert.ok(guideTeams.has(team.id), `${team.slug}: missing gameday guide`);
  }
  for (const stadium of stadiums) {
    assert.ok(stadium.capacity > 0, `${stadium.slug}: capacity missing`);
    assert.ok(stadium.clearBag.length > 10, `${stadium.slug}: clear-bag note missing`);
    assert.match(stadium.lastVerified, /^\d{4}-\d{2}-\d{2}$/, stadium.slug);
  }
  const withBroadcast = games.filter((game) => game.broadcast);
  assert.ok(withBroadcast.length >= 80, `expected broadcast assignments, got ${withBroadcast.length}`);
  for (const game of withBroadcast) {
    assert.ok(typeof game.broadcast === "string" && game.broadcast.length > 0, game.id);
  }
  const alabamaAtKentucky = games.find((game) => game.id === "2026-09-12-alabama-at-kentucky");
  assert.equal(alabamaAtKentucky?.broadcast, "ABC");
});

test("every team carries a verified logo file and a brand color", () => {
  const withLogos = teams.filter((team) => team.logo);
  assert.equal(withLogos.length, teams.length, "all listed teams must have logos");
  const projectRoot = fileURLToPath(new URL("..", import.meta.url));
  for (const team of withLogos) {
    assert.match(team.logo ?? "", /^\/logos\/[a-z0-9-]+\.png$/, team.slug);
    assert.ok(existsSync(`${projectRoot}/public${team.logo}`), `${team.slug}: missing file`);
    assert.match(team.color, /^#[0-9a-f]{6}$/, team.slug);
  }
  for (const slug of ["alabama", "texas", "michigan", "clemson", "florida-state", "notre-dame", "umass"]) {
    assert.ok(withLogos.some((team) => team.slug === slug), `${slug} lost its logo`);
  }
});

test("playoff simulation is deterministic under the same seed", () => {
  const first = runPlayoffSimulation("same-seed", { "scenario-1": teams[0].id }, 2_000);
  const second = runPlayoffSimulation("same-seed", { "scenario-1": teams[0].id }, 2_000);
  assert.deepEqual(first, second);
});

test("different seeds vary and probabilities stay bounded", () => {
  const first = runPlayoffSimulation("seed-a", {}, 2_000);
  const second = runPlayoffSimulation("seed-b", {}, 2_000);
  assert.notDeepEqual(first.results, second.results);
  for (const result of first.results) {
    assert.ok(result.playoff >= 0 && result.playoff <= 1);
    assert.ok(result.bye >= 0 && result.bye <= 1);
    assert.ok(result.title >= 0 && result.title <= 1);
  }
  const titleTotal = first.results.reduce((sum, result) => sum + result.title, 0);
  assert.ok(Math.abs(titleTotal - 1) < 0.001);
});

test("forced outcomes improve the selected team's path", () => {
  const scenario = scenarioGames[2];
  const team = teams.find((candidate) => candidate.id === scenario.homeTeamId)!;
  const opponent = teams.find((candidate) => candidate.id === scenario.awayTeamId)!;
  const baseline = runPlayoffSimulation("force-test", {}, 20_000);
  const forced = runPlayoffSimulation("force-test", { [scenario.id]: team.id }, 20_000);
  const before = baseline.results.find((result) => result.teamId === team.id)!;
  const after = forced.results.find((result) => result.teamId === team.id)!;
  const opponentBefore = baseline.results.find((result) => result.teamId === opponent.id)!;
  const opponentAfter = forced.results.find((result) => result.teamId === opponent.id)!;
  assert.ok(after.playoff > before.playoff);
  // With 138 teams the opponent's expected drop is small; allow sampling
  // noise but never a systematic increase.
  assert.ok(opponentAfter.playoff <= opponentBefore.playoff + 0.02);
});

test("forced outcomes reject nonparticipants and iterations are whole", () => {
  const nonparticipant = teams.find(
    (team) => team.id !== scenarioGames[0].awayTeamId && team.id !== scenarioGames[0].homeTeamId,
  )!;
  assert.deepEqual(normalizeForcedOutcomes({ [scenarioGames[0].id]: nonparticipant.id }), {});
  const result = runPlayoffSimulation("fractional", {}, 1_000.5);
  assert.equal(result.iterations, 1_000);
  assert.ok(Math.abs(result.results.reduce((sum, item) => sum + item.title, 0) - 1) < 0.001);
});

test("buyout applies mitigation without going negative", () => {
  const result = calculateBuyout({
    guaranteedRemaining: 13_000_000,
    mitigationApplies: true,
    estimatedOffset: 2_000_000,
  });
  assert.equal(result.estimatedNet, 11_000_000);
  assert.equal(
    calculateBuyout({
      guaranteedRemaining: 1_000_000,
      mitigationApplies: true,
      estimatedOffset: 2_000_000,
    }).estimatedNet,
    0,
  );
});

test("dataset records are provenance-tagged and never claim live status", () => {
  assert.ok(games.length > 0);
  assert.ok(games.every((game) => game.provenance.dataEnvironment === "production"));
  assert.ok(games.every((game) => game.provenance.licenseClass === "R3_CITED_FACTS"));
  assert.ok(games.every((game) => !game.statusDetail.toLowerCase().includes("live")));
  assert.equal(teams.length, 138);
  // The fixture universe must never leak into the real dataset surfaces.
  const fixtureNames = /red mesa|blue ridge state|north coast|prairie tech|tidewater state|lake union/i;
  assert.ok(teams.every((team) => !fixtureNames.test(team.name)));
  assert.ok(games.every((game) => !fixtureNames.test(game.statusDetail)));
  assert.equal(
    providerHealth.find((provider) => provider.id === "production-sports")?.status,
    "not_configured",
  );
});
