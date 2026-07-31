import { games, providerHealth } from "./fixtures";
import type { Game, ProviderHealth } from "./types";

export interface ScoreboardProvider {
  readonly id: string;
  readonly mode: "fixture" | "production";
  getGames(): Promise<Game[]>;
  getHealth(): Promise<ProviderHealth>;
}

export class FixtureScoreboardProvider implements ScoreboardProvider {
  readonly id = "fixture-sports";
  readonly mode = "fixture" as const;

  async getGames() {
    return games;
  }

  async getHealth() {
    const health = providerHealth.find((provider) => provider.id === this.id);
    if (!health) throw new Error(`Missing provider health fixture: ${this.id}`);
    return health;
  }
}

export class UnconfiguredProductionScoreboardProvider implements ScoreboardProvider {
  readonly id = "production-sports";
  readonly mode = "production" as const;

  async getGames() {
    return [];
  }

  async getHealth() {
    const health = providerHealth.find((provider) => provider.id === this.id);
    if (!health) throw new Error(`Missing provider health fixture: ${this.id}`);
    return health;
  }
}

export function createScoreboardProvider() {
  return process.env.DEMO_MODE === "false"
    ? new UnconfiguredProductionScoreboardProvider()
    : new FixtureScoreboardProvider();
}
