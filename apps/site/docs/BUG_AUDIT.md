# Bug audit

## Resolved during build

- Starter-only loading skeleton removed.
- Windows-incompatible inline environment scripts replaced.
- Cloudflare runtime type declarations added for strict local type checking.
- Node test module resolution made explicit.
- Dense layouts receive 900px, 620px, reduced-motion, and forced-color rules.
- Demo routes globally noindexed and security headers added at the Worker boundary.
- Forced playoff outcomes now validate participants, move both winner and loser, and round/cap iterations.
- Shared playoff scenarios hydrate from the URL and reproduce their forced outcomes.
- Inactive DFS players now receive zero projections.
- Fixture provenance now uses `synthetic`, never `official`, and dates have been normalized to coherent seasons.
- Model documentation now separates implemented deterministic fixture transforms from future trained/validated models.
- The mode disclosure uses a native dialog with Escape dismissal, focus containment, and focus restoration.
- Inert score-date controls are disabled and labeled as unavailable in the fixture snapshot.
- Conference detail pages now honor their route slug.
- Simulation requests validate actual body bytes, reject nonparticipant scenarios, and cap API work at 20,000 iterations.
- Framework and transitive dependencies were upgraded/remediated; `npm audit --audit-level=high` reports zero vulnerabilities.
- Visual verification now requires all 17 expected PNGs and their exact viewport dimensions.

## Open review queue

No Critical or High application finding remains open for the private preview. Production CSP should move from framework-compatible inline scripts to nonce/hash enforcement before third-party activation. Public launch also requires distributed rate limiting, production load tests, real provider contracts, manual screen-reader coverage, and model backtesting.

Final red-team decision: `GO` for authenticated owner-only Sites deployment. The approval does not extend to public, live-data, or commercial activation.
