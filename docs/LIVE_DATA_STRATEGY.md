# Live data strategy

Status: `GO FOR CONTRACT-INDEPENDENT FOUNDATION AND NONPUBLIC SHADOWING`; `NO-GO FOR PUBLIC LIVE DATA`.

## Outcome standard

No provider can make every value infallible. The enforceable standard is that every published consequential fact has a source, rights class, provider record ID, source/event/fetch times, freshness state, verification state, payload digest, schema version, and supersession lineage. Unknown, stale, disputed, and unavailable are valid product states.

## Procurement stack

1. Send identical core-feed RFPs to Sportradar and SportsDataIO. Compare written rights and live/replay pilot evidence; do not select on marketing language.
2. Request a Genius Sports/NCAA LiveStats coverage and media-rights matrix as an official-channel comparison.
3. Price Stats Perform only if its advanced data justifies its contract constraints and cost.
4. Obtain AP Top 25 rights directly or as an expressly sublicensed named dataset in the core-feed order form.
5. Use NWS for U.S. venue forecasts, observations, and alerts.
6. Keep CollegeFootballData evaluation-only until written commercial display, storage, derivative, and model rights exist.

## Publication pipeline

```text
provider REST/replay/push
  → typed server-only adapter
  → immutable raw artifact in R2 when retention is allowed
  → Queue envelope with provider ID, version, SHA-256 digest, rights metadata
  → schema, entity, time, environment, rights, transition, and score validation
  → normalized D1 candidate or quarantine
  → deterministic or human policy gate
  → immutable publication version
  → atomic active-version pointer update using a D1 batch transaction
  → cache invalidation and source-aware page rendering
```

Cloudflare Queues is at-least-once and may deliver duplicates. Consumers must be idempotent and must not assume ordering. D1 `batch()` provides the transaction boundary for candidate/version/pointer writes. Workflows coordinate replay, reconciliation, correction propagation, and approval waits. Cron initiates scheduled discovery; it is not the live-score transport.

## Streaming placement decision

Start with provider replay and REST on Cloudflare. Prototype the contracted Push stream in an isolated ingestion Worker or Durable Object and measure connection survival, reconnect gaps, runtime-update behavior, CPU, memory, and catch-up time. Push is an accelerator, not a source of complete state; always reconcile from REST.

An external long-lived relay is a conditional fallback, not an approved dependency. Add it only when the pilot demonstrates a Cloudflare lifecycle limitation or the vendor requires networking unsupported by the current runtime. If used, the relay performs minimal framing/reconnect work, stores no canonical state, signs outbound CFB Hub envelopes, and can be removed without changing domain models.

## Canonical lifecycle

Game states are `scheduled`, `pregame`, `in_progress`, `halftime`, `delayed`, `suspended`, `postponed`, `canceled`, `forfeit`, `final_unverified`, `final_verified`, and `corrected`. Provider-native values are retained alongside their canonical mapping.

Score increases are normally monotonic. A score reduction is permitted only with a newer provider version and an explicit play/stat correction reference. Unsupported reversals, illegal state transitions, cross-environment records, unmatched identities, and rights failures enter quarantine.

Final verification freezes an issued view; it does not erase the ability to publish a later corrected version.

## Automation classes

| Class | Examples | Rule |
|---|---|---|
| Deterministic automatic | Licensed score, clock, play, status, schedule payloads | Publish only after rights, schema, identity, sequence, freshness, and transition validation. |
| Reconciled automatic | Standings, schedule/broadcast changes, derived aggregates | Publish only after field-authority rules or an approved reconciliation policy pass. |
| Human approval | Transfers, availability, coaching, contracts, disputed identities, rules changes | Preserve the candidate and source; require an authorized reviewer. |
| Prohibited | Rumors, inferred diagnoses, paywall-derived facts, nonpublic portal data, invented contract terms | Do not ingest into factual or LLM contexts. |

Official polls are eligible for deterministic publication only after the specific poll's display, attribution, retention, and correction rights are recorded.

## Analysis truth kernel

An analysis job reads only an immutable published-version bundle. The bundle includes source IDs, facts, cutoffs, coverage, and uncertainty. Generated prose cannot add a number, personnel claim, diagnosis, quote, or status absent from that bundle. Every derivative stores the input digest, generator/model version, issue time, publication version, approval policy, and correction state.

Previously issued predictions remain immutable. Corrected inputs affect future runs and can produce an explicitly superseding edition.

## Initial operating targets

Targets remain subordinate to contracts and measured provider behavior.

| Data | Candidate cadence | Stale behavior |
|---|---|---|
| Membership/rules | Daily during change windows; weekly otherwise | Block season activation if the authoritative version is missing. |
| Schedules/broadcasts | Six-hourly; hourly within 72h; 5–15m game day | Show last verified value and age. |
| Rosters | Daily preseason; 2–6h game week | Display snapshot time; never infer depth. |
| Polls | Issuer release window plus reconciliation | Keep the prior edition labeled; never fabricate the next edition. |
| Transfers/availability | Source-specific event checks | Expire issuer statuses; keep public claims distinct from licensed portal records. |
| Live state/PBP | Contracted Push or documented REST TTL | Mark stale on measured threshold; never fall back to fixtures. |
| Postgame | Final, +15m, +2h, +24h, +72h, then correction sweeps | Preserve preliminary/final/corrected distinctions. |
| Ratings | After verified final cutoff | Publish version, seed, inputs, interval, and coverage. |

## Environment progression

1. Fixture preview: current owner-only deployment; no providers or durable live records.
2. Provider sandbox/replay: nonpublic, contract-permitted test payloads and isolated bindings.
3. Shadow live: ingest and compare; no public publication.
4. Staff publication: private source/diff views and game-window drills.
5. Limited public scoreboard: text-only marks, licensed core feed, no odds/DFS, progressive indexing.
6. Expanded stats/PBP: after measured reliability and corrections pass.
7. Models/editorial automation: after backtests and truth-kernel review.
8. Odds, DFS, ads, affiliates, newsletters, and automated social: separate approvals only.
