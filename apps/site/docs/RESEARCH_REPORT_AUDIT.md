# Research report audit

Audit date: 2026-07-31. Decision: `ACCEPT AS DISCOVERY INPUT; REJECT AS DEPLOYMENT SPECIFICATION WITHOUT CORRECTION`.

The supplied Gemini report is useful for provider leads, data-domain coverage, procurement questions, and the staged-launch concept. It also contains material factual errors, unsupported latency and pricing claims, secondary-source dependencies, and design choices presented as verified facts. Nothing in the report advances a rights, legal, model, or production gate by itself.

## Material corrections

| Report claim | Corrected finding | Deployment disposition | Primary evidence |
|---|---|---|---|
| The top four conference champions receive 2026 CFP byes. | The four highest-ranked schools receive byes. Automatic access and seeding are separate rules. | Encode by season from the official CFP rule artifact; reject the report's rule. | https://collegefootballplayoff.com/sports/2024/5/29/12-team-format.aspx |
| 2026 CFP quarterfinals include Orange/Sugar and semifinals include Fiesta/Peach. | Quarterfinals are Fiesta on Dec. 30 and Peach, Cotton, Rose on Jan. 1; semifinals are Orange Jan. 14 and Sugar Jan. 15. | Replace the proposed schedule; do not publish the report's bracket facts. | https://collegefootballplayoff.com/sports/2024/5/29/12-team-format.aspx |
| The 2026 FBS count is 134 and the listed independent memberships are current. | The count was not demonstrated from a season-specific NCAA export, and the narrative itself lists Army as independent after noting its AAC membership. The new Pac-12 officially has nine full members, but Gonzaga does not sponsor football. | Do not seed a permanent count or infer football membership. Build the 2026 crosswalk from the NCAA Directory plus conference-effective records. | https://www.ncaa.org/about-us/membership-directory/ and https://pac-12.com/news/2026/6/30/general-the-new-pac-12-conference-officially-launches-with-the-addition-of-seven-full-time-members.aspx |
| SportsDataIO live game state is about 1–3 seconds behind and supplies college depth charts. | Its current college-football guide says game state is about 30–60 seconds behind television, live stats about 15–20 seconds behind, and college depth charts/lineups are not provided. | Retain as a reconciliation candidate, not a sub-five-second automatic failover promise. | https://sportsdata.io/developers/workflow-guide/ncaa-football |
| Sportradar Push is guaranteed sub-second and sufficient by itself. | Sportradar publishes expected-latency classes of 2, 10, 25, and 50 seconds. Push is a Realtime add-on, is non-stateful, omits some game-status updates, and must be reconciled with REST. | Request an actual SLA and pilot results. Never market a latency not present in the order form. | https://developer.sportradar.com/football/reference/ncaafb-play-by-play and https://developer.sportradar.com/football/docs/ncaafb-ig-push |
| Cloudflare Workers necessarily time out on persistent streams, so an AWS/Fly relay is required. | Current Workers docs state that HTTP-triggered Workers have no hard duration limit while the client remains connected; network waiting does not consume CPU time. Runtime updates and connection lifecycle still require testing. | Prototype on Cloudflare first. Add an external relay only if the pilot, vendor networking, or measured recovery behavior requires it. | https://developers.cloudflare.com/workers/platform/limits/ |
| Sportradar frames can be verified with HMAC-SHA256. | The cited Push documentation describes TLS, redirect/chunked-transfer handling, and API-key authentication; it does not document signed Push frames. | Do not invent provider signature verification. If a relay is later used, authenticate the provider as documented and sign relay-to-Worker envelopes with a CFB Hub secret. | https://developer.sportradar.com/football/docs/ncaafb-ig-push |
| MD5 should be used for queue idempotency. | Queue duplication is expected under at-least-once delivery. Use the provider record/version plus a SHA-256 payload digest as idempotency material. | MD5 is rejected from the design. | https://developers.cloudflare.com/queues/reference/delivery-guarantees/ |
| A game becomes permanently immutable at +72 hours. | The issued view can be frozen, but official statistics and source corrections may arrive later. Corrections must supersede rather than overwrite history. | Keep immutable published versions and accept authorized corrections within contractual retention. | `docs/CORRECTIONS_POLICY.md` |
| AP/Coaches editions can publish automatically from any valid provider payload. | A technically valid payload is insufficient without named poll display rights and issuer-specific correction/retention rules. | Poll publication stays blocked until rights and edition-level source validation pass. | https://www.ap.org/content/topics/sports/ |
| Estimated vendor and Cloudflare Enterprise prices are verified budget inputs. | Core providers and Cloudflare Enterprise are quote-based. The report's dollar amounts are unsupported planning estimates. | Exclude all invented costs from approvals and forecasts; require written quotes. | Provider order forms and https://www.cloudflare.com/plans/enterprise/ |
| A fixed Brier threshold, 100,000 simulations, fixed home-field adjustment, and fixed garbage-time cutoffs are launch standards. | These are modeling hypotheses, not verified standards. | Select through leakage-safe backtests, calibration, convergence testing, and registered model versions. | `docs/MODEL_METHODOLOGY.md` |
| All odds views universally require a 21+ gate and complete suppression where wagering is illegal. | Betting, fantasy, advertising, age, disclosure, and jurisdiction rules vary by product and location. | Keep odds/DFS off. Require qualified counsel and partner terms before designing the production gate. | `docs/RESPONSIBLE_GAMING_CONTROLS.md` |

## Accepted conclusions

- Public live launch remains `NO-GO`.
- Nonpublic schema, replay, and shadow-pipeline work is permitted.
- Sportradar and SportsDataIO should receive the same RFP; neither is selected until rights, SLA, coverage, and pilot evidence are compared.
- AP rights should be obtained directly or named explicitly in the winning provider order form.
- NWS is the preferred U.S. weather source, subject to its User-Agent and rate guidance.
- Text/neutral monograms remain the marks fallback.
- Raw, normalized, candidate, published, and corrected states remain separate.
- LLM output may describe only a validated, versioned fact bundle and never establish a fact.

## Quarantined claims

Until separately verified, do not ingest or publish the report's national team count, full conference membership table, AP/Coaches release dates, kickoff/network times, conference availability statuses, vendor prices, Genius coverage percentage, latency guarantees, logo rights, or model-performance targets.
