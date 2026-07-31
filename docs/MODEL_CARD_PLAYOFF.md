# Model card — playoff simulator

Version: `playoff-2026.3.0-demo`

Purpose: demonstrate version-labeled fictional membership, valid scenario assumptions, seeded Monte Carlo, playoff/bye/title probabilities, and a reproducible URL.

Random draws derive from `seed|iteration|entity|drawType`; array ordering does not share mutable RNG state. Runs are bounded to 1,000–100,000. The UI reports iteration count, maximum Wilson half-width, and whether the configured 0.5 percentage-point precision target converged.

The fixture approximation ranks fictional teams from strength, a two-sided winner/loser adjustment for selected fixture games, and seeded volatility. Scenario selections are validated against each game's participants. It is not a committee forecast and implements only field size, bye count, fixture membership, and version labels—not real eligibility, conference paths, championship rules, tiebreakers, or schedule resolution. Live activation requires official season rules, historical backtests, calibration, immutable snapshots, and compute/rate limits.
