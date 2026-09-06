import { coaches, games, portalEvents, stadiums, teams } from "../lib/cfb-dataset.ts";

const counts = {
  teams: teams.length,
  games: games.length,
  portalEvents: portalEvents.length,
  coaches: coaches.length,
  stadiums: stadiums.length,
};

// Portal and stadium surfaces are intentionally empty in the 2026 research
// dataset; teams, games, and coaches must always be present.
if (counts.teams === 0 || counts.games === 0 || counts.coaches === 0) {
  throw new Error("Dataset pack is incomplete.");
}

console.log("Dataset seed check: PASS", counts);
