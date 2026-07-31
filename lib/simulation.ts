import { scenarioGames, seasonRules, teams } from "./fixtures.ts";
import type { SimulationResult } from "./types";

export type ForcedOutcomes = Record<string, string>;

export function normalizeForcedOutcomes(input: ForcedOutcomes): ForcedOutcomes {
  return Object.fromEntries(
    Object.entries(input).filter(([gameId, winnerId]) => {
      const game = scenarioGames.find((candidate) => candidate.id === gameId);
      return game && (winnerId === game.awayTeamId || winnerId === game.homeTeamId);
    }),
  );
}

function hashToUnit(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

function wilsonHalfWidth(successes: number, total: number) {
  if (total === 0) return 1;
  const z = 1.96;
  const proportion = successes / total;
  const denominator = 1 + (z * z) / total;
  return (
    (z *
      Math.sqrt(
        (proportion * (1 - proportion)) / total + (z * z) / (4 * total * total),
      )) /
    denominator
  );
}

export function runPlayoffSimulation(
  seed: string,
  forcedOutcomes: ForcedOutcomes = {},
  requestedIterations = 20_000,
): SimulationResult {
  const wholeIterations = Number.isFinite(requestedIterations)
    ? Math.trunc(requestedIterations)
    : 20_000;
  const iterations = Math.max(1_000, Math.min(100_000, wholeIterations));
  const counters = teams.map(() => ({ playoff: 0, bye: 0, title: 0, seedSum: 0 }));
  const forcedBonus = new Map<string, number>();

  for (const [gameId, winnerId] of Object.entries(normalizeForcedOutcomes(forcedOutcomes))) {
    const game = scenarioGames.find((candidate) => candidate.id === gameId);
    if (!game) continue;
    const loserId = winnerId === game.awayTeamId ? game.homeTeamId : game.awayTeamId;
    forcedBonus.set(winnerId, (forcedBonus.get(winnerId) ?? 0) + 6);
    forcedBonus.set(loserId, (forcedBonus.get(loserId) ?? 0) - 6);
  }

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const ranked = teams
      .map((team, teamIndex) => {
        const volatility = (hashToUnit(`${seed}|${iteration}|${team.id}|ranking`) - 0.5) * 24;
        return {
          teamIndex,
          teamId: team.id,
          score: team.strength + (forcedBonus.get(team.id) ?? 0) + volatility,
        };
      })
      .sort((left, right) => right.score - left.score);

    const field = ranked.slice(0, seasonRules.playoffTeams);
    field.forEach((entry, seedIndex) => {
      const counter = counters[entry.teamIndex];
      counter.playoff += 1;
      counter.seedSum += seedIndex + 1;
      if (seedIndex < seasonRules.byes) counter.bye += 1;
    });

    const titleWeights = field.map((entry) => Math.exp(entry.score / 18));
    const weightTotal = titleWeights.reduce((sum, value) => sum + value, 0);
    const titleDraw = hashToUnit(`${seed}|${iteration}|title`) * weightTotal;
    let running = 0;
    for (let fieldIndex = 0; fieldIndex < field.length; fieldIndex += 1) {
      running += titleWeights[fieldIndex];
      if (titleDraw <= running) {
        counters[field[fieldIndex].teamIndex].title += 1;
        break;
      }
    }
  }

  const maxHalfWidth = Math.max(
    ...counters.flatMap((counter) => [
      wilsonHalfWidth(counter.playoff, iterations),
      wilsonHalfWidth(counter.bye, iterations),
      wilsonHalfWidth(counter.title, iterations),
    ]),
  );

  return {
    seed,
    iterations,
    converged: maxHalfWidth <= 0.005,
    maxHalfWidth,
    modelVersion: "playoff-2026.3.0-demo",
    results: teams
      .map((team, teamIndex) => {
        const counter = counters[teamIndex];
        return {
          teamId: team.id,
          playoff: counter.playoff / iterations,
          bye: counter.bye / iterations,
          title: counter.title / iterations,
          averageSeed: counter.playoff ? counter.seedSum / counter.playoff : 0,
        };
      })
      .sort((left, right) => right.playoff - left.playoff),
  };
}
