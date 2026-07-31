# ADR 0005 — Provider abstraction

Every provider implements a typed server-side interface and health contract. Fixture and production namespaces are isolated. Unconfigured production returns an explicit unavailable state and never silently substitutes fixture data.
