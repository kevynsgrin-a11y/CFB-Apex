# Release readiness

Current decision: `PUBLIC FIXTURE BETA READY WITH CONDITIONS`.

The release candidate has a passing build, type check, lint gate, deterministic domain and API tests, fixture-backed critical journeys, responsive desktop/mobile evidence, SEO/security assertions, working controls, visible synthetic provenance, and a zero-high dependency audit. Private hosting is a release condition because the simulation endpoint is intentionally lightweight and not a public multi-tenant compute service.

External dependencies that may remain documented after the fixture-beta deployment include licensed sports/odds/roster data, weather, maps, email, analytics, consent, authentication, ticketing, streaming, advertising, affiliate, licensed image/logo, legal-counsel, and partnership configuration.

Before any public launch: connect licensed providers behind the server adapter boundary, add distributed rate limiting and abuse monitoring, complete assistive-technology testing, run production load tests, tighten the CSP with nonces/hashes, validate model outputs against real historical data, and obtain legal/data-rights approval.

The July 31 external research report does not advance live-data readiness. `docs/RESEARCH_REPORT_AUDIT.md` records material corrections, and `/api/readiness` exposes deny-by-default evidence gates. The accepted next data state is a contract-permitted, nonpublic replay/shadow environment. An external streaming relay is not an assumed dependency; placement must be decided from the contracted feed pilot.

The existing specialist re-reviews and independent red-team gate found no remaining Critical or High issue for the fixture application. The public-domain release additionally requires a successful Wrangler dry run, immutable GitHub commit, Cloudflare deployment receipt, hostname smoke tests, and retained noindex/live-data kill switches.
