# Data provider matrix

Technical completion never advances production readiness without approved rights.

Rights classes: `R0_FIXTURE`, `R1_PUBLIC_DOMAIN`, `R2_LINK_ONLY`, `R3_CITED_FACTS`, `R4_LICENSED_DISPLAY`, `R5_LICENSED_DERIVATIVE`, `R6_PARTNER`, `R7_RESTRICTED`.

| Dataset | Preferred production source | Cost / rights | Cadence | Fallback | Readiness |
|---|---|---|---|---|---|
| Scores, schedules, rosters, statistics | Enterprise feed with display/history/derived rights | Enterprise, R4/R5 | Contract-safe; live seconds | Licensed last-good marked stale | Blocked: contract |
| Portal/recruiting | Licensed feed plus direct public announcements | Enterprise/manual, R4/R3 | Hourly in windows | Verified public events only | Blocked: NCAA portal is restricted |
| Rules/rankings | Official season document plus licensed feed if needed | Open/manual, R3 | Event driven | Last verified version with expiry | Conditional |
| Injuries/availability | Official public report or licensed feed | Enterprise/manual | On publication | Unknown, never inferred | Blocked: source/counsel |
| Odds | Licensed commercial display/history feed | Paid, R4/R5 | Provider-safe, about 60s | Stale only if retention permits | Blocked: rights/jurisdiction |
| Weather | NWS for US venues or licensed SLA provider | Open/paid, R1 | 10–15m in game window | Last forecast marked stale | Conditional |
| Broadcast/radio | Licensed metadata and official destinations | Enterprise/manual, R2/R4 | Daily/link checks | Text unavailable state | Conditional |
| Tickets/merchandise/travel | Signed partner registry | Revenue share, R6 | Contract specific | Hide module | Blocked: agreement |
| Coach contracts | Executed public-record document/amendment | Manual, R3 | Event driven | Last terms with as-of date | Conditional: legal review |
| Stadium logistics | Venue/university/municipal/transit page | Manual, R3/R2 | 30d and pregame | Suppress expired advisories | Conditional |
| NIL estimates | Licensed methodology and rights | Enterprise, R5 | Provider specific | Omit | Blocked |
| Marks/photos/headshots | School/conference/CLC/photographer license | Enterprise, R4 | Per license | Text monogram/no image | Blocked |

Each future provider row must record quota, permitted public/SEO/social/export/model uses, caching/history, territory, attribution, contract version, stale threshold, hard expiry, secret location, owner, reviewer, kill switch, and next legal review.
