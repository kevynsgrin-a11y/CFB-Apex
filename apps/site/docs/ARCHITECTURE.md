# Architecture

## Current preview

One Vinext/Next.js App Router application deploys as Cloudflare-compatible ESM. The app is intentionally modular:

`route/server component → typed service/provider → fixture/live adapter → provenance-bearing view model → server-rendered UI + small client interaction islands`

Core boundaries:

- `lib/config.ts`: brand, environment, navigation, disclosure version.
- `lib/types.ts`: domain and provenance contracts.
- `lib/fixtures.ts`: deterministic fictional records.
- `lib/providers.ts`: typed fixture and unconfigured production adapters.
- `lib/simulation.ts`, `lib/contracts.ts`: pure bounded domain logic.
- `components/`: reusable source-aware UI.
- `app/api/`: health, readiness, providers, and bounded simulation.

## Persistence

The preview needs no durable database: preferences are device-local; newsletter/corrections are session demonstrations. D1 stays undeclared until durable records are required. Future D1 stores normalized snapshots, provenance, correction cases, subscriptions, audit events, and scenario history. R2 is reserved for licensed documents/assets only.

## Cache and failure

No production provider call occurs during public rendering. A live release will render normalized last-known-good snapshots with source age and license-aware retention. Production outages never fall back to fixtures. Personalized/admin responses are not publicly cached.

## Future ingestion

The contracted adapter writes immutable raw artifacts when retention permits, then emits an idempotent Queue envelope. Consumers validate rights, schema, identity, environment, provider sequence, game-state transitions, and score corrections before writing a D1 candidate. Approved changes create an immutable publication version and update the active pointer in a D1 batch transaction. Fixtures never share bindings, IDs, queues, caches, or analytics with sandbox/shadow/production.

Cron starts scheduled discovery only. Workflows coordinate replay, reconciliation, approval, and correction propagation. Push accelerates live events but is reconciled with REST because the current Sportradar Push product is non-stateful and does not carry all status changes.

Current Cloudflare documentation does not justify precommitting to an external stream relay: HTTP-triggered Workers have no hard wall-time limit while connected. Prototype the contracted stream in an isolated Worker or Durable Object, measure reconnect/runtime-update behavior, and introduce a minimal external relay only if the pilot or vendor networking requirements demonstrate the need. `waitUntil` remains telemetry/cache-warming only.

## Security and cost

Server-only credentials, schema validation, allowlisted redirects, payload/compute caps, provider circuit breakers, no-store admin/API responses, explicit RBAC allowlist, immutable model versions, additive migrations, kill switches, and route-level static rendering bound cost and risk.
