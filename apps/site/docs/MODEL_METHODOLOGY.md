# Model methodology

All preview outputs are deterministic fictional demonstrations, not trained forecasts and not evidence of real-world accuracy.

## Implemented in this preview

- The playoff simulator is implemented in code. It uses fictional team-strength fixtures, deterministic keyed draws, two-sided winner/loser adjustments for valid scenario games, a fixed field size and bye count, bounded integer iterations, and Wilson sampling half-widths. It does not implement real eligibility, conference-champion paths, tiebreakers, committee behavior, or current season rules.
- Portal impact, hot-seat context, matchup estimates, and DFS quantiles are authored fixture values. Their version strings exercise provenance, explanation, and UI contracts; they do not identify trained artifacts. Inactive DFS players are zeroed.
- Contract/buyout math is implemented as a separate deterministic calculator using remaining guarantees and estimated mitigation.

The preview has no training dataset, cutoff enforcement, immutable prediction store, source hash, calibration artifact, or historical backtest. Production activation must add those controls before making accuracy claims.

## Intended production validation contract

Future trained models require expanding time folds, an untouched final-season test, leakage checks, immutable pre-event snapshots, complete artifact identity, documented baselines, and calibration. Candidate metrics include Brier/log loss/reliability for probabilities, MAE/RMSE for margins, and quantile loss/interval coverage for DFS. Those are requirements, not current capabilities.
