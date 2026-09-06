import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { calculateBuyout } from "../lib/contracts.ts";
import { games, providerHealth, scenarioGames, teams } from "../lib/cfb-dataset.ts";
import { normalizeForcedOutcomes, runPlayoffSimulation } from "../lib/simulation.ts";

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
