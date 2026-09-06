import { games, providerHealth } from "./cfb-dataset";
import type { Game, ProviderHealth } from "./types";

export interface ScoreboardProvider {
  readonly id: string;
  readonly mode: "fixture" | "production";
  getGames(): Promise<Game[]>;
  getHealth(): Promise<ProviderHealth>;
}

/**
 * Serves the vendored 2026 research dataset: week-0/1 finals plus the
 * remainder of the schedule, updated with each dataset release.
 */
export class DatasetScoreboardProvider implements ScoreboardProvider {
  readonly id = "cfb-apex-dataset";
  readonly mode = "production" as const;

  async getGames() {
    return games;
  }

  async getHealth() {
    const health = providerHealth.find((provider) => provider.id === this.id);
    if (!health) throw new Error(`Missing provider health entry: ${this.id}`);
    return health;
  }
}

/** Kept for local fixture-only development against `lib/fixtures`. */
export class FixtureScoreboardProvider implements ScoreboardProvider {
  readonly id = "fixture-sports";
  readonly mode = "fixture" as const;

  async getGames() {
    return games;
  }

  async getHealth() {
    const health = providerHealth.find((provider) => provider.id === this.id);
    if (!health) throw new Error(`Missing provider health entry: ${this.id}`);
    return health;
  }
}

export function createScoreboardProvider() {
  return new DatasetScoreboardProvider();
}
