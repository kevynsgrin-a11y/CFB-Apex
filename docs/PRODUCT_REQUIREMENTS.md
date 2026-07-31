# Product requirements

## Outcome

College Football Hub gives a fan one fast, conference-neutral place to complete five core jobs: read the slate, understand roster movement, test playoff paths, inspect coaching economics, and optionally review DFS distributions. Fixture, model, stale, reported, and verified states are never conflated.

## Scope

Core MVP order:

1. Scoreboard and schedule.
2. Transfer portal and roster volatility.
3. Season-aware seeded playoff simulator.
4. Coaching carousel, contracts, and buyouts.
5. Deliberately gated DFS analytics.

The preview envelope also includes game, team, player, conference, stadium, watch, methodology, source, correction, legal, newsletter, commercial, social, admin, SEO, accessibility, security, and operational surfaces.

External activation includes licensed live providers, paid services, production campaigns, real affiliate/ad programs, custom domains, and legal approval. It is not authorized by this build.

## Atomic requirements

| ID | Requirement | Acceptance |
|---|---|---|
| PRD-001 | Replaceable brand | Product name and core copy live in `lib/config.ts`. |
| PRD-002 | Clean Mode default | Odds/DFS content requires deliberate adult/coarse-jurisdiction disclosure and has one-action exit. |
| PRD-003 | Data trust | Data-heavy cards expose fixture/source/as-of/verification/model state. |
| PRD-004 | Scoreboard | Date/week navigation, P4/G5/FCS/top/favorite filters, scheduled/final/exception states. |
| PRD-005 | Game detail | Status, local context, authorized-action status, weather state, model uncertainty, metrics, logistics. |
| PRD-006 | Portal | Season/team/player/position/status context, impact, snaps, confidence, no paywall data. |
| PRD-007 | Playoff | Versioned rules, forced outcomes, deterministic seed, compute cap, precision state, share URL. |
| PRD-008 | Coaching | Contract terms, formula, offsets, timeline, source state, rumor/fact separation. |
| PRD-009 | DFS | Floor/median/ceiling, volume, availability, uncertainty, model version, responsible-gaming controls. |
| PRD-010 | Entity pages | Useful team/player/conference/stadium pages with connected modules. |
| PRD-011 | Corrections | Visible issue action and append-only correction policy. |
| PRD-012 | Resilience | Designed empty, unavailable, stale, delayed, postponed, and provider-down states. |
| PRD-013 | Analytics | Typed first-party events with no email, DOB, precise location, or betting selections. |
| PRD-014 | Quality | WCAG 2.2 AA target, responsive reflow, reduced motion, performance budget. |
| PRD-015 | SEO safety | Preview/demo/search/admin/thin content is noindexed and sitemap-excluded. |
| PRD-016 | Provider boundary | Typed server-side provider interface; no browser secrets. |
| PRD-017 | Commercial firewall | Commercial content is labeled and cannot influence model/editorial order. |
| PRD-018 | Season data | Membership, rules, and formats are versioned rather than permanent constants. |
| PRD-019 | Release boundary | Preview publication only; production activation remains approval-gated. |

## Non-goals

No unlicensed real-team marks, paywall scraping, stream retransmission, wagering, fake partner status, live campaign send, production DNS, or claims of real-world model accuracy.
