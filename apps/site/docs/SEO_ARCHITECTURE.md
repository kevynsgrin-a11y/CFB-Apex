# SEO architecture

The preview is globally `noindex, nofollow, noarchive`, returns `X-Robots-Tag`, disallows all robots, and emits no sitemap URLs. Production indexing is a separate activation state.

Stable evergreen routes serve scores, schedule, games, teams, players, conferences, portal, playoff, coaches, stadiums, methodology, and data sources. Query parameters hold UI state. Search, admin, favorites, mode, filter permutations, scenarios, fixture, thin, incomplete, redirected, and unavailable pages stay noindexed.

Future metadata helpers centralize brand, approved origin, title, description, canonical normalization, slug history, and index eligibility. JSON-LD must match visible content and omit invented price, rating, review, attendance, availability, or official status.
