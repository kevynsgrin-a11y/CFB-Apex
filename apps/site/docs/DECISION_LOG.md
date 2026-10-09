# Decision log

## D-001 — Preserve the Sites Vinext foundation

The empty workspace was initialized with the bundled Cloudflare-compatible Vinext/Next.js starter. This satisfies the preview-hosting constraint without introducing a second framework.

## D-002 — Fixture-first vertical slices

Priority 1–5 experiences will be functional against deterministic typed fixtures before any credentialed adapter is enabled. Live adapters remain typed external dependencies.

## D-003 — Single application with modular domain boundaries

The MVP remains one deployable web app with `lib` and component boundaries rather than a monorepo. This minimizes operational overhead while preserving clean provider, simulation, analytics, and configuration interfaces.

## D-004 — Fictional neutral programs in demo mode

The preview uses clearly invented teams, coaches, players, and destinations. This avoids representing stale synthetic values as facts and avoids unlicensed marks.

## D-005 — Runtime-aligned agent concurrency

Agent concurrency is capped at four because the current environment exposes four slots. Parallel discovery and audit work is read-heavy; write-heavy ownership is sequenced.

## D-006 — Synthetic provenance is a first-class status

Demonstration records use `synthetic`, not `official` or implied-live language. Model cards state exactly which deterministic transforms exist and which validation work does not.

## D-007 — Native disclosure dialog

Odds and DFS remain opt-in. The disclosure uses the browser's native modal semantics for focus containment, Escape handling, and focus restoration while keeping Clean Mode as the default.

## D-008 — Private preview boundary

The release is deployed only through authenticated private Sites hosting. Public launch is a separate decision that requires licensed providers, distributed rate limiting, production load testing, tighter CSP, and legal approval.

## D-009 — Supported dependency baseline

The release uses patched Next/React/Vite/Cloudflare dependencies and Biome for the lint gate. Overrides pin audited transitive packages where upstream ranges otherwise resolve vulnerable versions.

## D-010 — Research report requires primary-source audit

The supplied Gemini report is retained as discovery input only. Material CFP, membership, SportsDataIO, Cloudflare streaming, authentication, cost, and model claims are corrected or quarantined in `docs/RESEARCH_REPORT_AUDIT.md` before they can influence code or public content.

## D-011 — Provider procurement remains competitive

Sportradar is the leading core-feed RFP candidate and SportsDataIO the leading reconciliation candidate, but neither is selected until a signed rights matrix, SLA, coverage response, quote, and replay/live pilot are compared. AP polling rights and NWS weather are separate source decisions.

## D-012 — Cloudflare-first stream pilot

Do not precommit to AWS, Fly.io, or another relay. Test the contracted streaming feed in an isolated Cloudflare Worker or Durable Object, always reconcile through REST, and add a minimal external relay only if measured lifecycle or vendor networking requirements demand it.

## D-013 — Deny-by-default public activation

Production readiness is represented by explicit evidence gates in `lib/release-readiness.ts`, `/api/readiness`, and the protected admin console. Flags record approvals but do not substitute for contracts or tests. Worker-level noindex remains hard-coded until an explicitly authorized public release changes it.

## D-014 — Public fixture beta on CFB Apex

Deploy the verified fixture application to the Cloudflare Worker custom domains `cfbapex.com` and `www.cfbapex.com`, with the latter returning a permanent redirect to the apex. The public URL authorization changes hosting scope only: fixture labels, global noindex, live-provider and commercial kill switches, and the live-launch evidence gates remain enforced. Wrangler deployment uses the reproducible `wrangler.deploy.jsonc` artifact configuration; Cloudflare creates the custom-domain DNS records and certificates.

## D-2026-10-05 — Reviewed Week 6 source snapshot

Use `data/cfb-2026/refresh/verified-refresh.json` for Week 6 (October 5–11). It includes 51 newly confirmed Saturday finals, 56 upcoming FBS-vs-FBS games, October 4 AP/Coaches polls, an editorial composite recomputed from those polls, and NCAA leaders through October 3. Five FBS-vs-FCS games across the queried dates are recorded separately because the current UI supports FBS vs FBS. Retain historical results and archived standings/injuries with their original dates. Builds use this reviewed snapshot deterministically; replace it after source review for the next refresh.

Reconcile with main fb81b49 to preserve the independently published Saturday board, ratings comparison and ingest-first scoreboard. Current ratings are retained with their own cutoff; their Week 6 accuracy has not been independently confirmed. The new `.github/workflows/deploy-site.yml` verifies pull requests and publishes the verified frontend on main using the existing Cloudflare repository secrets. Missing secrets fail explicitly; a post-deploy check confirms the exact snapshot timestamp. Local credentials remain unavailable.

## D-2026-10-05 — Startup CPU remediation

The production publish reached Cloudflare using the repository secrets but failed error 10021 (startup CPU limit). Reuse Eastern calendar ICU formatters and a bounded date cache rather than constructing a formatter in every matchup reconciliation scan. Preserve date and DST behavior and rerun the complete release checks before retrying production.

## D-2026-10-05 — Week 6 verification-audit corrections

An independent audit of the October 5 snapshot found two real FBS games (New Mexico State at FIU, Wed Oct 7; Old Dominion at App State, Sat Oct 10) wrongly excluded as "FBS–FCS": both schools sit in FBS conferences (ESPN conference ids 12/CUSA and 37/Sun Belt), but their ESPN display names ("App State Mountaineers", "Florida International Panthers") did not resolve in the slug map. `scripts/apply-week6-audit.mjs` restores both games with records (FIU 2–2, App State 3–1), fills AP/Coaches others-receiving-votes from the October 4 releases, re-pulls conference standings with a fixed alias layer (Sun Belt divisions flattened; all 138 rows slug-linked), and publishes the verified additions (College GameDay badge, AP movers, poll gaps, ranked-vs-ranked set, NDSU storyline). The board is 58 FBS-vs-FBS games. `scripts/build-dataset.mjs` now carries the ESPN-name aliases, a two-layer coverage check (hermetic exclusion evidence + live week-board coverage, enforced in CI), and the post-deploy probe extends to /rankings and a game page. Runner pinned to ubuntu-24.04 with checkout/setup-node v5 ahead of the October 19 Ubuntu 26 rollover.

## D-2026-10-09 — Week 6 midweek finals refresh

`scripts/apply-week6-midweek-finals.mjs` moves the seven Tue–Thu Week 6 games (Troy–Southern Miss Oct 6; Jacksonville State–Kennesaw State and New Mexico State–FIU Oct 7; Liberty–Sam Houston, WKU–Missouri State, UTSA–South Florida, South Alabama–Arkansas State Oct 8) from `scheduledGames` to `playedGames` only after ESPN's game summary reports them completed. Each move asserts home/away orientation, line-score totals and an unchanged Eastern game date, and keeps the scheduled row's ids. Records for the 14 teams are advanced by result and must equal ESPN's post-game records. The remaining 51 rows are re-checked against ESPN and stamped with their own `verified_at`; the only accepted difference, Hawai'i at Arizona State, moves to 02:30Z (7:30 PM MST) because the Arizona State schedule agrees with ESPN.

Conference standings are re-read using ESPN's "vs. Conf." split. The October 5 re-pull wrote overall wins into W and a hard-coded 0 into L for every league (live /rankings showed, for example, South Florida "4–0" alongside a .500 league percentage); tests now require W/L to fit inside each team's overall record. Freshness stays per source: the base snapshot time (`retrieved_at`), poll release (Oct 4), NCAA leaders (through Oct 3) and injuries (Oct 5) keep their own cutoffs; `results_verified_at` and a `refresh_log` entry with per-source evidence record the Oct 9 verification. Finals render with "Final details" instead of "Preview". Evidence for the hand checks is in `data/cfb-2026/refresh/evidence/2026-10-09-midweek.json`.
