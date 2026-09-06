# CFB Apex

A premium, conference-neutral college football utility preview built with Vinext, Next.js App Router, React, strict TypeScript, and Cloudflare-compatible ESM.

The canonical public fixture beta is `https://cfbapex.com`. It remains globally noindexed and visibly synthetic until the live-data gates are supported by contracts, credentials, verification evidence, staffing, and legal approval.

The product includes fixture-backed scores/schedule, advanced game previews, transfer portal and roster volatility, a seeded playoff simulator, coaching/buyout economics, gated DFS distributions, team/player/conference/stadium routes, source/correction workflows, newsletter development flow, provider health, commercial-policy surfaces, and protected admin access.

All displayed teams, people, games, venues, contracts, and projections are deterministic fictional demonstrations. No live sports, odds, email, affiliate, advertising, map, ticketing, streaming, or image provider is configured.

## Local setup

```powershell
npm.cmd ci
npm.cmd run dev
```

Open `http://localhost:3000`.

## Verification

```powershell
npm.cmd run verify
```

Individual commands include `build`, `typecheck`, `lint`, `test`, `test:integration`, `test:e2e`, `test:a11y`, `test:visual`, `test:links`, `test:seo`, `db:migrate`, `db:seed`, `sync:data`, and `generate:social`.

## Configuration

Copy `.env.example` to a local `.env` only when needed. Never commit secrets. `DEMO_MODE=true` is the safe default. Production provider activation requires written rights, credentials, legal review, failure tests, and release approval.

See `docs/LOCAL_SETUP.md`, `docs/ARCHITECTURE.md`, `docs/DATA_RIGHTS_AND_PROVENANCE.md`, `docs/MODEL_METHODOLOGY.md`, `docs/SECURITY_RUNBOOK.md`, and `docs/OPERATIONS_RUNBOOK.md`.
