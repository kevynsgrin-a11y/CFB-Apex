# Release readiness

Current decision: `PRIVATE PREVIEW READY WITH CONDITIONS`.

The release candidate has a passing build, type check, lint gate, deterministic domain and API tests, fixture-backed critical journeys, responsive desktop/mobile evidence, SEO/security assertions, working controls, visible synthetic provenance, and a zero-high dependency audit. Private hosting is a release condition because the simulation endpoint is intentionally lightweight and not a public multi-tenant compute service.

External dependencies that may remain documented after code completion include licensed sports/odds/roster data, weather, maps, email, analytics, consent, authentication, ticketing, streaming, advertising, affiliate, licensed image/logo, legal-counsel, and partnership configuration.

Before any public launch: connect licensed providers behind the server adapter boundary, add distributed rate limiting and abuse monitoring, complete assistive-technology testing, run production load tests, tighten the CSP with nonces/hashes, validate model outputs against real historical data, and obtain legal/data-rights approval.

Final specialist re-reviews and the independent red-team gate found no remaining Critical or High issue for the private fixture preview. The Sites project access policy was verified as `custom` with one allowed owner and zero allowed groups before deployment.
