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

High-frequency live scores require a separately deployable ingestion Worker or contracted push path. Cron/Queues/Workflows provide idempotency, checkpoints, retries, dead-letter handling, and monotonic dataset versions. `waitUntil` is telemetry/cache-warming only.

## Security and cost

Server-only credentials, schema validation, allowlisted redirects, payload/compute caps, provider circuit breakers, no-store admin/API responses, explicit RBAC allowlist, immutable model versions, additive migrations, kill switches, and route-level static rendering bound cost and risk.
