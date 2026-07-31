# Operations runbook

Daily preview checks: `/api/health`, `/api/readiness`, provider status, error rate, route smoke tests, source age, correction queue, and feature kill switches.

Production activation adds provider quota/circuit health, cache age, ingestion checkpoints, queue lag, cron/job result, simulation saturation, email confirmation/suppression, partner link expiry, ad layout impact, privacy requests, and cost alerts.

Kill switches: live providers, odds, ads, affiliates, email send, and expensive simulation. Health responses never expose secrets. Every consequential edit creates an audit event and retains source/version lineage.
