import { coaches, dfsPlayers, games, portalEvents, stadiums, teams } from "../lib/fixtures.ts";

const counts = {
  teams: teams.length,
  games: games.length,
  portalEvents: portalEvents.length,
  coaches: coaches.length,
  dfsPlayers: dfsPlayers.length,
  stadiums: stadiums.length,
};

if (Object.values(counts).some((value) => value === 0)) {
  throw new Error("Fixture pack is incomplete.");
}

console.log("Fixture seed check: PASS", counts);
