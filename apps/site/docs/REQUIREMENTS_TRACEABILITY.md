# Requirements traceability

| Requirement group | Implementation | Evidence | Status |
|---|---|---|---|
| Agent operating system | `AGENTS.md`, `.codex/`, `docs/AGENT_ROSTER.md`, `docs/HANDOFF_PROTOCOL.md` | Repository inspection | Complete |
| Scoreboard and schedule | Catch-all routes, `HubApp`, typed fixtures | Unit, link, rendered HTML, desktop/mobile browser journeys | Complete |
| Portal and volatility | Portal route, filters, comparison states, candid fixture model card | Browser journey + model documentation | Complete (fixture) |
| Playoff simulator | Deterministic simulation, URL scenarios, participant validation, two-sided forcing | Six domain tests + API integration + browser journey | Complete (fixture) |
| Coaching and buyout | Coaching routes, timeline, searchable carousel, buyout calculator | Formula and browser checks | Complete (fixture) |
| DFS projections | Disclosure-gated route with inactive-player zeroing | Domain test + browser journey | Complete (fixture) |
| Team/player/conference/stadium | Dynamic templates with conference slug filtering | Route/link tests + visual QA | Complete (fixture) |
| Provenance and fixture labeling | Synthetic status, visible demo/source/time badges | Contract tests + browser evidence | Complete |
| Clean Mode default | Device-local preference with native disclosure dialog | Keyboard/browser journey | Complete |
| Accessibility | Semantic UI, native modal behavior, focus states, reduced motion | Automated assertions + keyboard browser QA | Complete with manual-screen-reader follow-up |
| SEO | Canonical-domain metadata, structured data, noindex robots, empty sitemap, feeds | SEO and rendered HTML tests | Complete for public fixture beta |
| Ads/CRM/affiliate/social | Inert/provider-neutral fixtures and governance documents | Docs and opt-in journeys | Complete as architecture only |
| Security/operations | Worker headers, request validation/caps, health/readiness, identity/allowlist admin, deployment config/runbooks | Zero high npm audit + integration tests + Wrangler dry run | Complete pending live hostname smoke test |
| Independent release review | Product, data licensing, sports-model audit, then red-team re-review | `docs/BUG_AUDIT.md` and agent handoffs | Complete after final re-review |
| Research-report validation | Primary-source correction and claim quarantine | `docs/RESEARCH_REPORT_AUDIT.md` | Complete for July 31 report |
| Live provider procurement | Common rights/coverage/SLA/pricing questionnaire | `docs/PROVIDER_RFP.md`, `docs/DATA_PROVIDER_MATRIX.md` | Blocked: vendor responses/contracts |
| Live ingestion policy | Canonical transitions, documented correction handling, environment isolation, idempotency material | `lib/live-data.ts`, `tests/live-data.test.ts`, `docs/LIVE_DATA_STRATEGY.md` | Foundation complete; adapters/bindings blocked |
| Public activation controls | Deny-by-default evidence gates and staged runbook | `lib/release-readiness.ts`, `/api/readiness`, `/admin`, `docs/PUBLIC_LAUNCH_RUNBOOK.md` | Complete for pre-deployment gating |
| Replay/shadow pilot | Contracted provider replay and live comparison | Future provider adapters, D1/R2/Queue bindings, pilot artifacts | Blocked: contract/credentials |
| Public fixture URL | CFB Apex branding, Cloudflare Worker config, apex/`www` routes, noindex and live kill switches | `wrangler.deploy.jsonc`, Worker redirect, `docs/DEPLOYMENT_EVIDENCE.md` | Complete |
| Public live-data URL | Licensed, tested, staffed, legal-approved, explicitly authorized release | Public launch runbook and final release evidence | Not authorized |

## October 5 Week 6 refresh

| Requirement | Implementation | Evidence |
|---|---|---|
| Consistent current week | `lib/homepage-data.ts`, verified scoreboard snapshot | `tests/refresh.test.ts`: 56 scheduled and completed Week 5 results, shared ticker |
| Eastern rollover and DST | `lib/game-calendar.ts`, `lib/homepage.ts`, `lib/scoreboard.ts` | Friday UTC rollover and November offset regressions |
| No scheduled duplicate of a final | matchup/week reconciliation in `lib/cfb-dataset.ts` | Penn State–Northwestern and Fresno–Washington State regressions |
| Poll date and Miami entity mapping | reviewed AP/Coaches source boards, ranking copy | October 4 release + Miami ACC test |
| Confirmed cumulative metrics | `components/broadcast/current-metrics.tsx` | NCAA through October 3; 1,851 Atkinson yards |
| Rebuild preserves reviewed results | `scripts/build-dataset.mjs` + verified JSON | Deterministic snapshot build; no provider outage rollback |
| Source honesty | module-specific dates, unpublished records, snapshot labels | Retained portal date and null pregame scores tests |
| Production update | `npm run deploy:production` in `apps/site` | Pending Cloudflare owner credentials and release verification |

| Requirement | Implementation | Evidence |
|---|---|---|
| Full FBS board coverage | audit patch + coverage check in `scripts/build-dataset.mjs` | `tests/refresh.test.ts`: 58 scheduled, both restored games; live check fetched 7/7 days |
| No free-text FCS exclusions | `espn_conference_ids` evidence on every excludedGames row | hermetic build check throws otherwise |
| Poll completeness | others_receiving_votes filled from Oct 4 releases | `tests/refresh.test.ts`: AP 10 / Coaches 15, movers, debuts, gaps, dropouts |
| No stale copy on production pages | forbidden-strings test | `tests/rendered-html.test.mjs` audit test across 6 routes |
| Verified additions render | GameDay badge, storyline, byes names, neutral label | rendered assertions on `/`, game page, `/rankings` |
| Post-deploy multi-surface freshness | `deploy-site.yml` check across home, /rankings, game page | workflow step "Check production Week 6 snapshot across surfaces" |

## October 10 pregame refresh

| Requirement | Implementation | Evidence |
|---|---|---|
| No Friday finals left upcoming | reviewed pregame snapshot + deterministic apply script | refresh tests: five finals, scores, stable Eastern ids, team links |
| Official kickoff changes appear across surfaces | schedule and broadcast snapshot overrides | Rice–ECU 17:00Z; Kansas–Utah 00:00Z next UTC day; rendered game tests |
| Do not imply full data freshness | distinct results/schedule timestamps, retained poll/stat/research cutoffs | source-date tests and visible partial injury-review banner |
| Complete week coverage | all 58 provider ids reviewed, 138 records reconcile | normalized evidence + apply assertions + existing live coverage build check |
