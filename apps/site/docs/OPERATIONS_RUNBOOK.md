# Operations runbook

Daily fixture-beta checks: `https://cfbapex.com/api/health`, `/api/readiness`, apex and `www` TLS/redirect behavior, provider status, error rate, route smoke tests, source age, correction queue, and feature kill switches.

Production activation adds provider quota/circuit health, cache age, ingestion checkpoints, queue lag, cron/job result, simulation saturation, email confirmation/suppression, partner link expiry, ad layout impact, privacy requests, and cost alerts.

Live-game operations additionally watch provider sequence regressions, expected-versus-measured latency, Push heartbeat/reconnect, REST catch-up completeness, unmatched entities, illegal game-state transitions, undocumented score reversals, candidate quarantine rate, publication-version pointer updates, DLQ depth, and source/rights expiry. Provider failover never converts a slower reconciliation feed into an implied equal-latency source.

Kill switches separately freeze ingestion, publication, provider, scoreboard, PBP/stats, polls, portal, coaching, models, odds, ads, affiliates, email send, social output, indexing, and expensive simulation. Freezing publication preserves evidence collection. Health responses never expose secrets. Every consequential edit creates an audit event and retains source/version lineage.
