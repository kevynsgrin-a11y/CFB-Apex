# Core college-football data RFP

Send the same questionnaire to Sportradar, SportsDataIO, Genius Sports, and Stats Perform. A marketing answer does not satisfy a contractual gate; requested rights and service levels must appear in the order form, SLA, or incorporated exhibit.

## Intended properties and uses

College Football Hub expects a public U.S. website, private administration surfaces, server-side ingestion, normalized storage, SEO-indexable pages, original derived metrics/models, source-linked analysis, cache/CDN delivery, and possible advertising. Email, social/OG cards, widgets, exports, odds/DFS, affiliates, and partner distribution are excluded unless individually approved.

## Required response

1. List every FBS, FCS, bowl, conference-championship, CFP, neutral-site, and non-Division-I matchup coverage class. State which receive score-only, extended box score, full box score, live game state, play-by-play, and player participation.
2. State every condition that can downgrade coverage before or during a game and how the change is communicated.
3. Provide measured and guaranteed latency for score, clock/status, play, team stats, player stats, final, and corrected final. Define the measurement origin.
4. Document REST TTLs, quotas, QPS, concurrent connections, Push/webhook behavior, heartbeats, reconnect, sequence/version fields, catch-up procedure, and change logs.
5. Provide replay/simulation access and the precise differences between replay, trial, and production payloads.
6. Identify stable game, team, person, conference, venue, season, and competition IDs plus mapping/crosswalk products.
7. Detail schedules, broadcasts, venues, rosters, game rosters, depth charts, transfers, availability/injuries, standings, tiebreaks, rankings, and historical depth. Mark every unavailable field.
8. For transfers and availability, identify the chain of rights, source classes, verification procedure, corrections, and whether nonofficial media reporting is mixed into the feed.
9. Identify AP, Coaches, and CFP datasets separately. State sublicensing authority, attribution, embargo, retention, correction, kill, and deletion rules for each.
10. Name every authorized property: production domain, preview/admin subdomains, API, cache, email, newsletter, social accounts, OG/share images, mobile/PWA, widgets, partner embeds, and internal analytical systems.
11. Grant or deny each use explicitly: public display, ad-supported display, SEO indexing, internal search, normalized storage, caching, historical pages, cumulative tables, provider blending, export, syndication, and screenshots.
12. Grant or deny derived ratings, predictions, simulations, model evaluation, historical backtesting, feature storage, and AI/LLM use. Distinguish inference from training and clarify ownership/retention of model parameters and outputs.
13. State raw, normalized, published, log, backup, audit, and derived-data retention limits during the term and after termination. Define deletion certification and legal-hold handling.
14. Identify all required attribution and all rights not included, including team/conference/NCAA/CFP/bowl/broadcaster/sportsbook marks, colors, headshots, action photos, venue photos, and video.
15. Provide SLA, uptime calculation, planned maintenance, support severity/response targets, incident communication, data-correction targets, credits, liability, indemnity, audit, suspension, and termination terms.
16. Provide complete pricing: setup, base feeds, Push/realtime, history, polls, transfers, injuries, images, odds, support, overage, territory, renewal increase, minimum term, and pilot credits.

## Mandatory exhibits

- Sample order form and master terms
- Data dictionary/schema and deprecation policy
- Coverage matrix and 2026 calendar
- SLA/support policy
- Correction and replay documentation
- Rights/retention matrix
- Security and subprocessors summary
- Production pricing and overage schedule

## Disqualifiers

- Trial or community terms substituted for a commercial order form
- No explicit public-display and derived-model rights
- No correction/replay path
- Unclear transfer or poll chain of rights
- A requirement to expose provider secrets in a browser
- Unbounded deletion obligations that cannot coexist with legally required audit evidence
- Refusal to define coverage downgrades or latency measurement

## Pilot scorecard

Measure coverage, p50/p95/p99 latency, disconnects, catch-up completeness, duplicate/out-of-order events, schema drift, identity match rate, score/status conflicts, final/correction lag, roster coverage, poll reproduction, quota use, support response, and projected cost. Thresholds are registered before the pilot and based on the contracted product; the Gemini report's invented dollar and latency figures are not baselines.
