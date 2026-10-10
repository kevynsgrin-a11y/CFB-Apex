# CFB Apex

A premium, conference-neutral college football utility built with Vinext, Next.js App Router, React, strict TypeScript, and Cloudflare-compatible ESM.

The production site is `https://cfbapex.com`. **Live mode:** since 2026-09-06 (owner sign-off 2026-09-05/06) the site serves the real 2026 FBS dataset — 138 teams, rosters, depth charts, schedules, polls, coaching staffs, and 14 seasons of history — through the build-time dataset integration (`lib/cfb-2026.generated.ts`). Crawler gates are open: robots `Allow: /`, no `noindex` header, and a populated absolute-URL sitemap. A partial “This Week’s Games” widget reads TheSportsDB through the existing server adapter on team hubs. It matches reviewed snapshot identities and preserves verified timing and finals; unknown source observation age means unverified new scores are withheld. It fetches on page load, not continuously.

The product includes scores/schedule, advanced game previews, transfer portal and roster volatility, a playoff simulator, coaching/buyout economics, gated DFS distributions, team/player/conference/stadium routes, source/correction workflows, newsletter development flow, provider health, commercial-policy surfaces, and protected admin access.

Data provenance rules are unchanged: every figure traces to named source documents, `null` means the source published nothing, and no fabricated “live” data is ever rendered. Fixture-era surfaces degrade fail-closed.

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

Copy `.env.example` to a local `.env` only when needed. Never commit secrets. `DEMO_MODE=true` is the safe local default. Production runs with the release gates flipped per `lib/release-readiness.ts` (owner sign-off 2026-09-05/06); provider activation still requires written rights, credentials, legal review, failure tests, and release approval.

See `docs/LOCAL_SETUP.md`, `docs/ARCHITECTURE.md`, `docs/DATA_RIGHTS_AND_PROVENANCE.md`, `docs/MODEL_METHODOLOGY.md`, `docs/SECURITY_RUNBOOK.md`, and `docs/OPERATIONS_RUNBOOK.md`.
